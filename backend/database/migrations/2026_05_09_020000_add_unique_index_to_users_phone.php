<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('users') || !Schema::hasColumn('users', 'phone')) {
            return;
        }

        DB::table('users')
            ->where('phone', '')
            ->update(['phone' => null]);

        Schema::table('users', function (Blueprint $table) {
            $table->unique('phone');
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('users')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique('users_phone_unique');
        });
    }
};
