<?php

namespace App\Services;

use App\Models\Application;
use App\Models\Job;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ApplicationService
{
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
        // Check if job exists
        $job = Job::find($jobId);
        if (!$job || $job->status !== Job::STATUS_ACTIVE) {
            return false;
        }

        // Check if already applied
        $existingApplication = Application::where('job_id', $jobId)
            ->where('candidate_id', $candidateId)
            ->exists();

        if ($existingApplication) {
            return false;
        }

        return Application::create([
            'job_id' => $jobId,
            'candidate_id' => $candidateId,
            'cover_letter' => $data['cover_letter'] ?? null,
            'status' => Application::STATUS_PENDING,
            'stage' => Application::STAGE_APPLIED,
            'applied_at' => now(),
        ]);
    }

    /**
     * Get candidate's applications
     */
    public function getCandidateApplications(int $candidateId, int $perPage = 15): LengthAwarePaginator
    {
        return Application::with(['job.recruiter'])
            ->where('candidate_id', $candidateId)
            ->orderByDesc('applied_at')
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }

    /**
     * Get job applications
     */
    public function getJobApplications(int $jobId, int $perPage = 15): LengthAwarePaginator
    {
        return Application::with('candidate')
            ->where('job_id', $jobId)
            ->latest()
            ->paginate($perPage);
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
}
