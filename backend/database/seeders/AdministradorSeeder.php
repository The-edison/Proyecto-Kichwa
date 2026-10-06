<?php

namespace Database\Seeders;

use App\Models\Usuario;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AdministradorSeeder extends Seeder
{
    public const LOCAL_PASSWORD = 'YachayLocal#2026';

    public function run(): void
    {
        $local = app()->environment('local', 'testing');
        $password = config('kichwa.admin_password') ?: ($local ? self::LOCAL_PASSWORD : '');
        $email = mb_strtolower(trim((string) config('kichwa.admin_email')));
        $name = trim((string) config('kichwa.admin_nombre'));
        if ((! $local && ($password === self::LOCAL_PASSWORD || str_ends_with($email, '.test'))) || strlen($password) < 12 || strlen($password) > 72 || str_contains($password, "\0") || ! filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254 || $name === '' || mb_strlen($name) > 150) {
            throw new \RuntimeException('Configure KICHWA_ADMIN_EMAIL y una contraseña propia de al menos 12 caracteres.');
        }
        DB::transaction(function () use ($email, $password): void {
            DB::select('SELECT pg_advisory_xact_lock(20260930)');
            $existing = Usuario::where('correo_usuario', $email)->first();
            if ($existing) {
                if ($existing->rol_usuario !== 'administrador') {
                    throw new \RuntimeException('El correo pertenece a un estudiante; no se eleva su rol.');
                }

                return;
            }
            $user = new Usuario;
            $user->nombre_usuario = config('kichwa.admin_nombre');
            $user->correo_usuario = $email;
            $user->contrasena_usuario = $password;
            $user->rol_usuario = 'administrador';
            $user->debe_cambiar_contrasena = true;
            $user->save();
        });
    }
}
