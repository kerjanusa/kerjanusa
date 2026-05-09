<?php

namespace App\Http\Controllers;

use App\Models\Job;
use App\Models\User;
use App\Services\AdminService;
use App\Services\JobService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password as PasswordBroker;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    public function __construct(
        private AdminService $adminService,
        private JobService $jobService,
    )
    {
    }

    /**
     * Return the live dashboard payload for the authenticated superadmin.
     */
    public function dashboard(): JsonResponse
    {
        return response()->json([
            'data' => $this->adminService->getDashboardData(),
        ]);
    }

    /**
     * Update basic account controls for candidate or recruiter users.
     */
    public function updateUser(Request $request, int $userId): JsonResponse
    {
        $user = User::find($userId);

        if (!$user || $user->hasRole(User::ROLE_SUPERADMIN)) {
            return response()->json([
                'message' => 'User tidak ditemukan atau tidak dapat diubah.',
            ], 404);
        }

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'email' => ['nullable', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:32', Rule::unique('users', 'phone')->ignore($user->id)],
            'company_name' => 'nullable|string|max:255',
            'account_status' => ['nullable', Rule::in(User::ACCOUNT_STATUSES)],
            'account_status_reason' => 'nullable|string|max:1000',
            'verification_status' => ['nullable', Rule::in(['pending', 'verified'])],
            'verification_notes' => 'nullable|string|max:1000',
        ]);

        $nextAccountStatus = $validated['account_status'] ?? $user->account_status;
        $nextAccountStatusReason = array_key_exists('account_status_reason', $validated)
            ? (filled($validated['account_status_reason']) ? trim($validated['account_status_reason']) : null)
            : $user->account_status_reason;

        if ($nextAccountStatus === User::STATUS_ACTIVE) {
            $nextAccountStatusReason = null;
        }

        $user->fill([
            'name' => array_key_exists('name', $validated) ? $validated['name'] : $user->name,
            'email' => array_key_exists('email', $validated) ? User::normalizeEmail($validated['email']) : $user->email,
            'phone' => array_key_exists('phone', $validated) ? User::normalizePhone($validated['phone']) : $user->phone,
            'company_name' => array_key_exists('company_name', $validated)
                ? filled($validated['company_name']) ? trim($validated['company_name']) : null
                : $user->company_name,
            'account_status' => $nextAccountStatus,
            'account_status_reason' => $nextAccountStatusReason,
        ]);

        if ($user->hasRole(User::ROLE_RECRUITER) && (
            array_key_exists('verification_status', $validated) ||
            array_key_exists('verification_notes', $validated)
        )) {
            $recruiterProfile = is_array($user->recruiter_profile) ? $user->recruiter_profile : [];

            if (array_key_exists('verification_status', $validated)) {
                $recruiterProfile['verificationStatus'] = $validated['verification_status'];
                $recruiterProfile['verifiedAt'] = $validated['verification_status'] === 'verified'
                    ? now()->toIso8601String()
                    : null;
            }

            if (array_key_exists('verification_notes', $validated)) {
                $recruiterProfile['verificationNotes'] = filled($validated['verification_notes'])
                    ? trim($validated['verification_notes'])
                    : null;
            }

            $user->recruiter_profile = $recruiterProfile;
        }

        $user->save();

        return response()->json([
            'message' => 'Akun user berhasil diperbarui.',
            'data' => $user->fresh(),
        ]);
    }

    /**
     * Send a reset-password email to the selected user.
     */
    public function sendResetLink(int $userId): JsonResponse
    {
        $user = User::find($userId);

        if (!$user || $user->hasRole(User::ROLE_SUPERADMIN)) {
            return response()->json([
                'message' => 'User tidak ditemukan atau tidak dapat diproses.',
            ], 404);
        }

        $status = PasswordBroker::sendResetLink([
            'email' => $user->email,
        ]);

        if ($status !== PasswordBroker::RESET_LINK_SENT) {
            return response()->json([
                'message' => 'Link reset password belum berhasil dikirim.',
            ], 422);
        }

        return response()->json([
            'message' => 'Link reset password berhasil dikirim.',
        ]);
    }

    /**
     * Reassign a job to another active recruiter.
     */
    public function reassignJob(Request $request, int $jobId): JsonResponse
    {
        $job = Job::find($jobId);

        if (!$job) {
            return response()->json([
                'message' => 'Lowongan tidak ditemukan.',
            ], 404);
        }

        $validated = $request->validate([
            'recruiter_id' => [
                'required',
                'integer',
                Rule::exists('users', 'id')->where(function ($query) {
                    $query->where('role', User::ROLE_RECRUITER)
                        ->where('account_status', User::STATUS_ACTIVE);
                }),
            ],
        ]);

        $success = $this->jobService->reassignJob($jobId, $validated['recruiter_id']);

        if (!$success) {
            return response()->json([
                'message' => 'Lowongan belum berhasil dipindahkan.',
            ], 422);
        }

        return response()->json([
            'message' => 'Lowongan berhasil dipindahkan ke recruiter baru.',
        ]);
    }
}
