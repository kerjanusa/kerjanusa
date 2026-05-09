<?php

namespace App\Http\Controllers;

use App\Services\AdminService;
use Illuminate\Http\JsonResponse;

class AdminController extends Controller
{
    public function __construct(private AdminService $adminService)
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
}
