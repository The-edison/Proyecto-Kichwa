<?php

namespace App\Providers;

use App\Models\Usuario;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        if (config('database.default') !== 'pgsql') {
            throw new \RuntimeException('Yachay requiere PostgreSQL 16 o superior. SQLite no está soportado.');
        }
        ResetPassword::createUrlUsing(fn (Usuario $user, string $token) => rtrim(config('app.frontend_url'), '/').'/recuperar-contrasena?'.http_build_query(['token' => $token, 'email' => $user->correo_usuario]));
    }
}
