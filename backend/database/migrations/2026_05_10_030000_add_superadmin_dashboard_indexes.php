<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE INDEX IF NOT EXISTS users_role_created_at_index ON users (role, created_at)');
        DB::statement('CREATE INDEX IF NOT EXISTS users_role_account_status_created_at_index ON users (role, account_status, created_at)');

        DB::statement('CREATE INDEX IF NOT EXISTS jobs_recruiter_status_created_at_index ON jobs (recruiter_id, status, created_at)');
        DB::statement('CREATE INDEX IF NOT EXISTS jobs_status_workflow_created_at_index ON jobs (status, workflow_status, created_at)');

        DB::statement('CREATE INDEX IF NOT EXISTS applications_candidate_applied_created_index ON applications (candidate_id, applied_at, created_at)');
        DB::statement('CREATE INDEX IF NOT EXISTS applications_job_status_stage_index ON applications (job_id, status, stage)');
        DB::statement('CREATE INDEX IF NOT EXISTS applications_stage_created_at_index ON applications (stage, created_at)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS users_role_created_at_index');
        DB::statement('DROP INDEX IF EXISTS users_role_account_status_created_at_index');

        DB::statement('DROP INDEX IF EXISTS jobs_recruiter_status_created_at_index');
        DB::statement('DROP INDEX IF EXISTS jobs_status_workflow_created_at_index');

        DB::statement('DROP INDEX IF EXISTS applications_candidate_applied_created_index');
        DB::statement('DROP INDEX IF EXISTS applications_job_status_stage_index');
        DB::statement('DROP INDEX IF EXISTS applications_stage_created_at_index');
    }
};
