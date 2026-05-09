<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement(
            "ALTER TABLE users MODIFY role ENUM('candidate', 'recruiter', 'superadmin') NOT NULL DEFAULT 'candidate'"
        );
    }

    public function down(): void
    {
        DB::table('users')
            ->where('role', User::ROLE_SUPERADMIN)
            ->update(['role' => User::ROLE_RECRUITER]);

        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement(
            "ALTER TABLE users MODIFY role ENUM('candidate', 'recruiter') NOT NULL DEFAULT 'candidate'"
        );
    }
};
