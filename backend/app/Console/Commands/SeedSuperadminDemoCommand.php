<?php

namespace App\Console\Commands;

use Database\Seeders\SuperadminDemoSeeder;
use Illuminate\Console\Command;

class SeedSuperadminDemoCommand extends Command
{
    protected $signature = 'demo:seed-superadmin';

    protected $description = 'Seed realistic demo data for the superadmin dashboard without deleting existing records.';

    public function handle(): int
    {
        $this->info('Menjalankan realistic demo seeder untuk superadmin...');

        $this->call('db:seed', [
            '--class' => SuperadminDemoSeeder::class,
            '--force' => true,
        ]);

        $this->newLine();
        $this->info('Seeder selesai. Akun demo utama yang dibuat / diperbarui:');
        $this->line('- Superadmin: superadmin.demo@kerjanusa.test / password123');
        $this->line('- Recruiter demo: *.recruiter.demo.kerjanusa.test / password123');
        $this->line('- Candidate demo: *.candidate.demo.kerjanusa.test / password123');

        return self::SUCCESS;
    }
}
