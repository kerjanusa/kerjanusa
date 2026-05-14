<?php

namespace App\Services;

use App\Models\Application;
use App\Models\Job;
use App\Models\Message;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Throwable;

class MessageService
{
    private function ensureMessagesTableExists(): void
    {
        static $schemaReady = false;

        if ($schemaReady) {
            return;
        }

        if (Schema::hasTable('messages')) {
            $schemaReady = true;
            return;
        }

        try {
            Schema::create('messages', function (Blueprint $table) {
                $table->id();
                $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('recipient_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('job_id')->nullable()->constrained('jobs')->nullOnDelete();
                $table->text('body');
                $table->timestamp('read_at')->nullable();
                $table->timestamps();

                $table->index(['sender_id', 'recipient_id']);
                $table->index(['recipient_id', 'read_at']);
                $table->index(['job_id', 'created_at']);
            });
        } catch (Throwable $exception) {
            if (!Schema::hasTable('messages')) {
                throw ValidationException::withMessages([
                    'chat' => [
                        'Layanan chat belum aktif karena storage pesan belum siap. Sinkronkan migrasi production untuk tabel messages.',
                    ],
                ]);
            }
        }

        $schemaReady = true;
    }

    public function listThreads(User $user): array
    {
        $this->ensureMessagesTableExists();

        $messages = Message::query()
            ->with(['sender', 'recipient', 'job'])
            ->where(function (Builder $query) use ($user) {
                $query->where('sender_id', $user->id)
                    ->orWhere('recipient_id', $user->id);
            })
            ->orderByDesc('created_at')
            ->get();

        return $messages
            ->groupBy(function (Message $message) use ($user) {
                return $message->sender_id === $user->id
                    ? (string) $message->recipient_id
                    : (string) $message->sender_id;
            })
            ->map(function (Collection $threadMessages, string $counterpartId) use ($user) {
                /** @var Message $latestMessage */
                $latestMessage = $threadMessages->first();
                $counterpart = $latestMessage->sender_id === $user->id
                    ? $latestMessage->recipient
                    : $latestMessage->sender;

                return [
                    'contact' => $this->presentUser($counterpart),
                    'job' => $latestMessage->job ? [
                        'id' => $latestMessage->job->id,
                        'title' => $latestMessage->job->title,
                    ] : null,
                    'last_message' => $latestMessage->body,
                    'updated_at' => optional($latestMessage->created_at)->toIso8601String(),
                    'unread_count' => $threadMessages
                        ->where('recipient_id', $user->id)
                        ->whereNull('read_at')
                        ->count(),
                    'message_count' => $threadMessages->count(),
                ];
            })
            ->sortByDesc('updated_at')
            ->values()
            ->all();
    }

    public function getConversation(User $user, User $counterpart): array
    {
        $this->ensureMessagesTableExists();
        $this->assertCanCommunicate($user, $counterpart);

        Message::query()
            ->where('sender_id', $counterpart->id)
            ->where('recipient_id', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return Message::query()
            ->with(['sender', 'recipient', 'job'])
            ->where(function (Builder $query) use ($user, $counterpart) {
                $query->where(function (Builder $nestedQuery) use ($user, $counterpart) {
                    $nestedQuery->where('sender_id', $user->id)
                        ->where('recipient_id', $counterpart->id);
                })->orWhere(function (Builder $nestedQuery) use ($user, $counterpart) {
                    $nestedQuery->where('sender_id', $counterpart->id)
                        ->where('recipient_id', $user->id);
                });
            })
            ->orderBy('created_at')
            ->get()
            ->map(fn (Message $message) => $this->presentMessage($message, $user))
            ->values()
            ->all();
    }

    public function getAvailableContacts(User $user, ?string $search = null): array
    {
        $normalizedSearch = strtolower(trim((string) $search));
        $contactQuery = User::query()
            ->where('account_status', User::STATUS_ACTIVE)
            ->where('id', '!=', $user->id);

        if ($user->hasRole(User::ROLE_SUPERADMIN)) {
            $contactQuery->whereIn('role', [User::ROLE_RECRUITER, User::ROLE_CANDIDATE]);
        } elseif ($user->hasRole(User::ROLE_RECRUITER)) {
            $candidateIds = Application::query()
                ->whereHas('job', fn (Builder $query) => $query->where('recruiter_id', $user->id))
                ->distinct()
                ->pluck('candidate_id')
                ->all();
            $contactQuery->where(function (Builder $query) use ($candidateIds) {
                $query->where('role', User::ROLE_SUPERADMIN);

                if (!empty($candidateIds)) {
                    $query->orWhereIn('id', $candidateIds);
                }
            });
        } else {
            $recruiterIds = Job::query()
                ->whereIn('id', Application::query()
                    ->where('candidate_id', $user->id)
                    ->pluck('job_id')
                    ->all()
                )
                ->distinct()
                ->pluck('recruiter_id')
                ->all();
            $contactQuery->where(function (Builder $query) use ($recruiterIds) {
                $query->where('role', User::ROLE_SUPERADMIN);

                if (!empty($recruiterIds)) {
                    $query->orWhereIn('id', $recruiterIds);
                }
            });
        }

        return $contactQuery
            ->orderBy('role')
            ->orderBy('company_name')
            ->orderBy('name')
            ->get()
            ->filter(function (User $contact) use ($normalizedSearch) {
                if ($normalizedSearch === '') {
                    return true;
                }

                $haystack = strtolower(implode(' ', array_filter([
                    $contact->name,
                    $contact->company_name,
                    $contact->email,
                ])));

                return str_contains($haystack, $normalizedSearch);
            })
            ->map(fn (User $contact) => $this->presentUser($contact))
            ->values()
            ->all();
    }

    public function sendMessage(User $sender, array $payload): Message
    {
        $this->ensureMessagesTableExists();

        $recipient = User::findOrFail($payload['recipient_id']);
        $this->assertCanCommunicate($sender, $recipient);

        $messageBody = trim((string) $payload['body']);

        if ($messageBody === '') {
            throw ValidationException::withMessages([
                'body' => ['Pesan tidak boleh kosong.'],
            ]);
        }

        $job = null;

        if (!empty($payload['job_id'])) {
            $job = Job::find($payload['job_id']);

            if (!$job) {
                throw ValidationException::withMessages([
                    'job_id' => ['Lowongan percakapan tidak ditemukan.'],
                ]);
            }

            if (!$this->canReferenceJob($sender, $recipient, $job)) {
                throw ValidationException::withMessages([
                    'job_id' => ['Anda tidak bisa memakai lowongan ini sebagai konteks percakapan.'],
                ]);
            }
        }

        return Message::create([
            'sender_id' => $sender->id,
            'recipient_id' => $recipient->id,
            'job_id' => $job?->id,
            'body' => $messageBody,
        ])->load(['sender', 'recipient', 'job']);
    }

    public function presentMessage(Message $message, User $viewer): array
    {
        return [
            'id' => $message->id,
            'body' => $message->body,
            'created_at' => optional($message->created_at)->toIso8601String(),
            'read_at' => optional($message->read_at)->toIso8601String(),
            'is_mine' => $message->sender_id === $viewer->id,
            'sender' => $this->presentUser($message->sender),
            'recipient' => $this->presentUser($message->recipient),
            'job' => $message->job ? [
                'id' => $message->job->id,
                'title' => $message->job->title,
            ] : null,
        ];
    }

    public function assertCanCommunicate(User $sender, User $recipient): void
    {
        if ($sender->id === $recipient->id) {
            throw ValidationException::withMessages([
                'recipient_id' => ['Tidak bisa mengirim pesan ke akun sendiri.'],
            ]);
        }

        if (!$this->canCommunicate($sender, $recipient)) {
            throw ValidationException::withMessages([
                'recipient_id' => ['Anda belum memiliki akses percakapan dengan pengguna ini.'],
            ]);
        }
    }

    private function canCommunicate(User $sender, User $recipient): bool
    {
        if ($sender->hasRole(User::ROLE_SUPERADMIN) || $recipient->hasRole(User::ROLE_SUPERADMIN)) {
            return true;
        }

        if ($sender->hasRole(User::ROLE_RECRUITER) && $recipient->hasRole(User::ROLE_CANDIDATE)) {
            return Application::query()
                ->where('candidate_id', $recipient->id)
                ->whereHas('job', fn (Builder $query) => $query->where('recruiter_id', $sender->id))
                ->exists();
        }

        if ($sender->hasRole(User::ROLE_CANDIDATE) && $recipient->hasRole(User::ROLE_RECRUITER)) {
            return Application::query()
                ->where('candidate_id', $sender->id)
                ->whereHas('job', fn (Builder $query) => $query->where('recruiter_id', $recipient->id))
                ->exists();
        }

        return false;
    }

    private function canReferenceJob(User $sender, User $recipient, Job $job): bool
    {
        if ($sender->hasRole(User::ROLE_SUPERADMIN) || $recipient->hasRole(User::ROLE_SUPERADMIN)) {
            return true;
        }

        if ($sender->hasRole(User::ROLE_RECRUITER)) {
            return $job->recruiter_id === $sender->id
                && Application::query()
                    ->where('job_id', $job->id)
                    ->where('candidate_id', $recipient->id)
                    ->exists();
        }

        if ($sender->hasRole(User::ROLE_CANDIDATE)) {
            return $job->recruiter_id === $recipient->id
                && Application::query()
                    ->where('job_id', $job->id)
                    ->where('candidate_id', $sender->id)
                    ->exists();
        }

        return false;
    }

    private function presentUser(?User $user): ?array
    {
        if (!$user) {
            return null;
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'role' => $user->role,
            'email' => $user->email,
            'company_name' => $user->company_name,
        ];
    }
}
