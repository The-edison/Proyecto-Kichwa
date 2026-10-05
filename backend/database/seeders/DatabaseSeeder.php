<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $cedula = env('ADMIN_CEDULA');
        $email = env('ADMIN_EMAIL');
        $password = env('ADMIN_PASSWORD');

        if (! $cedula || ! $email || ! $password) {
            $this->command?->warn('Administrador no creado: configura ADMIN_CEDULA, ADMIN_EMAIL y ADMIN_PASSWORD.');
            return;
        }

        User::updateOrCreate(
            ['cedula' => $cedula],
            [
                'name' => env('ADMIN_NAME', 'Administrador'),
                'email' => $email,
                'password' => $password,
                'role_id' => Role::where('code', 'admin')->firstOrFail()->id,
            ],
        );
    }
}
