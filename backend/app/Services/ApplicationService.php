<?php

namespace App\Services;

use App\Models\Application;
use App\Models\Job;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Arr;
use Illuminate\Validation\ValidationException;

class ApplicationService
{
    public function __construct(private RecruiterPlanService $recruiterPlanService)
    {
    }

    /**
     * Convert a recruiter-facing stage into the portable backend status.
     */
    public function mapStageToStatus(string $stage): string
    {
        return match ($stage) {
            Application::STAGE_REJECTED => Application::STATUS_REJECTED,
            Application::STAGE_WITHDRAWN => Application::STATUS_WITHDRAWN,
            Application::STAGE_SHORTLISTED,
            Application::STAGE_INTERVIEW,
            Application::STAGE_OFFERING,
            Application::STAGE_HIRED => Application::STATUS_ACCEPTED,
            Application::STAGE_APPLIED,
            Application::STAGE_SCREENING => Application::STATUS_PENDING,
            default => Application::STATUS_PENDING,
        };
    }

    /**
     * Convert a legacy backend status into the richer stage used by the UI.
     */
    public function mapStatusToStage(string $status): string
    {
        return match ($status) {
            Application::STATUS_ACCEPTED => Application::STAGE_SHORTLISTED,
            Application::STATUS_REJECTED => Application::STAGE_REJECTED,
            Application::STATUS_WITHDRAWN => Application::STAGE_WITHDRAWN,
            default => Application::STAGE_APPLIED,
        };
    }

    /**
     * Apply for a job
     */
    public function applyForJob(int $jobId, int $candidateId, array $data): Application|false
    {
        $job = Job::find($jobId);
        if (!$job || $job->status !== Job::STATUS_ACTIVE) {
            return false;
        }

        $existingApplication = Application::where('job_id', $jobId)
            ->where('candidate_id', $candidateId)
            ->exists();

        if ($existingApplication) {
            return false;
        }

        $screeningAnswers = $this->sanitizeScreeningAnswers($data['screening_answers'] ?? []);
        $this->validateScreeningSubmission($job, $screeningAnswers, $data['video_intro_url'] ?? null);

        return Application::create([
            'job_id' => $jobId,
            'candidate_id' => $candidateId,
            'cover_letter' => $data['cover_letter'] ?? null,
            'screening_answers' => $screeningAnswers,
            'video_intro_url' => $data['video_intro_url'] ?? null,
            'status' => Application::STATUS_PENDING,
            'stage' => Application::STAGE_APPLIED,
            'applied_at' => now(),
        ]);
    }

    /**
     * Get candidate's applications
     */
    public function getCandidateApplications(
        int $candidateId,
        int $perPage = 15,
        ?User $viewer = null
    ): LengthAwarePaginator
    {
        $applications = Application::with(['job.recruiter'])
            ->where('candidate_id', $candidateId)
            ->orderByDesc('applied_at')
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return $this->transformApplicationPaginator($applications, $viewer);
    }

    /**
     * Get job applications
     */
    public function getJobApplications(
        int $jobId,
        int $perPage = 15,
        ?User $viewer = null
    ): LengthAwarePaginator
    {
        $applications = Application::with(['candidate', 'job.recruiter'])
            ->where('job_id', $jobId)
            ->latest()
            ->paginate($perPage);

        return $this->transformApplicationPaginator($applications, $viewer);
    }

    /**
     * Update application status
     */
    public function updateApplicationStatus(int $applicationId, string $status): bool
    {
        $application = Application::find($applicationId);

        if (!$application) {
            return false;
        }

        return $application->update([
            'status' => $status,
            'stage' => $this->mapStatusToStage($status),
        ]);
    }

    /**
     * Persist the recruiter-facing stage and keep the legacy status in sync.
     */
    public function updateApplicationStage(int $applicationId, string $stage): bool
    {
        $application = Application::find($applicationId);

        if (!$application) {
            return false;
        }

        return $application->update([
            'stage' => $stage,
            'status' => $this->mapStageToStatus($stage),
        ]);
    }

