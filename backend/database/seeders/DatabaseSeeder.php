<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([NivelSeeder::class, AdministradorSeeder::class, UnidadUnoGuiadaSeeder::class, UnidadDosGuiadaSeeder::class, UnidadesTematicasGuiadasSeeder::class, ModuloDosNaturalezaVerbosSeeder::class, ModuloUnoEvaluacionSeeder::class, ModuloDosEvaluacionSeeder::class, IntermedioFundamentosSeeder::class, IntermedioMorfemasSeeder::class, IntermedioMorfemasEjerciciosSeeder::class, IntermedioTiemposSeeder::class, IntermedioTiemposEjerciciosSeeder::class, IntermedioAnalisisVerbalSeeder::class, IntermedioAnalisisVerbalEjerciciosSeeder::class, IntermedioDialogosSeeder::class, IntermedioDialogosEjerciciosSeeder::class, IntermedioPracticaSeeder::class, IntermedioModuloDosEvaluacionSeeder::class]);
    }
}
