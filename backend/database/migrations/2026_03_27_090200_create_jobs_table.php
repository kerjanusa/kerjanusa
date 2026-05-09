<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('jobs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('recruiter_id')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->text('description');
            $table->string('category');
            $table->unsignedInteger('salary_min');
            $table->unsignedInteger('salary_max');
            $table->string('location');
            $table->string('job_type', 32);
            $table->string('experience_level', 32);
            $table->string('status', 32)->default('active');
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index(['category', 'job_type', 'experience_level']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('jobs');
    }
};
