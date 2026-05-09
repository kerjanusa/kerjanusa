<?php

namespace App\Services;

use App\Models\Application;
use App\Models\Job;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ApplicationService
{
    /**
     * Apply for a job
     */
    public function applyForJob(int $jobId, int $candidateId, array $data): Application|false
    {
        // Check if job exists
        $job = Job::find($jobId);
        if (!$job || $job->status !== 'active') {
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
            'status' => 'pending',
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

        return $application->update(['status' => $status]);
    }

    /**
     * Get application by ID
     */
    public function getApplicationById(int $applicationId): ?Application
    {
        return Application::with(['job.recruiter', 'candidate'])->find($applicationId);
    }
}
