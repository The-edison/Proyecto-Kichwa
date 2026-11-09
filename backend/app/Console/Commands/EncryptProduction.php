<?php

namespace App\Console\Commands;

use Dotenv\Dotenv;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Encryption\Encrypter;
use RuntimeException;

#[Signature('yachay:encrypt-production {source : ZIP privado} {destination : Archivo cifrado a crear} {environment : Archivo privado dokploy.env}')]
#[Description('Cifra el paquete de traslado con la APP_KEY de producción, sin publicar esa clave')]
class EncryptProduction extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $destination = $this->argument('destination');
        if (file_exists($destination)) {
            throw new RuntimeException('El archivo destino ya existe. Elige otro nombre.');
        }
        $environment = Dotenv::parse(file_get_contents($this->argument('environment')));
        $key = $environment['APP_KEY'] ?? '';
        if (str_starts_with($key, 'base64:')) {
            $key = base64_decode(substr($key, 7), true);
        }
        if (! is_string($key) || ! Encrypter::supported($key, 'AES-256-CBC')) {
            throw new RuntimeException('El archivo privado no contiene una APP_KEY válida de producción.');
        }
        $encrypted = (new Encrypter($key, 'AES-256-CBC'))->encryptString(file_get_contents($this->argument('source')));
        if (file_put_contents($destination, $encrypted, LOCK_EX) === false) {
            throw new RuntimeException('No se pudo escribir el paquete cifrado.');
        }
        $this->info('Paquete cifrado creado. La clave no se incluyó en el archivo.');

        return self::SUCCESS;
    }
}
