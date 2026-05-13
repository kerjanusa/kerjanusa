<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('jobs', function (Blueprint $table) {
            if (!Schema::hasColumn('jobs', 'quiz_screening_questions')) {
                $table->json('quiz_screening_questions')
                    ->nullable()
                    ->after('video_screening_requirement');
            }
        });

        Schema::table('applications', function (Blueprint $table) {
            if (!Schema::hasColumn('applications', 'screening_answers')) {
                $table->json('screening_answers')
                    ->nullable()
                    ->after('cover_letter');
            }

            if (!Schema::hasColumn('applications', 'video_intro_url')) {
                $table->string('video_intro_url')
                    ->nullable()
                    ->after('screening_answers');
            }
        });
    }

    public function down(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            $columns = [
                'screening_answers',
                'video_intro_url',
            ];

            foreach ($columns as $column) {
                if (Schema::hasColumn('applications', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        Schema::table('jobs', function (Blueprint $table) {
            if (Schema::hasColumn('jobs', 'quiz_screening_questions')) {
                $table->dropColumn('quiz_screening_questions');
            }
        });
    }
};
