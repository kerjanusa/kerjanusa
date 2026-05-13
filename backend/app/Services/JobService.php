<?php

namespace App\Services;

use App\Models\Job;
use App\Models\Application;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Validation\ValidationException;

class JobService
{
    public function __construct(private RecruiterPlanService $recruiterPlanService)
    {
    }

    /**
     * Keep the public active/inactive status in sync with the richer recruiter workflow status.
     */
    public function mapWorkflowToStatus(string $workflowStatus): string
    {
        return $workflowStatus === Job::WORKFLOW_ACTIVE
            ? Job::STATUS_ACTIVE
            : Job::STATUS_INACTIVE;
    }

    /**
     * Derive a sensible workflow label when only the old status is available.
     */
    public function mapStatusToWorkflow(string $status): string
    {
        return $status === Job::STATUS_ACTIVE
            ? Job::WORKFLOW_ACTIVE
            : Job::WORKFLOW_DRAFT;
    }

    /**
     * Mengambil daftar lowongan aktif lalu menerapkan seluruh filter pencarian dari frontend.
     */
    public function getAllJobs(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = Job::with('recruiter')
            ->where('status', Job::STATUS_ACTIVE);

        return $this->applyFilters($query, $filters)
            ->latest()
            ->paginate($perPage);
    }

    /**
     * Mengambil detail lowongan lengkap beserta recruiter dan lamaran yang terkait.
     */
    public function getJobById(int $jobId): ?Job
    {
        return Job::with('recruiter')->find($jobId);
    }

    /**
     * Membuat lowongan baru dan memastikan recruiter pemilik serta status awalnya konsisten.
     */
    public function createJob(int $recruiterId, array $data): Job
    {
        $recruiter = User::findOrFail($recruiterId);
        $data['recruiter_id'] = $recruiterId;
        $data['workflow_status'] = $data['workflow_status'] ?? $this->mapStatusToWorkflow(
            $data['status'] ?? Job::STATUS_ACTIVE
        );
        $data['status'] = $data['status'] ?? Job::STATUS_ACTIVE;

        if (array_key_exists('workflow_status', $data)) {
            $data['status'] = $this->mapWorkflowToStatus($data['workflow_status']);
        }

        $data['quiz_screening_questions'] = $this->sanitizeScreeningQuestions(
            $data['quiz_screening_questions'] ?? []
        );

        if (($data['workflow_status'] ?? Job::WORKFLOW_ACTIVE) === Job::WORKFLOW_ACTIVE) {
            $currentActiveJobs = Job::query()
                ->where('recruiter_id', $recruiterId)
                ->where('workflow_status', Job::WORKFLOW_ACTIVE)
                ->count();

            if (!$this->recruiterPlanService->canPublishAdditionalJob($recruiter, $currentActiveJobs)) {
                $plan = $this->recruiterPlanService->getRecruiterPlanContext($recruiter);

                throw ValidationException::withMessages([
                    'workflow_status' => [
                        sprintf(
                            'Paket %s hanya mengizinkan %d lowongan aktif. Upgrade paket atau nonaktifkan lowongan lama.',
                            $plan['label'],
                            $plan['job_limit']
                        ),
                    ],
                ]);
            }
        }

        return Job::create($data);
    }

    /**
     * Mengubah data lowongan jika record ditemukan.
     */
    public function updateJob(int $jobId, array $data): bool
    {
        $job = Job::find($jobId);

        if (!$job) {
            return false;
        }

        if (array_key_exists('workflow_status', $data)) {
            $data['status'] = $this->mapWorkflowToStatus($data['workflow_status']);
        } elseif (array_key_exists('status', $data)) {
            $data['workflow_status'] = $this->mapStatusToWorkflow($data['status']);
        }

        if (array_key_exists('quiz_screening_questions', $data)) {
            $data['quiz_screening_questions'] = $this->sanitizeScreeningQuestions(
                $data['quiz_screening_questions'] ?? []
            );
        }

        $nextWorkflowStatus = $data['workflow_status'] ?? $job->workflow_status;

        if ($nextWorkflowStatus === Job::WORKFLOW_ACTIVE && $job->workflow_status !== Job::WORKFLOW_ACTIVE) {
            $recruiter = User::find($job->recruiter_id);

            if ($recruiter) {
                $currentActiveJobs = Job::query()
                    ->where('recruiter_id', $job->recruiter_id)
                    ->where('workflow_status', Job::WORKFLOW_ACTIVE)
                    ->count();

                if (!$this->recruiterPlanService->canPublishAdditionalJob($recruiter, $currentActiveJobs)) {
                    $plan = $this->recruiterPlanService->getRecruiterPlanContext($recruiter);

                    throw ValidationException::withMessages([
                        'workflow_status' => [
                            sprintf(
                                'Paket %s hanya mengizinkan %d lowongan aktif. Upgrade paket atau nonaktifkan lowongan lama.',
                                $plan['label'],
                                $plan['job_limit']
                            ),
                        ],
                    ]);
                }
            }
        }

        return $job->update($data);
    }

