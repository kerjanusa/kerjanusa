<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AuthService
{
    /**
     * Register new user
     */
    public function register(array $data): User
    {
        return User::create([
            'name' => $data['name'],
            'email' => User::normalizeEmail($data['email']),
            'password' => Hash::make($data['password']),
            'role' => $data['role'] ?? User::ROLE_CANDIDATE,
            'phone' => User::normalizePhone($data['phone'] ?? null),
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

        return $user->update($data);
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
