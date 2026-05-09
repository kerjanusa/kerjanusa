<?php

namespace App\Services;

use App\Models\Application;
use App\Models\Job;
use App\Models\User;

class AdminService
{
    /**
     * Build the live superadmin dashboard payload from current users, jobs, and applications.
     */
    public function getDashboardData(): array
    {
        $totals = [
            'candidates' => User::where('role', User::ROLE_CANDIDATE)->count(),
            'recruiters' => User::where('role', User::ROLE_RECRUITER)->count(),
            'superadmins' => User::where('role', User::ROLE_SUPERADMIN)->count(),
            'total_jobs' => Job::count(),
            'active_jobs' => Job::where('status', Job::STATUS_ACTIVE)->count(),
            'inactive_jobs' => Job::where('status', Job::STATUS_INACTIVE)->count(),
            'total_applications' => Application::count(),
            'pending_applications' => Application::where('status', Application::STATUS_PENDING)->count(),
            'accepted_applications' => Application::where('status', Application::STATUS_ACCEPTED)->count(),
            'rejected_applications' => Application::where('status', Application::STATUS_REJECTED)->count(),
            'withdrawn_applications' => Application::where('status', Application::STATUS_WITHDRAWN)->count(),
        ];

        $growth = [
            'new_candidates_last_7_days' => User::where('role', User::ROLE_CANDIDATE)
                ->where('created_at', '>=', now()->subDays(7))
                ->count(),
            'new_recruiters_last_7_days' => User::where('role', User::ROLE_RECRUITER)
                ->where('created_at', '>=', now()->subDays(7))
                ->count(),
            'new_jobs_last_7_days' => Job::where('created_at', '>=', now()->subDays(7))->count(),
            'new_applications_last_7_days' => Application::where('created_at', '>=', now()->subDays(7))->count(),
        ];

        $candidateTable = User::query()
            ->where('role', User::ROLE_CANDIDATE)
            ->withCount('applications')
            ->latest()
            ->limit(6)
            ->get()
            ->map(function (User $candidate) {
                $latestApplication = $candidate->applications()
                    ->with('job:id,title')
                    ->orderByDesc('applied_at')
                    ->orderByDesc('created_at')
                    ->first();

                return [
                    'id' => $candidate->id,
                    'name' => $candidate->name,
                    'email' => $candidate->email,
                    'phone' => $candidate->phone,
                    'applications_count' => $candidate->applications_count,
                    'latest_application_status' => $latestApplication?->status,
                    'latest_job_title' => $latestApplication?->job?->title,
                    'latest_applied_at' => $latestApplication?->applied_at?->toIso8601String()
                        ?? $latestApplication?->created_at?->toIso8601String(),
                ];
            })
            ->values()
            ->all();

        $recruiterTable = User::query()
            ->where('role', User::ROLE_RECRUITER)
            ->withCount([
                'jobs',
                'jobs as active_jobs_count' => fn ($query) => $query->where('status', Job::STATUS_ACTIVE),
            ])
            ->latest()
            ->limit(6)
            ->get()
            ->map(function (User $recruiter) {
                $latestJob = $recruiter->jobs()->latest()->first();

                return [
                    'id' => $recruiter->id,
                    'name' => $recruiter->name,
                    'email' => $recruiter->email,
                    'phone' => $recruiter->phone,
                    'jobs_count' => $recruiter->jobs_count,
                    'active_jobs_count' => $recruiter->active_jobs_count,
                    'latest_job_title' => $latestJob?->title,
                    'latest_job_created_at' => $latestJob?->created_at?->toIso8601String(),
                ];
            })
            ->values()
            ->all();

        $jobs = Job::query()
            ->with('recruiter:id,name,email')
            ->withCount('applications')
            ->latest()
            ->limit(8)
            ->get()
            ->map(fn (Job $job) => [
                'id' => $job->id,
                'title' => $job->title,
                'category' => $job->category,
                'location' => $job->location,
                'status' => $job->status,
                'job_type' => $job->job_type,
                'experience_level' => $job->experience_level,
                'applications_count' => $job->applications_count,
                'created_at' => $job->created_at?->toIso8601String(),
                'recruiter' => [
                    'id' => $job->recruiter?->id,
                    'name' => $job->recruiter?->name,
                    'email' => $job->recruiter?->email,
                ],
            ])
            ->values()
            ->all();

        $applications = Application::query()
            ->with([
                'candidate:id,name,email,phone',
                'job:id,title,location,recruiter_id',
                'job.recruiter:id,name,email',
            ])
            ->orderByDesc('applied_at')
            ->orderByDesc('created_at')
            ->limit(8)
            ->get()
            ->map(fn (Application $application) => [
                'id' => $application->id,
                'status' => $application->status,
                'applied_at' => $application->applied_at?->toIso8601String()
                    ?? $application->created_at?->toIso8601String(),
                'candidate' => [
                    'id' => $application->candidate?->id,
                    'name' => $application->candidate?->name,
                    'email' => $application->candidate?->email,
                    'phone' => $application->candidate?->phone,
                ],
                'job' => [
                    'id' => $application->job?->id,
                    'title' => $application->job?->title,
                    'location' => $application->job?->location,
                ],
                'recruiter' => [
                    'id' => $application->job?->recruiter?->id,
                    'name' => $application->job?->recruiter?->name,
                    'email' => $application->job?->recruiter?->email,
                ],
            ])
            ->values()
            ->all();

        return [
            'totals' => $totals,
            'growth' => $growth,
            'candidate_table' => $candidateTable,
            'recruiter_table' => $recruiterTable,
            'jobs' => $jobs,
            'applications' => $applications,
        ];
    }
}