    /**
     * Reassign a job to another recruiter while preserving its current workflow.
     */
    public function reassignJob(int $jobId, int $recruiterId): bool
    {
        $job = Job::find($jobId);

        if (!$job) {
            return false;
        }

        return $job->update([
            'recruiter_id' => $recruiterId,
        ]);
    }

    /**
     * Menghapus lowongan jika record masih ada.
     */
    public function deleteJob(int $jobId): bool
    {
        $job = Job::find($jobId);

        if (!$job) {
            return false;
        }

        return $job->delete();
    }

    /**
     * Mengambil daftar lowongan milik recruiter tertentu untuk dashboard internal.
     */
    public function getRecruiterJobs(int $recruiterId, int $perPage = 15): LengthAwarePaginator
    {
        return Job::where('recruiter_id', $recruiterId)
            ->latest()
            ->paginate($perPage);
    }

    /**
     * Mengambil daftar lokasi unik dari lowongan aktif agar dropdown frontend selalu sinkron.
     */
    public function getAvailableLocations(): array
    {
        return Job::query()
            ->where('status', Job::STATUS_ACTIVE)
            ->whereNotNull('location')
            ->select('location')
            ->distinct()
            ->orderBy('location')
            ->pluck('location')
            ->values()
            ->all();
    }

    /**
     * Menghitung ringkasan jumlah lamaran per status untuk satu lowongan.
     */
    public function getJobStatistics(int $jobId): array
    {
        $job = Job::find($jobId);

        if (!$job) {
            return [];
        }

        return [
            'total_applications' => $job->applications()->count(),
            'pending_applications' => $this->countApplicationsByStatus($job, Application::STATUS_PENDING),
            'accepted_applications' => $this->countApplicationsByStatus($job, Application::STATUS_ACCEPTED),
            'rejected_applications' => $this->countApplicationsByStatus($job, Application::STATUS_REJECTED),
        ];
    }

    /**
     * Menerapkan filter kategori, lokasi, tipe kerja, level, dan kata kunci ke query lowongan.
     */
    private function applyFilters(Builder $query, array $filters): Builder
    {
        if (!empty($filters['category'])) {
            $query->where('category', $filters['category']);
        }

        if (!empty($filters['location'])) {
            $query->where('location', 'like', '%' . $filters['location'] . '%');
        }

        if (!empty($filters['job_type'])) {
            $query->where('job_type', $filters['job_type']);
        }

        if (!empty($filters['experience_level'])) {
            $query->where('experience_level', $filters['experience_level']);
        }

        if (!empty($filters['search'])) {
            $this->applySearchFilter($query, $filters['search']);
        }

        return $query;
    }

    /**
     * Memperluas pencarian kata kunci ke judul dan deskripsi lowongan sekaligus.
     */
    private function applySearchFilter(Builder $query, string $search): void
    {
        $query->where(function (Builder $builder) use ($search) {
            $builder->where('title', 'like', '%' . $search . '%')
                ->orWhere('description', 'like', '%' . $search . '%');
        });
    }

    /**
     * Menghitung jumlah lamaran untuk satu status tertentu agar statistik tidak duplikatif.
     */
    private function countApplicationsByStatus(Job $job, string $status): int
    {
        return $job->applications()->where('status', $status)->count();
    }

    private function sanitizeScreeningQuestions(array $questions): array
    {
        return collect($questions)
            ->filter(fn ($question) => is_array($question) && filled($question['question'] ?? null))
            ->map(function (array $question, int $index) {
                return [
                    'id' => filled($question['id'] ?? null)
                        ? (string) $question['id']
                        : sprintf('question-%d', $index + 1),
                    'type' => $question['type'] ?? 'text',
                    'title' => trim((string) ($question['title'] ?? $question['question'] ?? 'Pertanyaan screening')),
                    'question' => trim((string) ($question['question'] ?? '')),
                    'answers' => collect($question['answers'] ?? [])
                        ->map(fn ($answer) => trim((string) $answer))
                        ->filter()
                        ->values()
                        ->all(),
                    'required' => (bool) ($question['required'] ?? true),
                ];
            })
            ->values()
            ->all();
    }
}
