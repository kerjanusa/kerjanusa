<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResetPasswordNotification extends Notification
{
    public function __construct(private readonly string $token)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $expireMinutes = (int) config('auth.passwords.'.config('auth.defaults.passwords').'.expire');
        $frontendUrl = rtrim((string) config('app.frontend_url', config('app.url')), '/');
        $resetUrl = sprintf(
            '%s/reset-password?token=%s&email=%s&role=%s',
            $frontendUrl,
            urlencode($this->token),
            urlencode((string) $notifiable->email),
            urlencode((string) $notifiable->role)
        );

        return (new MailMessage)
            ->subject('Reset Password KerjaNusa')
            ->greeting('Halo '.$notifiable->name.',')
            ->line('Kami menerima permintaan untuk mengatur ulang password akun KerjaNusa Anda.')
            ->action('Reset password', $resetUrl)
            ->line("Link ini berlaku selama {$expireMinutes} menit dan hanya dapat digunakan satu kali.")
            ->line('Jika Anda tidak meminta reset password, abaikan email ini dan password Anda akan tetap aman.');
    }
}
