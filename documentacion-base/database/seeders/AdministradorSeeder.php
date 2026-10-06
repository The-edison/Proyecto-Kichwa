<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AdministradorSeeder extends Seeder
{
    public function run(): void
    {
        $email = strtolower(trim((string) config('kichwa.admin_email')));
        $nombre = trim((string) config('kichwa.admin_nombre'));
        $password = (string) config('kichwa.admin_password');
        if (! filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254 ||
            $nombre === '' || mb_strlen($nombre) > 150 || mb_strlen($password) < 12) {
            throw new \RuntimeException('Configure KICHWA_ADMIN_EMAIL, KICHWA_ADMIN_NOMBRE y KICHWA_ADMIN_PASSWORD (mínimo 12 caracteres).');
        }
        DB::transaction(function () use ($email, $nombre, $password): void {
            DB::select('SELECT pg_advisory_xact_lock(20260930)');
            $existing = DB::table('usuarios')->where('correo_usuario', $email)->first();
            if ($existing) {
                if ($existing->rol_usuario !== 'administrador') {
                    throw new \RuntimeException('El correo ya corresponde a un estudiante; no se eleva su rol.');
                }
                return; // No restablece la contraseña ni desbloquea cuentas existentes.
            }
            DB::table('usuarios')->insert([
                'nombre_usuario' => $nombre,
                'correo_usuario' => $email,
                'contrasena_usuario' => Hash::make($password),
                'rol_usuario' => 'administrador',
                'estado_usuario' => 'activo',
            ]);
        });
    }
}
