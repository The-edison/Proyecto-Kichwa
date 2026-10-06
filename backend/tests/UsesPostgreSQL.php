<?php

namespace Tests;

use Database\Seeders\NivelSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

trait UsesPostgreSQL
{
    use RefreshDatabase;

    protected function migrateDatabases()
    {
        $this->artisan('migrate', ['--no-interaction' => true]);
        $this->seed(NivelSeeder::class);
    }
}
