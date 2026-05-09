<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function __construct(private AuthService $authService)
    {
    }

    /**
     * Register a new user
     */
    public function register(Request $request): JsonResponse
    {
        $request->merge([
            'email' => User::normalizeEmail($request->input('email')),
            'phone' => User::normalizePhone($request->input('phone')),
        ]);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => ['required', Password::min(8)->letters()->numbers()],
            'password_confirmation' => 'required|same:password',
            'role' => ['required', Rule::in(User::PUBLIC_REGISTRATION_ROLES)],
            'phone' => ['required', 'string', 'max:32', Rule::unique('users', 'phone')],
        ], [
            'email.unique' => 'Email sudah digunakan. Gunakan email lain.',
            'phone.required' => 'Nomor telepon wajib diisi.',
            'phone.unique' => 'Nomor telepon sudah digunakan. Gunakan nomor telepon lain.',
        ]);

        $user = $this->authService->register($validated);
        $token = $this->authService->createToken($user);

        return response()->json([
            'message' => 'User registered successfully',
            'user' => $user,
            'token' => $token,
        ], 201);
    }

    /**
     * Login user
     */
    public function login(Request $request): JsonResponse
    {
        $request->merge([
            'email' => User::normalizeEmail($request->input('email')),
        ]);

        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = $this->authService->login($validated['email'], $validated['password']);

        if (!$user) {
            return response()->json([
                'message' => 'Invalid credentials',
            ], 401);
        }

        $token = $this->authService->createToken($user);

        return response()->json([
            'message' => 'Login successful',
            'user' => $user,
            'token' => $token,
        ]);
    }

    /**
     * Logout user
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logout successful',
        ]);
    }

    /**
     * Get current user
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $request->user(),
        ]);
    }

    /**
     * Update user profile
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $request->merge([
            'phone' => User::normalizePhone($request->input('phone')),
        ]);

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'phone' => ['nullable', 'string', 'max:32', Rule::unique('users', 'phone')->ignore($request->user()->id)],
            'profile_picture' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ], [
            'phone.unique' => 'Nomor telepon sudah digunakan. Gunakan nomor telepon lain.',
        ]);

        $success = $this->authService->updateProfile($request->user()->id, $validated);

        if (!$success) {
            return response()->json([
                'message' => 'Failed to update profile',
            ], 400);
        }

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $request->user(),
        ]);
    }

    /**
     * Change password
     */
    public function changePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'old_password' => 'required|string',
            'new_password' => ['required', Password::min(8)->letters()->numbers()],
            'new_password_confirmation' => 'required|same:new_password',
        ]);

        $success = $this->authService->changePassword(
            $request->user()->id,
            $validated['old_password'],
            $validated['new_password']
        );

        if (!$success) {
            return response()->json([
                'message' => 'Failed to change password',
            ], 400);
        }

        return response()->json([
            'message' => 'Password changed successfully',
        ]);
    }
}
