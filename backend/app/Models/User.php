<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens;

    public const ROLE_CANDIDATE = 'candidate';
    public const ROLE_RECRUITER = 'recruiter';
    public const ROLE_SUPERADMIN = 'superadmin';
    public const ALL_ROLES = [
        self::ROLE_CANDIDATE,
        self::ROLE_RECRUITER,
        self::ROLE_SUPERADMIN,
    ];
    public const PUBLIC_REGISTRATION_ROLES = [
        self::ROLE_CANDIDATE,
        self::ROLE_RECRUITER,
    ];

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'phone',
        'profile_picture',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    public static function normalizeEmail(?string $email): ?string
    {
        if ($email === null) {
            return null;
        }

        $normalizedEmail = mb_strtolower(trim($email));

        return $normalizedEmail === '' ? null : $normalizedEmail;
    }

    public static function normalizePhone(?string $phone): ?string
    {
        if ($phone === null) {
            return null;
        }

        $normalizedPhone = preg_replace('/[^\d+]/', '', trim($phone)) ?? '';

        return $normalizedPhone === '' ? null : $normalizedPhone;
    }

    public function setEmailAttribute(?string $value): void
    {
        $this->attributes['email'] = self::normalizeEmail($value);
    }

    public function setPhoneAttribute(?string $value): void
    {
        $this->attributes['phone'] = self::normalizePhone($value);
    }

    public function jobs()
    {
        return $this->hasMany(Job::class, 'recruiter_id');
    }

    public function applications()
    {
        return $this->hasMany(Application::class, 'candidate_id');
    }

    public function hasRole(string $role): bool
    {
        return $this->role === $role;
    }

    public function hasAnyRole(array $roles): bool
    {
        return in_array($this->role, $roles, true);
    }
}
