<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AuthService
{
    public function __construct(private RecruiterPlanService $recruiterPlanService)
    {
    }

    private function trimToNull(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $trimmedValue = trim($value);

        return $trimmedValue === '' ? null : $trimmedValue;
    }

    /**
     * Register new user
     */
    public function register(array $data): User
    {
        $role = $data['role'] ?? User::ROLE_CANDIDATE;

        return User::create([
            'name' => $data['name'],
            'company_name' => $this->trimToNull($data['company_name'] ?? null),
            'email' => User::normalizeEmail($data['email']),
            'password' => Hash::make($data['password']),
            'role' => $role,
            'account_status' => User::STATUS_ACTIVE,
            'phone' => User::normalizePhone($data['phone'] ?? null),
            'recruiter_profile' => $role === User::ROLE_RECRUITER
                ? $this->recruiterPlanService->normalizeRecruiterProfile(
                    is_array($data['recruiter_profile'] ?? null) ? $data['recruiter_profile'] : []
                )
                : null,
        ]);
    }

    /**
     * Login user
     */
    public function login(string $email, string $password): User|false
    {
        $user = User::where('email', User::normalizeEmail($email))->first();

        if (!$user || !Hash::check($password, $user->password)) {
            return false;
        }

        return $user;
    }

    /**
     * Create user token
     */
    public function createToken(User $user): string
    {
        return $user->createToken('auth-token')->plainTextToken;
    }

    /**
     * Get user by email
     */
    public function getUserByEmail(string $email): ?User
    {
        return User::where('email', User::normalizeEmail($email))->first();
    }

    /**
     * Update user profile
     */
    public function updateProfile(int $userId, array $data): bool
    {
        $user = User::find($userId);

        if (!$user) {
            return false;
        }

        $nextData = [];

        if (array_key_exists('name', $data)) {
            $nextData['name'] = $this->trimToNull($data['name']) ?? $user->name;
        }

        if (array_key_exists('phone', $data)) {
            $nextData['phone'] = User::normalizePhone($data['phone']);
        }

        if (array_key_exists('company_name', $data)) {
            $nextData['company_name'] = $this->trimToNull($data['company_name']);
        }

        if (array_key_exists('candidate_profile', $data)) {
            $nextData['candidate_profile'] = is_array($data['candidate_profile'])
                ? $data['candidate_profile']
                : null;
        }

        if (array_key_exists('recruiter_profile', $data)) {
            $mergedProfile = [
                ...(is_array($user->recruiter_profile) ? $user->recruiter_profile : []),
                ...(is_array($data['recruiter_profile']) ? $data['recruiter_profile'] : []),
            ];

            $nextData['recruiter_profile'] = $this->recruiterPlanService->normalizeRecruiterProfile(
                $mergedProfile
            );
        } elseif ($user->hasRole(User::ROLE_RECRUITER)) {
            $nextData['recruiter_profile'] = $this->recruiterPlanService->normalizeRecruiterProfile(
                is_array($user->recruiter_profile) ? $user->recruiter_profile : []
            );
        }

        if (array_key_exists('profile_picture', $data)) {
            $nextData['profile_picture'] = $data['profile_picture'];
        }

        return $user->update($nextData);
    }

    /**
     * Change password
     */
    public function changePassword(int $userId, string $oldPassword, string $newPassword): bool
    {
        $user = User::find($userId);
        
        if (!$user || !Hash::check($oldPassword, $user->password)) {
            return false;
        }

        return $user->update(['password' => Hash::make($newPassword)]);
    }
}
