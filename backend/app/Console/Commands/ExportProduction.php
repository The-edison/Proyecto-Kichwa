<?php

namespace App\Console\Commands;

use App\Services\ProductionTransfer;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('yachay:export-production {destination : Ruta del ZIP privado a crear}')]
#[Description('Exporta contenido, diccionario y administradores, sin estudiantes ni historial')]
class ExportProduction extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(ProductionTransfer $transfer): int
    {
        $counts = $transfer->export($this->argument('destination'));
        $this->table(['Elemento', 'Cantidad'], collect($counts)->map(fn (int $count, string $name): array => [$name, $count])->all());
        $this->info('Exportación creada. Contiene hashes de contraseñas de administradores; mantenla privada.');

        return self::SUCCESS;
    }
}