    /**
     * Allow the owning candidate to withdraw an active application.
     */
    public function withdrawCandidateApplication(int $applicationId, int $candidateId): bool
    {
        $application = Application::where('id', $applicationId)
            ->where('candidate_id', $candidateId)
            ->first();

        if (!$application) {
            return false;
        }

        if (in_array($application->stage, [
            Application::STAGE_HIRED,
            Application::STAGE_REJECTED,
            Application::STAGE_WITHDRAWN,
        ], true)) {
            return false;
        }

        return $application->update([
            'stage' => Application::STAGE_WITHDRAWN,
            'status' => Application::STATUS_WITHDRAWN,
        ]);
    }

    /**
     * Get application by ID
     */
    public function getApplicationById(int $applicationId): ?Application
    {
        return Application::with(['job.recruiter', 'candidate'])->find($applicationId);
    }

    public function presentApplication(Application $application, ?User $viewer = null): array
    {
        $job = $application->job;
        $candidate = $application->candidate;
        $screeningAnswers = collect($application->screening_answers ?? [])
            ->map(function ($answer) {
                return [
                    'question_id' => $answer['question_id'] ?? null,
                    'question' => trim((string) ($answer['question'] ?? '')),
                    'answer' => trim((string) ($answer['answer'] ?? '')),
                ];
            })
            ->filter(fn ($answer) => filled($answer['question']) && filled($answer['answer']))
            ->values()
            ->all();

        $screeningSummary = $this->buildScreeningSummary($job, $screeningAnswers);

        return [
            'id' => $application->id,
            'job_id' => $application->job_id,
            'candidate_id' => $application->candidate_id,
            'status' => $application->status,
            'stage' => $application->stage,
            'cover_letter' => $application->cover_letter,
            'screening_answers' => $screeningAnswers,
            'screening_summary' => $screeningSummary,
            'video_intro_url' => $application->video_intro_url,
            'applied_at' => optional($application->applied_at)->toIso8601String(),
            'created_at' => optional($application->created_at)->toIso8601String(),
            'job' => $job ? [
                'id' => $job->id,
                'title' => $job->title,
                'category' => $job->category,
                'location' => $job->location,
                'experience_level' => $job->experience_level,
                'video_screening_requirement' => $job->video_screening_requirement,
                'quiz_screening_questions' => $job->quiz_screening_questions ?? [],
                'recruiter' => $job->recruiter ? [
                    'id' => $job->recruiter->id,
                    'name' => $job->recruiter->name,
                    'role' => $job->recruiter->role,
                    'email' => $job->recruiter->email,
                    'company_name' => $job->recruiter->company_name,
                ] : null,
            ] : null,
            'candidate' => $candidate ? $this->presentCandidateForViewer($candidate, $viewer) : null,
        ];
    }

    private function transformApplicationPaginator(
        LengthAwarePaginator $applications,
        ?User $viewer = null
    ): LengthAwarePaginator
    {
        $applications->setCollection(
            $applications->getCollection()->map(
                fn (Application $application) => $this->presentApplication($application, $viewer)
            )
        );

        return $applications;
    }

    private function validateScreeningSubmission(
        Job $job,
        array $screeningAnswers,
        ?string $videoIntroUrl
    ): void
    {
        $questions = collect($job->quiz_screening_questions ?? []);
        $requiredQuestions = $questions->filter(
            fn ($question) => (bool) ($question['required'] ?? true)
        );
        $answersByQuestionId = collect($screeningAnswers)->keyBy(
            fn ($answer) => (string) ($answer['question_id'] ?? '')
        );

        $missingQuestions = $requiredQuestions
            ->filter(function ($question) use ($answersByQuestionId) {
                $questionId = (string) ($question['id'] ?? '');
                $submittedAnswer = $answersByQuestionId->get($questionId);

                return !filled($submittedAnswer['answer'] ?? null);
            })
            ->map(fn ($question) => $question['title'] ?? $question['question'] ?? 'Pertanyaan screening')
            ->values()
            ->all();

        if (!empty($missingQuestions)) {
            throw ValidationException::withMessages([
                'screening_answers' => [
                    'Jawaban screening wajib diisi untuk: ' . implode(', ', $missingQuestions) . '.',
                ],
            ]);
        }

        if ($job->video_screening_requirement === Job::VIDEO_SCREENING_REQUIRED && !filled($videoIntroUrl)) {
            throw ValidationException::withMessages([
                'video_intro_url' => [
                    'Link video screening wajib diisi untuk lowongan ini.',
                ],
            ]);
        }
    }

