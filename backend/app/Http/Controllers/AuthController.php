<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\AuthService;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password as PasswordBroker;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password as PasswordRule;

class AuthController extends Controller
{
    private const FORGOT_PASSWORD_SUCCESS_MESSAGE = 'Jika email terdaftar, link reset password telah dikirim ke email Anda.';
    private const RESET_PASSWORD_SUCCESS_MESSAGE = 'Password berhasil diubah. Silakan login dengan password baru Anda.';
    private const RESET_PASSWORD_INVALID_MESSAGE = 'Link reset tidak valid atau sudah kedaluwarsa. Silakan minta link baru.';

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
            'password' => ['required', PasswordRule::min(8)->letters()->numbers()],
            'password_confirmation' => 'required|same:password',
            'role' => ['required', Rule::in(User::PUBLIC_REGISTRATION_ROLES)],
            'phone' => ['required', 'string', 'max:32', Rule::unique('users', 'phone')],
        ], [
            'name.required' => 'Nama wajib diisi.',
            'email.required' => 'Email wajib diisi.',
            'email.email' => 'Format email tidak valid.',
            'email.unique' => 'Email sudah digunakan. Gunakan email lain.',
            'password.required' => 'Password wajib diisi.',
            'password_confirmation.required' => 'Konfirmasi password wajib diisi.',
            'password_confirmation.same' => 'Konfirmasi password harus sama dengan password.',
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
        ], [
            'email.required' => 'Email wajib diisi.',
            'email.email' => 'Format email tidak valid.',
            'password.required' => 'Password wajib diisi.',
        ]);

        $user = $this->authService->getUserByEmail($validated['email']);

        if (!$user) {
            return response()->json([
                'message' => 'Email tidak terdaftar.',
                'errors' => [
                    'email' => ['Email tidak terdaftar.'],
                ],
            ], 422);
        }

        if (!Hash::check($validated['password'], $user->password)) {
            return response()->json([
                'message' => 'Password salah. Periksa kembali password Anda.',
                'errors' => [
                    'password' => ['Password salah. Periksa kembali password Anda.'],
                ],
            ], 422);
        }

        $token = $this->authService->createToken($user);

        return response()->json([
            'message' => 'Login successful',
            'user' => $user,
            'token' => $token,
        ]);
    }

    /**
     * Send forgot-password link
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->merge([
            'email' => User::normalizeEmail($request->input('email')),
        ]);

        $validated = $request->validate([
            'email' => 'required|email',
        ], [
            'email.required' => 'Email wajib diisi.',
            'email.email' => 'Format email tidak valid.',
        ]);

        PasswordBroker::sendResetLink([
            'email' => $validated['email'],
        ]);

        return response()->json([
            'message' => self::FORGOT_PASSWORD_SUCCESS_MESSAGE,
        ]);
    }

    /**
     * Reset password using email token
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $request->merge([
            'email' => User::normalizeEmail($request->input('email')),
        ]);

        $validated = $request->validate([
            'token' => 'required|string',
            'email' => 'required|email',
            'password' => ['required', PasswordRule::min(8)->letters()->numbers()],
            'password_confirmation' => 'required|same:password',
        ], [
            'token.required' => 'Token reset password wajib ada.',
            'email.required' => 'Email wajib diisi.',
            'email.email' => 'Format email tidak valid.',
            'password.required' => 'Password baru wajib diisi.',
            'password_confirmation.required' => 'Konfirmasi password wajib diisi.',
            'password_confirmation.same' => 'Konfirmasi password harus sama dengan password baru.',
        ]);

        $status = PasswordBroker::reset(
            [
                'email' => $validated['email'],
                'password' => $validated['password'],
                'password_confirmation' => $validated['password_confirmation'],
                'token' => $validated['token'],
            ],
            function (User $user, string $password): void {
                $user->forceFill([
                    'password' => $password,
                    'remember_token' => Str::random(60),
                ])->save();

                $user->tokens()->delete();

                event(new PasswordReset($user));
            }
        );

        if ($status === PasswordBroker::PASSWORD_RESET) {
            return response()->json([
                'message' => self::RESET_PASSWORD_SUCCESS_MESSAGE,
            ]);
        }

        return response()->json([
            'message' => self::RESET_PASSWORD_INVALID_MESSAGE,
            'errors' => [
                'token' => [self::RESET_PASSWORD_INVALID_MESSAGE],
            ],
        ], 422);
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
            'new_password' => ['required', PasswordRule::min(8)->letters()->numbers()],
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
