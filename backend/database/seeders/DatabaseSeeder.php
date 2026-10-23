<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([NivelSeeder::class, AdministradorSeeder::class, UnidadUnoGuiadaSeeder::class, UnidadDosGuiadaSeeder::class, UnidadesTematicasGuiadasSeeder::class, ModuloUnoEvaluacionSeeder::class, IntermedioMorfemasSeeder::class, IntermedioTiemposSeeder::class, IntermedioAnalisisVerbalSeeder::class, IntermedioDialogosSeeder::class]);
    }
}