    private function sanitizeScreeningAnswers(array $answers): array
    {
        return collect($answers)
            ->filter(fn ($answer) => is_array($answer) && filled($answer['question'] ?? null))
            ->map(function (array $answer) {
                return [
                    'question_id' => filled($answer['question_id'] ?? null)
                        ? (string) $answer['question_id']
                        : null,
                    'question' => trim((string) ($answer['question'] ?? '')),
                    'answer' => trim((string) ($answer['answer'] ?? '')),
                ];
            })
            ->filter(fn ($answer) => filled($answer['question']) && filled($answer['answer']))
            ->values()
            ->all();
    }

    private function buildScreeningSummary(?Job $job, array $screeningAnswers): array
    {
        $questions = collect($job?->quiz_screening_questions ?? []);
        $totalQuestions = $questions->count();
        $answeredQuestions = count($screeningAnswers);
        $positiveAnswers = collect($screeningAnswers)
            ->filter(fn ($answer) => strtolower(trim((string) ($answer['answer'] ?? ''))) === 'ya')
            ->count();
        $completionRate = $totalQuestions > 0
            ? (int) round(($answeredQuestions / $totalQuestions) * 100)
            : 0;

        return [
            'total_questions' => $totalQuestions,
            'answered_questions' => $answeredQuestions,
            'positive_answers' => $positiveAnswers,
            'completion_rate' => $completionRate,
        ];
    }

    private function presentCandidateForViewer(User $candidate, ?User $viewer = null): array
    {
        $profile = is_array($candidate->candidate_profile) ? $candidate->candidate_profile : [];
        $documentAccess = [
            'resume_files_visible' => count(Arr::get($profile, 'resumeFiles', [])),
            'resume_files_total' => count(Arr::get($profile, 'resumeFiles', [])),
            'certificate_files_visible' => count(Arr::get($profile, 'certificateFiles', [])),
            'certificate_files_total' => count(Arr::get($profile, 'certificateFiles', [])),
            'upgrade_required' => false,
            'notice' => null,
        ];

        if ($viewer?->hasRole(User::ROLE_RECRUITER)) {
            $limits = $this->recruiterPlanService->getVisibleDocumentLimits($viewer);
            $totalResumeFiles = count(Arr::get($profile, 'resumeFiles', []));
            $totalCertificateFiles = count(Arr::get($profile, 'certificateFiles', []));
            $visibleResumeFiles = array_slice(Arr::get($profile, 'resumeFiles', []), 0, $limits['resume_files']);
            $visibleCertificateFiles = array_slice(
                Arr::get($profile, 'certificateFiles', []),
                0,
                $limits['certificate_files']
            );

            $profile['resumeFiles'] = $visibleResumeFiles;
            $profile['certificateFiles'] = $visibleCertificateFiles;
            $documentAccess = [
                'resume_files_visible' => count($visibleResumeFiles),
                'resume_files_total' => $totalResumeFiles,
                'certificate_files_visible' => count($visibleCertificateFiles),
                'certificate_files_total' => $totalCertificateFiles,
                'upgrade_required' => count($visibleResumeFiles) < $totalResumeFiles
                    || count($visibleCertificateFiles) < $totalCertificateFiles,
                'notice' => count($visibleResumeFiles) < $totalResumeFiles
                    || count($visibleCertificateFiles) < $totalCertificateFiles
                    ? 'Sebagian berkas kandidat disembunyikan sesuai paket recruiter aktif.'
                    : null,
            ];
        }

        return [
            'id' => $candidate->id,
            'name' => $candidate->name,
            'role' => $candidate->role,
            'email' => $candidate->email,
            'phone' => $candidate->phone,
            'candidate_profile' => $profile,
            'document_access' => $documentAccess,
        ];
    }
}
