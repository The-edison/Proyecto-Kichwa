<?php

namespace Tests;

use Database\Seeders\NivelSeeder;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected $seed = true;

    protected $seeder = NivelSeeder::class;

    public function createApplication(): Application
    {
        $app = parent::createApplication();
        $database = $app['config']->get('database.connections.pgsql.database');
        if (! $app->environment('testing') || ! str_ends_with((string) $database, '_test')) {
            throw new \RuntimeException('Las pruebas requieren una base separada cuyo nombre termine en _test.');
        }

        return $app;
    }
}
