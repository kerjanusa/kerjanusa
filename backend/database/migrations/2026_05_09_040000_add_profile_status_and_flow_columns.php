<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('company_name')->nullable()->after('name');
            $table->string('account_status', 32)->default('active')->after('role');
            $table->text('account_status_reason')->nullable()->after('account_status');
            $table->json('candidate_profile')->nullable()->after('profile_picture');
            $table->json('recruiter_profile')->nullable()->after('candidate_profile');
        });

        Schema::table('jobs', function (Blueprint $table) {
            $table->string('workflow_status', 32)->default('active')->after('status');
        });

        Schema::table('applications', function (Blueprint $table) {
            $table->string('stage', 32)->default('applied')->after('status');
        });

        DB::table('users')
            ->where('role', 'recruiter')
            ->whereNull('company_name')
            ->update([
                'company_name' => DB::raw('name'),
            ]);

        DB::table('jobs')
            ->where('status', 'active')
            ->update(['workflow_status' => 'active']);

        DB::table('jobs')
            ->where('status', '!=', 'active')
            ->update(['workflow_status' => 'draft']);

        DB::table('applications')
            ->where('status', 'accepted')
            ->update(['stage' => 'shortlisted']);

        DB::table('applications')
            ->where('status', 'rejected')
            ->update(['stage' => 'rejected']);

        DB::table('applications')
            ->where('status', 'withdrawn')
            ->update(['stage' => 'withdrawn']);

        DB::table('applications')
            ->where('status', 'pending')
            ->update(['stage' => 'applied']);
    }

    public function down(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            $table->dropColumn('stage');
        });

        Schema::table('jobs', function (Blueprint $table) {
            $table->dropColumn('workflow_status');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'company_name',
                'account_status',
                'account_status_reason',
                'candidate_profile',
                'recruiter_profile',
            ]);
        });
    }
};
