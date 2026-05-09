<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EnsureUserRole
{
    /**
     * Ensure the authenticated user has at least one of the allowed roles.
     */
    public function handle(Request $request, Closure $next, string ...$roles): mixed
    {
        $user = $request->user();

        if (!$user || !$user->hasAnyRole($roles)) {
            return response()->json([
                'message' => 'Forbidden',
            ], JsonResponse::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
