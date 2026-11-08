<?php

namespace App\Console\Commands;

use App\Services\ProductionTransfer;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('yachay:import-production {source : Ruta del ZIP privado} {--confirm-new-database : Confirma la instalación en una base nueva}')]
#[Description('Importa contenido y administradores exclusivamente en una instalación nueva')]
class ImportProduction extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(ProductionTransfer $transfer): int
    {
        if (! $this->option('confirm-new-database')) {
            $this->error('Usa --confirm-new-database. La base debe tener solo las migraciones, sin db:seed.');

            return self::FAILURE;
        }
        $counts = $transfer->import($this->argument('source'));
        $this->table(['Elemento', 'Cantidad'], collect($counts)->map(fn (int $count, string $name): array => [$name, $count])->all());
        $this->info('Contenido y administradores importados. No se importaron estudiantes ni historial.');

        return self::SUCCESS;
    }
}
