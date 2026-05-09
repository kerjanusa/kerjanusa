<?php

namespace App\Services;

use App\Models\Application;
use App\Models\Job;
use App\Models\User;
use Illuminate\Support\Arr;

class AdminService
{
    private function extractProfileReadiness(array $profile, array $requiredKeys): bool
    {
        foreach ($requiredKeys as $key) {
            $value = Arr::get($profile, $key);

            if (is_array($value)) {
                if (collect($value)->filter(fn ($item) => filled(is_string($item) ? trim($item) : $item))->isEmpty()) {
                    return false;
                }

                continue;
            }

            if (!filled($value)) {
                return false;
            }
        }

        return true;
    }

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
                    'account_status' => $candidate->account_status,
                    'account_status_reason' => $candidate->account_status_reason,
                    'profile_ready' => $this->extractProfileReadiness($candidate->candidate_profile ?? [], [
                        'currentAddress',
                        'profileSummary',
                        'preferredRoles',
                        'preferredLocations',
                        'skills',
                        'resumeFiles',
                    ]),
                    'applications_count' => $candidate->applications_count,
                    'latest_application_status' => $latestApplication?->status,
                    'latest_application_stage' => $latestApplication?->stage,
                    'latest_job_title' => $latestApplication?->job?->title,
                    'profile_summary' => Arr::get($candidate->candidate_profile ?? [], 'profileSummary'),
                    'preferred_roles' => collect(Arr::get($candidate->candidate_profile ?? [], 'preferredRoles', []))
                        ->filter(fn ($role) => filled($role))
                        ->values()
                        ->all(),
                    'preferred_locations' => collect(Arr::get($candidate->candidate_profile ?? [], 'preferredLocations', []))
                        ->filter(fn ($location) => filled($location))
                        ->values()
                        ->all(),
                    'skills' => collect(Arr::get($candidate->candidate_profile ?? [], 'skills', []))
                        ->filter(fn ($skill) => filled($skill))
                        ->values()
                        ->all(),
                    'resume_files_count' => collect(Arr::get($candidate->candidate_profile ?? [], 'resumeFiles', []))
                        ->filter(fn ($file) => filled($file))
                        ->count(),
                    'created_at' => $candidate->created_at?->toIso8601String(),
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
            ->get()
            ->map(function (User $recruiter) {
                $latestJob = $recruiter->jobs()->latest()->first();

                return [
                    'id' => $recruiter->id,
                    'name' => $recruiter->name,
                    'company_name' => $recruiter->company_name,
                    'company_location' => Arr::get($recruiter->recruiter_profile ?? [], 'companyLocation')
                        ?? Arr::get($recruiter->recruiter_profile ?? [], 'company_location'),
                    'email' => $recruiter->email,
                    'phone' => $recruiter->phone,
                    'account_status' => $recruiter->account_status,
                    'account_status_reason' => $recruiter->account_status_reason,
                    'profile_ready' => $this->extractProfileReadiness($recruiter->recruiter_profile ?? [], [
                        'companyName',
                        'contactRole',
                        'companyLocation',
                        'companyDescription',
                        'hiringFocus',
                    ]),
                    'jobs_count' => $recruiter->jobs_count,
                    'active_jobs_count' => $recruiter->active_jobs_count,
                    'latest_job_title' => $latestJob?->title,
                    'verification_status' => Arr::get($recruiter->recruiter_profile ?? [], 'verificationStatus')
                        ?? ($this->extractProfileReadiness($recruiter->recruiter_profile ?? [], [
                            'companyName',
                            'contactRole',
                            'companyLocation',
                            'companyDescription',
                            'hiringFocus',
                        ]) ? 'verified' : 'pending'),
                    'verification_notes' => Arr::get($recruiter->recruiter_profile ?? [], 'verificationNotes'),
                    'verified_at' => Arr::get($recruiter->recruiter_profile ?? [], 'verifiedAt'),
                    'contact_role' => Arr::get($recruiter->recruiter_profile ?? [], 'contactRole')
                        ?? Arr::get($recruiter->recruiter_profile ?? [], 'contact_role'),
                    'company_description' => Arr::get($recruiter->recruiter_profile ?? [], 'companyDescription')
                        ?? Arr::get($recruiter->recruiter_profile ?? [], 'company_description'),
                    'hiring_focus' => collect(Arr::get($recruiter->recruiter_profile ?? [], 'hiringFocus', []))
                        ->filter(fn ($focus) => filled($focus))
                        ->values()
                        ->all(),
                    'created_at' => $recruiter->created_at?->toIso8601String(),
                    'latest_job_created_at' => $latestJob?->created_at?->toIso8601String(),
                ];
            })
            ->values()
            ->all();

        $jobs = Job::query()
            ->with('recruiter:id,name,email,company_name')
            ->withCount('applications')
            ->latest()
            ->get()
            ->map(fn (Job $job) => [
                'id' => $job->id,
                'title' => $job->title,
                'category' => $job->category,
                'location' => $job->location,
                'status' => $job->status,
                'workflow_status' => $job->workflow_status,
                'job_type' => $job->job_type,
                'experience_level' => $job->experience_level,
                'applications_count' => $job->applications_count,
                'created_at' => $job->created_at?->toIso8601String(),
                'recruiter' => [
                    'id' => $job->recruiter?->id,
                    'name' => $job->recruiter?->name,
                    'company_name' => $job->recruiter?->company_name,
                    'email' => $job->recruiter?->email,
                ],
            ])
            ->values()
            ->all();

        $applications = Application::query()
            ->with([
                'candidate:id,name,email,phone',
                'job:id,title,location,recruiter_id',
                'job.recruiter:id,name,email,company_name',
            ])
            ->orderByDesc('applied_at')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Application $application) => [
                'id' => $application->id,
                'status' => $application->status,
                'stage' => $application->stage,
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
                    'company_name' => $application->job?->recruiter?->company_name,
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
            'recruiter_options' => User::query()
                ->where('role', User::ROLE_RECRUITER)
                ->where('account_status', User::STATUS_ACTIVE)
                ->orderBy('company_name')
                ->orderBy('name')
                ->get(['id', 'name', 'company_name', 'email'])
                ->map(fn (User $recruiter) => [
                    'id' => $recruiter->id,
                    'name' => $recruiter->name,
                    'company_name' => $recruiter->company_name,
                    'email' => $recruiter->email,
                ])
                ->values()
                ->all(),
            'jobs' => $jobs,
            'applications' => $applications,
        ];
    }
}
