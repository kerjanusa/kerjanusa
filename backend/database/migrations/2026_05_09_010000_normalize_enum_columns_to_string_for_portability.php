<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        if (Schema::hasTable('users') && Schema::hasColumn('users', 'role')) {
            DB::statement("ALTER TABLE users MODIFY role VARCHAR(32) NOT NULL DEFAULT 'candidate'");
        }

        if (Schema::hasTable('jobs')) {
            if (Schema::hasColumn('jobs', 'job_type')) {
                DB::statement("ALTER TABLE jobs MODIFY job_type VARCHAR(32) NOT NULL");
            }

            if (Schema::hasColumn('jobs', 'experience_level')) {
                DB::statement("ALTER TABLE jobs MODIFY experience_level VARCHAR(32) NOT NULL");
            }

            if (Schema::hasColumn('jobs', 'status')) {
                DB::statement("ALTER TABLE jobs MODIFY status VARCHAR(32) NOT NULL DEFAULT 'active'");
            }

            if (Schema::hasColumn('jobs', 'work_mode')) {
                DB::statement("ALTER TABLE jobs MODIFY work_mode VARCHAR(32) NULL");
            }

            if (Schema::hasColumn('jobs', 'interview_type')) {
                DB::statement("ALTER TABLE jobs MODIFY interview_type VARCHAR(32) NULL");
            }

            if (Schema::hasColumn('jobs', 'video_screening_requirement')) {
                DB::statement(
                    "ALTER TABLE jobs MODIFY video_screening_requirement VARCHAR(32) NOT NULL DEFAULT 'optional'"
                );
            }
        }

        if (Schema::hasTable('applications') && Schema::hasColumn('applications', 'status')) {
            DB::statement("ALTER TABLE applications MODIFY status VARCHAR(32) NOT NULL DEFAULT 'pending'");
        }
    }

    public function down(): void
    {
        // Enum restoration is intentionally omitted to avoid destructive rollbacks.
    }
};
