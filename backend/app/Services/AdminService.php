<?php

namespace App\Services;

use App\Models\Application;
use App\Models\Job;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class AdminService
{
    public function __construct(private RecruiterPlanService $recruiterPlanService)
    {
    }

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
        $sevenDaysAgo = now()->subDays(7);

        $userAggregates = User::query()
            ->selectRaw('COUNT(*) as total_users')
            ->selectRaw(
                'SUM(CASE WHEN role = ? THEN 1 ELSE 0 END) as candidates',
                [User::ROLE_CANDIDATE]
            )
            ->selectRaw(
                'SUM(CASE WHEN role = ? THEN 1 ELSE 0 END) as recruiters',
                [User::ROLE_RECRUITER]
            )
            ->selectRaw(
                'SUM(CASE WHEN role = ? THEN 1 ELSE 0 END) as superadmins',
                [User::ROLE_SUPERADMIN]
            )
            ->selectRaw(
                'SUM(CASE WHEN role = ? AND created_at >= ? THEN 1 ELSE 0 END) as new_candidates_last_7_days',
                [User::ROLE_CANDIDATE, $sevenDaysAgo]
            )
            ->selectRaw(
                'SUM(CASE WHEN role = ? AND created_at >= ? THEN 1 ELSE 0 END) as new_recruiters_last_7_days',
                [User::ROLE_RECRUITER, $sevenDaysAgo]
            )
            ->first();

        $jobAggregates = Job::query()
            ->selectRaw('COUNT(*) as total_jobs')
            ->selectRaw(
                'SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as active_jobs',
                [Job::STATUS_ACTIVE]
            )
            ->selectRaw(
                'SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as inactive_jobs',
                [Job::STATUS_INACTIVE]
            )
            ->selectRaw(
                'SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as new_jobs_last_7_days',
                [$sevenDaysAgo]
            )
            ->first();

        $applicationAggregates = Application::query()
            ->selectRaw('COUNT(*) as total_applications')
            ->selectRaw(
                'SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as pending_applications',
                [Application::STATUS_PENDING]
            )
            ->selectRaw(
                'SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as accepted_applications',
                [Application::STATUS_ACCEPTED]
            )
            ->selectRaw(
                'SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as rejected_applications',
                [Application::STATUS_REJECTED]
            )
            ->selectRaw(
                'SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as withdrawn_applications',
                [Application::STATUS_WITHDRAWN]
            )
            ->selectRaw(
                'SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as new_applications_last_7_days',
                [$sevenDaysAgo]
            )
            ->first();

        $totals = [
            'candidates' => (int) ($userAggregates->candidates ?? 0),
            'recruiters' => (int) ($userAggregates->recruiters ?? 0),
            'superadmins' => (int) ($userAggregates->superadmins ?? 0),
            'active_candidates' => (int) User::query()
                ->where('role', User::ROLE_CANDIDATE)
                ->where('account_status', User::STATUS_ACTIVE)
                ->count(),
            'inactive_candidates' => (int) User::query()
                ->where('role', User::ROLE_CANDIDATE)
                ->where('account_status', User::STATUS_SUSPENDED)
                ->count(),
            'active_recruiters' => (int) User::query()
                ->where('role', User::ROLE_RECRUITER)
                ->where('account_status', User::STATUS_ACTIVE)
                ->count(),
            'inactive_recruiters' => (int) User::query()
                ->where('role', User::ROLE_RECRUITER)
                ->where('account_status', User::STATUS_SUSPENDED)
                ->count(),
            'total_jobs' => (int) ($jobAggregates->total_jobs ?? 0),
            'active_jobs' => (int) ($jobAggregates->active_jobs ?? 0),
            'inactive_jobs' => (int) ($jobAggregates->inactive_jobs ?? 0),
            'total_applications' => (int) ($applicationAggregates->total_applications ?? 0),
            'pending_applications' => (int) ($applicationAggregates->pending_applications ?? 0),
            'accepted_applications' => (int) ($applicationAggregates->accepted_applications ?? 0),
            'rejected_applications' => (int) ($applicationAggregates->rejected_applications ?? 0),
            'withdrawn_applications' => (int) ($applicationAggregates->withdrawn_applications ?? 0),
        ];

        $growth = [
            'new_candidates_last_7_days' => (int) ($userAggregates->new_candidates_last_7_days ?? 0),
            'new_recruiters_last_7_days' => (int) ($userAggregates->new_recruiters_last_7_days ?? 0),
            'new_jobs_last_7_days' => (int) ($jobAggregates->new_jobs_last_7_days ?? 0),
            'new_applications_last_7_days' => (int) ($applicationAggregates->new_applications_last_7_days ?? 0),
        ];

        $latestCandidateApplicationQuery = Application::query()
            ->leftJoin('jobs as latest_jobs', 'latest_jobs.id', '=', 'applications.job_id')
            ->whereColumn('applications.candidate_id', 'users.id')
            ->orderByRaw('COALESCE(applications.applied_at, applications.created_at) DESC')
            ->orderByDesc('applications.id');

        $candidateTable = User::query()
            ->where('role', User::ROLE_CANDIDATE)
            ->select([
                'users.id',
                'users.name',
                'users.email',
                'users.phone',
                'users.account_status',
                'users.account_status_reason',
                'users.candidate_profile',
                'users.created_at',
            ])
            ->selectSub(
                Application::query()
                    ->selectRaw('COUNT(*)')
                    ->whereColumn('applications.candidate_id', 'users.id'),
                'applications_count'
            )
            ->selectSub(
                (clone $latestCandidateApplicationQuery)
                    ->select('applications.status')
                    ->limit(1),
                'latest_application_status'
            )
            ->selectSub(
                (clone $latestCandidateApplicationQuery)
                    ->select('applications.stage')
                    ->limit(1),
                'latest_application_stage'
            )
            ->selectSub(
                (clone $latestCandidateApplicationQuery)
                    ->select('latest_jobs.title')
                    ->limit(1),
                'latest_job_title'
            )
            ->selectSub(
                (clone $latestCandidateApplicationQuery)
                    ->selectRaw('COALESCE(applications.applied_at, applications.created_at)')
                    ->limit(1),
                'latest_applied_at'
            )
            ->latest()
            ->get()
            ->map(function (User $candidate) {
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
                    'applications_count' => (int) ($candidate->applications_count ?? 0),
                    'latest_application_status' => $candidate->latest_application_status,
                    'latest_application_stage' => $candidate->latest_application_stage,
                    'latest_job_title' => $candidate->latest_job_title,
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
                    'latest_applied_at' => $candidate->latest_applied_at,
                ];
            })
            ->values()
            ->all();

        $latestRecruiterJobQuery = Job::query()
            ->whereColumn('jobs.recruiter_id', 'users.id')
            ->orderByDesc('jobs.created_at')
            ->orderByDesc('jobs.id');

        $recruiterTable = User::query()
            ->where('role', User::ROLE_RECRUITER)
            ->select([
                'users.id',
                'users.name',
                'users.company_name',
                'users.email',
                'users.phone',
                'users.account_status',
                'users.account_status_reason',
                'users.recruiter_profile',
                'users.created_at',
            ])
            ->selectSub(
                Job::query()
                    ->selectRaw('COUNT(*)')
                    ->whereColumn('jobs.recruiter_id', 'users.id'),
                'jobs_count'
            )
            ->selectSub(
                Job::query()
                    ->selectRaw('COUNT(*)')
                    ->whereColumn('jobs.recruiter_id', 'users.id')
                    ->where('jobs.status', Job::STATUS_ACTIVE),
                'active_jobs_count'
            )
            ->selectSub(
                (clone $latestRecruiterJobQuery)
                    ->select('jobs.title')
                    ->limit(1),
                'latest_job_title'
            )
            ->selectSub(
                (clone $latestRecruiterJobQuery)
                    ->select('jobs.created_at')
                    ->limit(1),
                'latest_job_created_at'
            )
            ->latest()
            ->get()
            ->map(function (User $recruiter) {
                $profileReady = $this->extractProfileReadiness($recruiter->recruiter_profile ?? [], [
                    'companyName',
                    'contactRole',
                    'companyLocation',
                    'companyDescription',
                    'hiringFocus',
                ]);

                return [
                    ...$this->recruiterPlanService->getRecruiterPlanContext($recruiter),
                    'id' => $recruiter->id,
                    'name' => $recruiter->name,
                    'company_name' => $recruiter->company_name,
                    'company_location' => Arr::get($recruiter->recruiter_profile ?? [], 'companyLocation')
                        ?? Arr::get($recruiter->recruiter_profile ?? [], 'company_location'),
                    'email' => $recruiter->email,
                    'phone' => $recruiter->phone,
                    'account_status' => $recruiter->account_status,
                    'account_status_reason' => $recruiter->account_status_reason,
                    'profile_ready' => $profileReady,
                    'jobs_count' => (int) ($recruiter->jobs_count ?? 0),
                    'active_jobs_count' => (int) ($recruiter->active_jobs_count ?? 0),
                    'latest_job_title' => $recruiter->latest_job_title,
                    'verification_status' => Arr::get($recruiter->recruiter_profile ?? [], 'verificationStatus')
                        ?? ($profileReady ? 'verified' : 'pending'),
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
                    'latest_job_created_at' => $recruiter->latest_job_created_at,
                ];
            })
            ->values()
            ->all();

        $jobApplicationCountsQuery = Application::query()
            ->selectRaw('job_id, COUNT(*) as applications_count')
            ->groupBy('job_id');

        $jobs = Job::query()
            ->leftJoin('users as recruiters', 'recruiters.id', '=', 'jobs.recruiter_id')
            ->leftJoinSub($jobApplicationCountsQuery, 'application_totals', function ($join) {
                $join->on('application_totals.job_id', '=', 'jobs.id');
            })
            ->select([
                'jobs.id',
                'jobs.title',
                'jobs.category',
                'jobs.location',
                'jobs.status',
                'jobs.workflow_status',
                'jobs.job_type',
                'jobs.experience_level',
                'jobs.video_screening_requirement',
                'jobs.quiz_screening_questions',
                'jobs.created_at',
                DB::raw('COALESCE(application_totals.applications_count, 0) as applications_count'),
                'recruiters.id as recruiter_id',
                'recruiters.name as recruiter_name',
                'recruiters.email as recruiter_email',
                'recruiters.company_name as recruiter_company_name',
            ])
            ->latest()
            ->get()
            ->map(function ($job) {
                $screeningQuestions = is_array($job->quiz_screening_questions ?? null)
                    ? $job->quiz_screening_questions
                    : json_decode($job->quiz_screening_questions ?? '[]', true);

                return [
                    'id' => $job->id,
                    'title' => $job->title,
                    'category' => $job->category,
                    'location' => $job->location,
                    'status' => $job->status,
                    'workflow_status' => $job->workflow_status,
                    'job_type' => $job->job_type,
                    'experience_level' => $job->experience_level,
                    'video_screening_requirement' => $job->video_screening_requirement ?? 'optional',
                    'screening_questions_count' => count(is_array($screeningQuestions) ? $screeningQuestions : []),
                    'applications_count' => (int) ($job->applications_count ?? 0),
                    'created_at' => optional($job->created_at)->toIso8601String(),
                    'recruiter' => [
                        'id' => $job->recruiter_id,
                        'name' => $job->recruiter_name,
                        'company_name' => $job->recruiter_company_name,
                        'email' => $job->recruiter_email,
                    ],
                ];
            })
            ->values()
            ->all();

        $applications = Application::query()
            ->leftJoin('users as candidates', 'candidates.id', '=', 'applications.candidate_id')
            ->leftJoin('jobs', 'jobs.id', '=', 'applications.job_id')
            ->leftJoin('users as recruiters', 'recruiters.id', '=', 'jobs.recruiter_id')
            ->select([
                'applications.id',
                'applications.status',
                'applications.stage',
                'applications.video_intro_url',
                'applications.screening_answers',
                DB::raw('COALESCE(applications.applied_at, applications.created_at) as applied_at'),
                'candidates.id as candidate_id',
                'candidates.name as candidate_name',
                'candidates.email as candidate_email',
                'candidates.phone as candidate_phone',
                'jobs.id as job_id',
                'jobs.title as job_title',
                'jobs.location as job_location',
                'recruiters.id as recruiter_id',
                'recruiters.name as recruiter_name',
                'recruiters.company_name as recruiter_company_name',
                'recruiters.email as recruiter_email',
            ])
            ->orderByRaw('COALESCE(applications.applied_at, applications.created_at) DESC')
            ->orderByDesc('applications.id')
            ->get()
            ->map(function ($application) {
                $screeningAnswers = is_array($application->screening_answers ?? null)
                    ? $application->screening_answers
                    : json_decode($application->screening_answers ?? '[]', true);

                return [
                    'id' => $application->id,
                    'status' => $application->status,
                    'stage' => $application->stage,
                    'applied_at' => $application->applied_at,
                    'has_video_intro' => filled($application->video_intro_url ?? null),
                    'screening_answers_count' => count(is_array($screeningAnswers) ? $screeningAnswers : []),
                    'candidate' => [
                        'id' => $application->candidate_id,
                        'name' => $application->candidate_name,
                        'email' => $application->candidate_email,
                        'phone' => $application->candidate_phone,
                    ],
                    'job' => [
                        'id' => $application->job_id,
                        'title' => $application->job_title,
                        'location' => $application->job_location,
                    ],
                    'recruiter' => [
                        'id' => $application->recruiter_id,
                        'name' => $application->recruiter_name,
                        'company_name' => $application->recruiter_company_name,
                        'email' => $application->recruiter_email,
                    ],
                ];
            })
            ->values()
            ->all();

        $screeningOverview = [
            'candidate_profiles_incomplete' => collect($candidateTable)
                ->where('profile_ready', false)
                ->count(),
            'applications_with_video_screening' => Application::query()
                ->whereNotNull('video_intro_url')
                ->count(),
            'applications_with_screening_answers' => Application::query()
                ->whereNotNull('screening_answers')
                ->count(),
            'jobs_waiting_recruiter_notice' => Job::query()
                ->where('workflow_status', Job::WORKFLOW_ACTIVE)
                ->where('created_at', '<=', now()->subDays(3))
                ->whereDoesntHave('applications')
                ->count(),
            'recruiter_plan_distribution' => collect($recruiterTable)
                ->groupBy('code')
                ->map(fn (Collection $items, string $planCode) => [
                    'plan_code' => $planCode,
                    'label' => $items->first()['label'] ?? strtoupper($planCode),
                    'total' => $items->count(),
                ])
                ->values()
                ->all(),
        ];

        return [
            'totals' => $totals,
            'growth' => $growth,
            'screening_overview' => $screeningOverview,
            'candidate_table' => $candidateTable,
            'recruiter_table' => $recruiterTable,
            'recruiter_options' => collect($recruiterTable)
                ->filter(fn (array $recruiter) => ($recruiter['account_status'] ?? null) === User::STATUS_ACTIVE)
                ->sortBy([
                    ['company_name', 'asc'],
                    ['name', 'asc'],
                ])
                ->map(fn (array $recruiter) => [
                    'id' => $recruiter['id'],
                    'name' => $recruiter['name'],
                    'company_name' => $recruiter['company_name'],
                    'email' => $recruiter['email'],
                ])
                ->values()
                ->all(),
            'jobs' => $jobs,
            'applications' => $applications,
        ];
    }
}
