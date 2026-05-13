<?php

namespace App\Services;

use App\Models\Application;
use App\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;

class TalentSearchService
{
    public function __construct(private RecruiterPlanService $recruiterPlanService)
    {
    }

    public function search(User $recruiter, array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $plan = $this->recruiterPlanService->getRecruiterPlanContext($recruiter);
        $currentPage = max(1, (int) ($filters['page'] ?? 1));
        $normalizedQuery = strtolower(trim((string) ($filters['query'] ?? '')));
        $normalizedLocation = strtolower(trim((string) ($filters['location'] ?? '')));
        $normalizedGrade = strtoupper(trim((string) ($filters['grade'] ?? '')));
        $normalizedExperienceType = strtolower(trim((string) ($filters['experience_type'] ?? '')));
        $normalizedSkill = strtolower(trim((string) ($filters['skill'] ?? '')));

        $candidates = User::query()
            ->where('role', User::ROLE_CANDIDATE)
            ->where('account_status', User::STATUS_ACTIVE)
            ->withCount('applications')
            ->latest()
            ->get()
            ->map(fn (User $candidate) => $this->presentCandidate($candidate, $recruiter))
            ->filter(function (array $candidate) use (
                $normalizedQuery,
                $normalizedLocation,
                $normalizedGrade,
                $normalizedExperienceType,
                $normalizedSkill
            ) {
                $haystack = strtolower(implode(' ', array_filter([
                    $candidate['name'] ?? null,
                    $candidate['profile_summary'] ?? null,
                    implode(' ', $candidate['preferred_roles'] ?? []),
                    implode(' ', $candidate['preferred_locations'] ?? []),
                    implode(' ', $candidate['skills'] ?? []),
                ])));

                $matchesQuery = $normalizedQuery === '' || str_contains($haystack, $normalizedQuery);
                $matchesLocation = $normalizedLocation === ''
                    || collect($candidate['preferred_locations'] ?? [])
                        ->contains(fn ($location) => str_contains(strtolower((string) $location), $normalizedLocation));
                $matchesGrade = $normalizedGrade === '' || strtoupper((string) $candidate['grade']) === $normalizedGrade;
                $matchesExperienceType = $normalizedExperienceType === ''
                    || strtolower((string) $candidate['experience_type']) === $normalizedExperienceType;
                $matchesSkill = $normalizedSkill === ''
                    || collect($candidate['skills'] ?? [])
                        ->contains(fn ($skill) => str_contains(strtolower((string) $skill), $normalizedSkill));

                return $matchesQuery
                    && $matchesLocation
                    && $matchesGrade
                    && $matchesExperienceType
                    && $matchesSkill;
            })
            ->sortByDesc(
                fn (array $candidate) =>
                    ((int) $candidate['profile_readiness_percent'] * 1000)
                    + ((int) $candidate['applications_count'] * 10)
                    + (int) $candidate['experience_entries_count']
            )
            ->values();

        $limitedCandidates = $candidates->take((int) $plan['talent_result_limit'])->values();
        $items = $limitedCandidates
            ->forPage($currentPage, $perPage)
            ->values();

        return new LengthAwarePaginator(
            $items,
            $limitedCandidates->count(),
            $perPage,
            $currentPage,
            ['path' => request()->url()]
        );
    }

    private function presentCandidate(User $candidate, User $recruiter): array
    {
        $profile = is_array($candidate->candidate_profile) ? $candidate->candidate_profile : [];
        $resumeFiles = Arr::get($profile, 'resumeFiles', []);
        $certificateFiles = Arr::get($profile, 'certificateFiles', []);
        $experienceEntries = collect(Arr::get($profile, 'experiences', []))
            ->filter(fn ($experience) => filled($experience['company'] ?? null) || filled($experience['position'] ?? null))
            ->values();
        $requiredChecks = [
            filled(Arr::get($profile, 'currentAddress')),
            filled(Arr::get($profile, 'profileSummary')),
            collect(Arr::get($profile, 'preferredRoles', []))->filter()->isNotEmpty(),
            collect(Arr::get($profile, 'preferredLocations', []))->filter()->isNotEmpty(),
            collect(Arr::get($profile, 'skills', []))->filter()->isNotEmpty(),
            collect($resumeFiles)->filter()->isNotEmpty(),
        ];
        $profileReadinessPercent = (int) round((collect($requiredChecks)->filter()->count() / count($requiredChecks)) * 100);
        $experienceType = $experienceEntries->isEmpty() ? 'fresh-graduate' : 'experienced';
        $grade = $this->resolveCandidateGrade(
            $profileReadinessPercent,
            $experienceEntries->count(),
            count(array_filter(Arr::get($profile, 'skills', [])))
        );
        $limits = $this->recruiterPlanService->getVisibleDocumentLimits($recruiter);
        $visibleResumeFiles = array_slice($resumeFiles, 0, $limits['resume_files']);
        $visibleCertificateFiles = array_slice($certificateFiles, 0, $limits['certificate_files']);
        $latestApplication = Application::query()
            ->where('candidate_id', $candidate->id)
            ->with('job')
            ->latest('applied_at')
            ->latest('created_at')
            ->first();

        return [
            'id' => $candidate->id,
            'name' => $candidate->name,
            'email' => $candidate->email,
            'phone' => $candidate->phone,
            'profile_summary' => Arr::get($profile, 'profileSummary'),
            'preferred_roles' => collect(Arr::get($profile, 'preferredRoles', []))->filter()->values()->all(),
            'preferred_locations' => collect(Arr::get($profile, 'preferredLocations', []))->filter()->values()->all(),
            'skills' => collect(Arr::get($profile, 'skills', []))->filter()->values()->all(),
            'experience_type' => $experienceType,
            'experience_entries_count' => $experienceEntries->count(),
            'applications_count' => (int) ($candidate->applications_count ?? 0),
            'grade' => $grade,
            'profile_readiness_percent' => $profileReadinessPercent,
            'resume_files' => $visibleResumeFiles,
            'certificate_files' => $visibleCertificateFiles,
            'document_access' => [
                'resume_files_visible' => count($visibleResumeFiles),
                'resume_files_total' => count($resumeFiles),
                'certificate_files_visible' => count($visibleCertificateFiles),
                'certificate_files_total' => count($certificateFiles),
                'upgrade_required' => count($visibleResumeFiles) < count($resumeFiles)
                    || count($visibleCertificateFiles) < count($certificateFiles),
            ],
            'latest_application' => $latestApplication ? [
                'job_id' => $latestApplication->job_id,
                'job_title' => $latestApplication->job?->title,
                'stage' => $latestApplication->stage,
                'applied_at' => optional($latestApplication->applied_at)->toIso8601String(),
            ] : null,
        ];
    }

    private function resolveCandidateGrade(
        int $profileReadinessPercent,
        int $experienceEntriesCount,
        int $skillsCount
    ): string {
        if ($profileReadinessPercent >= 90 && $experienceEntriesCount >= 2 && $skillsCount >= 3) {
            return 'A';
        }

        if ($profileReadinessPercent >= 70 && $skillsCount >= 2) {
            return 'B';
        }

        return 'C';
    }
}
