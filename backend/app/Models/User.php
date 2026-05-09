<?php

namespace App\Models;

use App\Notifications\ResetPasswordNotification;
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
    public const STATUS_ACTIVE = 'active';
    public const STATUS_SUSPENDED = 'suspended';
    public const ALL_ROLES = [
        self::ROLE_CANDIDATE,
        self::ROLE_RECRUITER,
        self::ROLE_SUPERADMIN,
    ];
    public const ACCOUNT_STATUSES = [
        self::STATUS_ACTIVE,
        self::STATUS_SUSPENDED,
    ];
    public const PUBLIC_REGISTRATION_ROLES = [
        self::ROLE_CANDIDATE,
        self::ROLE_RECRUITER,
    ];

    protected $fillable = [
        'name',
        'company_name',
        'email',
        'password',
        'role',
        'account_status',
        'account_status_reason',
        'phone',
        'profile_picture',
        'candidate_profile',
        'recruiter_profile',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'candidate_profile' => 'array',
        'recruiter_profile' => 'array',
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

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new ResetPasswordNotification($token));
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

    public function isActive(): bool
    {
        return $this->account_status !== self::STATUS_SUSPENDED;
    }

    public function hasAnyRole(array $roles): bool
    {
        return in_array($this->role, $roles, true);
    }
}
