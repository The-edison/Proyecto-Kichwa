<?php

namespace Tests;

use App\Models\Modulo;
use App\Services\PublicacionContenido;
use Database\Seeders\NivelSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

trait UsesPostgreSQL
{
    use RefreshDatabase;

    protected function publishOnlyModule(int $module): void
    {
        Modulo::where('id_modulo', '<>', $module)->update(['publicado' => false]);
        PublicacionContenido::invalidate();
    }

    protected function migrateDatabases()
    {
        $this->artisan('migrate', ['--no-interaction' => true]);
        $this->seed(NivelSeeder::class);
    }
}
