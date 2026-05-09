<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\ApplicationController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\JobController;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Public routes
$databaseHealthResponder = function () {
    try {
        DB::connection()->getPdo();
        DB::select('select 1');

        $requiredTables = [
            'users',
            'jobs',
            'applications',
            'password_reset_tokens',
        ];

        $tables = [];
        $missingTables = [];

        foreach ($requiredTables as $table) {
            $exists = Schema::hasTable($table);
            $tables[$table] = $exists;

            if (!$exists) {
                $missingTables[] = $table;
            }
        }

        return response()->json([
            'status' => empty($missingTables) ? 'ok' : 'warning',
            'database' => empty($missingTables) ? 'ready' : 'schema_incomplete',
            'connection' => config('database.default'),
            'tables' => $tables,
            'missing_tables' => $missingTables,
        ], empty($missingTables) ? 200 : 500);
    } catch (\Throwable $exception) {
        return response()->json([
            'status' => 'error',
            'database' => 'unavailable',
            'connection' => config('database.default'),
            'message' => 'Database connection failed.',
            'exception' => class_basename($exception),
        ], 500);
    }
};

Route::get('/', fn () => response()->json([
    'name' => 'Pintarnya API',
    'status' => 'ok',
    'database' => 'not-required-for-health',
    'timestamp' => now()->toIso8601String(),
]));
Route::get('/health', $databaseHealthResponder);
Route::get('/health/database', $databaseHealthResponder);

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:6,1');
Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:10,1');

// Job routes (public - listing and detail)
Route::get('/jobs', [JobController::class, 'index']);
Route::get('/job-locations', [JobController::class, 'locations']);
Route::get('/jobs/{id}', [JobController::class, 'show']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth routes
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::put('/change-password', [AuthController::class, 'changePassword']);

    Route::middleware('role:candidate')->group(function () {
        Route::post('/apply', [ApplicationController::class, 'store']);
        Route::get('/my-applications', [ApplicationController::class, 'myCandidateApplications']);
    });

    Route::middleware('role:recruiter')->group(function () {
        Route::post('/jobs', [JobController::class, 'store']);
        Route::get('/my-jobs', [JobController::class, 'myJobs']);
    });

    Route::middleware('role:recruiter,superadmin')->group(function () {
        Route::put('/jobs/{id}', [JobController::class, 'update']);
        Route::delete('/jobs/{id}', [JobController::class, 'destroy']);
        Route::get('/jobs/{id}/statistics', [JobController::class, 'statistics']);
        Route::get('/jobs/{jobId}/applications', [ApplicationController::class, 'jobApplications']);
        Route::put('/applications/{applicationId}/status', [ApplicationController::class, 'updateStatus']);
    });

    Route::get('/applications/{applicationId}', [ApplicationController::class, 'show']);

    Route::middleware('role:superadmin')->prefix('admin')->group(function () {
        Route::get('/dashboard', [AdminController::class, 'dashboard']);
    });
});
