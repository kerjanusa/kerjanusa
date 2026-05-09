<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('jobs', function (Blueprint $table) {
            if (!Schema::hasColumn('jobs', 'work_mode')) {
                $table->string('work_mode', 32)->nullable()->after('job_type');
            }

            if (!Schema::hasColumn('jobs', 'openings_count')) {
                $table->unsignedInteger('openings_count')->default(0)->after('work_mode');
            }

            if (!Schema::hasColumn('jobs', 'interview_type')) {
                $table->string('interview_type', 32)->nullable()->after('openings_count');
            }

            if (!Schema::hasColumn('jobs', 'interview_note')) {
                $table->text('interview_note')->nullable()->after('interview_type');
            }

            if (!Schema::hasColumn('jobs', 'video_screening_requirement')) {
                $table->string('video_screening_requirement', 32)
                    ->default('optional')
                    ->after('interview_note');
            }
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE jobs MODIFY experience_level VARCHAR(32) NOT NULL");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::table('jobs')
                ->where('experience_level', 'junior')
                ->update(['experience_level' => 'entry']);

            DB::statement("ALTER TABLE jobs MODIFY experience_level ENUM('entry', 'mid', 'senior') NOT NULL");
        }

        Schema::table('jobs', function (Blueprint $table) {
            $columns = [
                'work_mode',
                'openings_count',
                'interview_type',
                'interview_note',
                'video_screening_requirement',
            ];

            foreach ($columns as $column) {
                if (Schema::hasColumn('jobs', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
