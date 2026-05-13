<?php

namespace App\Services;

use App\Models\User;

class RecruiterPlanService
{
    public const PLAN_STARTER = 'starter';
    public const PLAN_GROWTH = 'growth';
    public const PLAN_SCALE = 'scale';

    private const DEFAULT_KN_CREDIT = 0;

    private const PLAN_CATALOG = [
        self::PLAN_STARTER => [
            'code' => self::PLAN_STARTER,
            'label' => 'Starter',
            'description' => 'Untuk recruiter yang baru mulai membangun pipeline kandidat.',
            'job_limit' => 3,
            'talent_result_limit' => 15,
            'visible_resume_files' => 1,
            'visible_certificate_files' => 0,
            'chat_with_candidates' => true,
            'chat_with_superadmin' => true,
        ],
        self::PLAN_GROWTH => [
            'code' => self::PLAN_GROWTH,
            'label' => 'Growth',
            'description' => 'Untuk tim hiring yang butuh pencarian kandidat dan screening lebih luas.',
            'job_limit' => 10,
            'talent_result_limit' => 60,
            'visible_resume_files' => 3,
            'visible_certificate_files' => 2,
            'chat_with_candidates' => true,
            'chat_with_superadmin' => true,
        ],
        self::PLAN_SCALE => [
            'code' => self::PLAN_SCALE,
            'label' => 'Scale',
            'description' => 'Untuk recruiter dengan volume hiring tinggi dan kebutuhan akses penuh.',
            'job_limit' => null,
            'talent_result_limit' => 200,
            'visible_resume_files' => 10,
            'visible_certificate_files' => 10,
            'chat_with_candidates' => true,
            'chat_with_superadmin' => true,
        ],
    ];

    public function getPlanCatalog(): array
    {
        return array_values(self::PLAN_CATALOG);
    }

    public function normalizePlanCode(?string $planCode): string
    {
        $normalizedPlanCode = strtolower(trim((string) $planCode));

        return array_key_exists($normalizedPlanCode, self::PLAN_CATALOG)
            ? $normalizedPlanCode
            : self::PLAN_STARTER;
    }

    public function getPlanConfig(?string $planCode): array
    {
        return self::PLAN_CATALOG[$this->normalizePlanCode($planCode)];
    }

    public function getRecruiterPlanContext(User $recruiter): array
    {
        $profile = is_array($recruiter->recruiter_profile) ? $recruiter->recruiter_profile : [];
        $planCode = $this->normalizePlanCode($profile['plan_code'] ?? null);
        $planConfig = $this->getPlanConfig($planCode);

        return [
            ...$planConfig,
            'kn_credit' => max(0, (int) ($profile['kn_credit'] ?? self::DEFAULT_KN_CREDIT)),
        ];
    }

    public function normalizeRecruiterProfile(?array $profile): array
    {
        $currentProfile = is_array($profile) ? $profile : [];
        $planCode = $this->normalizePlanCode($currentProfile['plan_code'] ?? null);

        unset($currentProfile['plan']);

        return [
            ...$currentProfile,
            'plan_code' => $planCode,
            'kn_credit' => max(0, (int) ($currentProfile['kn_credit'] ?? self::DEFAULT_KN_CREDIT)),
        ];
    }

    public function getVisibleDocumentLimits(User $recruiter): array
    {
        $plan = $this->getRecruiterPlanContext($recruiter);

        return [
            'resume_files' => $plan['visible_resume_files'],
            'certificate_files' => $plan['visible_certificate_files'],
        ];
    }

    public function canPublishAdditionalJob(User $recruiter, int $currentActiveJobs): bool
    {
        $plan = $this->getRecruiterPlanContext($recruiter);

        if ($plan['job_limit'] === null) {
            return true;
        }

        return $currentActiveJobs < (int) $plan['job_limit'];
    }
}
