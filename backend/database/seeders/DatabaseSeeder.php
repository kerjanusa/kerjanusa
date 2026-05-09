<?php

namespace Database\Seeders;

use App\Models\Application;
use App\Models\Job;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $demoPassword = 'password123';

        $recruiter = User::updateOrCreate(
            ['email' => 'recruiter@example.com'],
            [
                'name' => 'Recruiter Demo',
                'password' => Hash::make($demoPassword),
                'role' => User::ROLE_RECRUITER,
                'phone' => '081234567890',
            ]
        );

        $candidate = User::updateOrCreate(
            ['email' => 'candidate@example.com'],
            [
                'name' => 'Candidate Demo',
                'password' => Hash::make($demoPassword),
                'role' => User::ROLE_CANDIDATE,
                'phone' => '089876543210',
            ]
        );

        User::updateOrCreate(
            ['email' => 'superadmin@kerjanusa.com'],
            [
                'name' => 'Superadmin KerjaNusa',
                'password' => Hash::make($demoPassword),
                'role' => User::ROLE_SUPERADMIN,
                'phone' => '081122334455',
            ]
        );

        $backendJob = Job::updateOrCreate(
            ['title' => 'Backend Developer', 'recruiter_id' => $recruiter->id],
            [
                'description' => 'Bangun REST API Laravel, optimasi query, dan integrasi sistem internal.',
                'category' => 'Technology',
                'salary_min' => 5000000,
                'salary_max' => 9000000,
                'location' => 'Jakarta Pusat',
                'job_type' => 'full-time',
                'experience_level' => 'mid',
                'status' => 'active',
            ]
        );

        Job::updateOrCreate(
            ['title' => 'Product Designer', 'recruiter_id' => $recruiter->id],
            [
                'description' => 'Rancang alur produk dan desain antarmuka digital untuk web dan mobile.',
                'category' => 'Design',
                'salary_min' => 5500000,
                'salary_max' => 8500000,
                'location' => 'Jakarta Barat',
                'job_type' => 'full-time',
                'experience_level' => 'mid',
                'status' => 'active',
            ]
        );

        Job::updateOrCreate(
            ['title' => 'HR Generalist', 'recruiter_id' => $recruiter->id],
            [
                'description' => 'Kelola proses rekrutmen, administrasi karyawan, dan koordinasi kebutuhan hiring tim.',
                'category' => 'Human Resources',
                'salary_min' => 4500000,
                'salary_max' => 7000000,
                'location' => 'Jakarta Selatan',
                'job_type' => 'full-time',
                'experience_level' => 'entry',
                'status' => 'active',
            ]
        );

        Job::updateOrCreate(
            ['title' => 'Operations Admin', 'recruiter_id' => $recruiter->id],
            [
                'description' => 'Bantu operasional harian, rekap data, dan koordinasi lintas tim untuk kebutuhan administrasi.',
                'category' => 'Operations',
                'salary_min' => 4000000,
                'salary_max' => 6500000,
                'location' => 'Jakarta Timur',
                'job_type' => 'full-time',
                'experience_level' => 'entry',
                'status' => 'active',
            ]
        );

        Job::updateOrCreate(
            ['title' => 'Sales Supervisor', 'recruiter_id' => $recruiter->id],
            [
                'description' => 'Memimpin aktivitas penjualan area dan memastikan target bulanan tim tercapai.',
                'category' => 'Sales',
                'salary_min' => 6000000,
                'salary_max' => 9500000,
                'location' => 'Jakarta Utara',
                'job_type' => 'full-time',
                'experience_level' => 'senior',
                'status' => 'active',
            ]
        );

        Job::updateOrCreate(
            ['title' => 'Frontend Developer', 'recruiter_id' => $recruiter->id],
            [
                'description' => 'Kembangkan antarmuka React yang responsif dan terhubung rapi ke API backend.',
                'category' => 'Technology',
                'salary_min' => 4500000,
                'salary_max' => 8000000,
                'location' => 'Bandung',
                'job_type' => 'full-time',
                'experience_level' => 'entry',
                'status' => 'active',
            ]
        );

        Job::updateOrCreate(
            ['title' => 'UI Designer', 'recruiter_id' => $recruiter->id],
            [
                'description' => 'Desain alur dan visual produk digital untuk web dan aplikasi mobile.',
                'category' => 'Design',
                'salary_min' => 4000000,
                'salary_max' => 7000000,
                'location' => 'Surabaya',
                'job_type' => 'contract',
                'experience_level' => 'mid',
                'status' => 'active',
            ]
        );

        Job::updateOrCreate(
            ['title' => 'Customer Service Bogor Kota', 'recruiter_id' => $recruiter->id],
            [
                'description' => 'Layani kebutuhan pelanggan, tindak lanjuti komplain, dan jaga kualitas layanan cabang kota Bogor.',
                'category' => 'Customer Service',
                'salary_min' => 3800000,
                'salary_max' => 5500000,
                'location' => 'Bogor Kota',
                'job_type' => 'full-time',
                'experience_level' => 'entry',
                'status' => 'active',
            ]
        );

        Job::updateOrCreate(
            ['title' => 'Warehouse Staff Kabupaten Bogor', 'recruiter_id' => $recruiter->id],
            [
                'description' => 'Kelola stok gudang, proses inbound outbound barang, dan pastikan data inventori selalu akurat.',
                'category' => 'Operations',
                'salary_min' => 4000000,
                'salary_max' => 6200000,
                'location' => 'Kabupaten Bogor',
                'job_type' => 'full-time',
                'experience_level' => 'entry',
                'status' => 'active',
            ]
        );

        Job::updateOrCreate(
            ['title' => 'Marketing Executive Kemang Bogor', 'recruiter_id' => $recruiter->id],
            [
                'description' => 'Jalankan promosi area Kemang Bogor, bangun relasi komunitas, dan bantu peningkatan penjualan lokal.',
                'category' => 'Marketing',
                'salary_min' => 4500000,
                'salary_max' => 7000000,
                'location' => 'Kemang, Kabupaten Bogor',
                'job_type' => 'full-time',
                'experience_level' => 'mid',
                'status' => 'active',
            ]
        );

        Job::updateOrCreate(
            ['title' => 'Admin Operasional Parung Bogor', 'recruiter_id' => $recruiter->id],
            [
                'description' => 'Bantu administrasi operasional cabang Parung, olah laporan harian, dan koordinasi kebutuhan tim lapangan.',
                'category' => 'Operations',
                'salary_min' => 3900000,
                'salary_max' => 5800000,
                'location' => 'Parung, Kabupaten Bogor',
                'job_type' => 'full-time',
                'experience_level' => 'entry',
                'status' => 'active',
            ]
        );

        Application::updateOrCreate(
            [
                'job_id' => $backendJob->id,
                'candidate_id' => $candidate->id,
            ],
            [
                'status' => 'pending',
                'cover_letter' => 'Saya tertarik dengan posisi ini dan siap bergabung secepatnya.',
                'applied_at' => now()->subDays(2),
            ]
        );
    }
}
