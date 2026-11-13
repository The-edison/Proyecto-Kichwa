<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([NivelSeeder::class, AdministradorSeeder::class, UnidadUnoGuiadaSeeder::class, UnidadDosGuiadaSeeder::class, UnidadesTematicasGuiadasSeeder::class, ModuloUnoEvaluacionSeeder::class]);
        if (DB::table('modulos')->join('niveles', 'niveles.id_nivel', '=', 'modulos.id_nivel')
            ->where('niveles.orden_nivel', 2)->where('modulos.orden_modulo', 1)->exists()) {
            $this->call(IntermedioModuloUnoCompletoSeeder::class);
        }
        $this->call(IntermedioModuloDosEjerciciosSeeder::class);
    }
}
