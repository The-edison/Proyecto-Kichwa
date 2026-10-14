<?php

namespace App\Providers;

use App\Models\Usuario;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        if (config('database.default') !== 'pgsql') {
            throw new \RuntimeException('Yachay requiere PostgreSQL 16 o superior. SQLite no está soportado.');
        }
        $resetUrl = fn (Usuario $user, string $token): string => rtrim(config('app.frontend_url'), '/').'/recuperar-contrasena?'.http_build_query(['token' => $token, 'email' => $user->correo_usuario]);
        ResetPassword::createUrlUsing($resetUrl);
        ResetPassword::toMailUsing(fn (Usuario $user, string $token): MailMessage => (new MailMessage)
            ->subject('Recupera tu contraseña de Yachay')
            ->greeting('Hola')
            ->line('Recibimos una solicitud para cambiar la contraseña de tu cuenta en Yachay.')
            ->action('Crear una nueva contraseña', $resetUrl($user, $token))
            ->line('Este enlace vence en '.config('auth.passwords.users.expire').' minutos y solo se puede usar una vez.')
            ->line('Si no solicitaste este cambio, puedes ignorar este mensaje. Tu contraseña seguirá siendo la misma.')
            ->salutation('Equipo Yachay'));
    }
}
