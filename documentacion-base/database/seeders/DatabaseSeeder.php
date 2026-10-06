<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(NivelSeeder::class);
        // Demostración y administrador se ejecutan explícitamente; no hay contraseñas públicas.
    }
}
