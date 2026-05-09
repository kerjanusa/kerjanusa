<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EnsureUserAccountIsActive
{
    /**
     * Block suspended accounts from using authenticated routes.
     */
    public function handle(Request $request, Closure $next): mixed
    {
        $user = $request->user();

        if (!$user || $user->isActive()) {
            return $next($request);
        }

        $user->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Akun Anda sedang dinonaktifkan. Hubungi superadmin KerjaNusa untuk bantuan lebih lanjut.',
            'reason' => 'account_suspended',
        ], JsonResponse::HTTP_FORBIDDEN);
    }
}
