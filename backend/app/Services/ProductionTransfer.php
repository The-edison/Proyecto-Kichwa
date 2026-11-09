<?php

namespace App\Services;

use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use ZipArchive;

class ProductionTransfer
{
    public const TABLES = [
        'usuarios', 'niveles', 'modulos', 'unidades', 'temas', 'actividades', 'evaluaciones', 'preguntas', 'diccionario',
        'roles', 'levels', 'modules', 'units', 'contents', 'exercises', 'evaluations', 'evaluation_questions',
    ];

    public const PRIVATE_TABLES = [
        'users', 'usuarios_niveles', 'progreso', 'respuestas_actividad', 'intentos_evaluacion', 'respuestas_evaluacion',
        'recompensas', 'exercise_attempts', 'evaluation_attempts', 'evaluation_attempt_answers', 'progress',
        'testimonials', 'sessions', 'personal_access_tokens', 'password_reset_tokens', 'jobs', 'failed_jobs', 'job_batches',
    ];

    /** @return array<string, int> */
    public function export(string $destination): array
    {
        if (file_exists($destination)) {
            throw new RuntimeException('El archivo destino ya existe. Elige otro nombre.');
        }
        $tables = DB::transaction(function (): array {
            if (DB::transactionLevel() === 1) {
                DB::statement('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
            }
            $tables = [];
            foreach (self::TABLES as $table) {
                $query = DB::table($table);
                if ($table === 'usuarios') {
                    $query->where('rol_usuario', 'administrador');
                }
                $tables[$table] = $query->get()->map(function (object $row) use ($table): array {
                    $values = (array) $row;
                    if ($table === 'usuarios') {
                        $values['remember_token'] = null;
                    }

                    return $values;
                })->all();
            }

            return $tables;
        });
        if (empty($tables['usuarios'])) {
            throw new RuntimeException('No hay administradores para transferir.');
        }
        $media = [];
        foreach (Storage::disk('public')->allFiles('kichwa') as $path) {
            if ($this->allowedMedia($path)) {
                $media[] = $path;
            }
        }
        foreach ($tables['usuarios'] as $admin) {
            $avatar = $admin['avatar_usuario'] ?? '';
            if ($this->allowedMedia($avatar) && Storage::disk('public')->exists($avatar)) {
                $media[] = $avatar;
            }
        }
        $media = array_values(array_unique($media));
        $archive = new ZipArchive;
        if ($archive->open($destination, ZipArchive::CREATE | ZipArchive::EXCL) !== true) {
            throw new RuntimeException('No se pudo crear el archivo ZIP.');
        }
        try {
            $archive->addFromString('database.json', json_encode([
                'format' => 'yachay-production-v1',
                'source_url' => rtrim(config('app.url'), '/'),
                'migrations' => DB::table('migrations')->orderBy('migration')->pluck('migration')->all(),
                'tables' => $tables,
            ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            foreach ($media as $path) {
                if (! $archive->addFile(Storage::disk('public')->path($path), 'media/'.$path)) {
                    throw new RuntimeException('No se pudo incluir un archivo multimedia.');
                }
            }
        } finally {
            $closed = $archive->close();
        }
        if (! $closed) {
            throw new RuntimeException('No se pudo finalizar el archivo ZIP.');
        }
        @chmod($destination, 0600);

        return [...array_map(count(...), $tables), 'media_files' => count($media)];
    }

    /** @return array<string, int> */
    public function import(string $source): array
    {
        $archive = new ZipArchive;
        if ($archive->open($source, ZipArchive::RDONLY) !== true) {
            throw new RuntimeException('No se pudo abrir el archivo ZIP.');
        }
        try {
            $json = $archive->getFromName('database.json');
            if ($json === false) {
                throw new RuntimeException('El ZIP no contiene database.json.');
            }
            $payload = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
            $tables = $payload['tables'] ?? [];
            if (($payload['format'] ?? '') !== 'yachay-production-v1' || array_keys($tables) !== self::TABLES) {
                throw new RuntimeException('Formato o tablas de transferencia no permitidos.');
            }
            if (($payload['migrations'] ?? []) !== DB::table('migrations')->orderBy('migration')->pluck('migration')->all()) {
                throw new RuntimeException('Las migraciones de origen y destino deben coincidir. Despliega la misma versión y ejecuta migrate.');
            }
            if (empty($tables['usuarios'])) {
                throw new RuntimeException('El paquete no contiene administradores.');
            }
            foreach ($tables['usuarios'] as $admin) {
                if (($admin['rol_usuario'] ?? '') !== 'administrador' || ! empty($admin['remember_token'])) {
                    throw new RuntimeException('El paquete contiene estudiantes o tokens no permitidos.');
                }
            }
            $media = [];
            for ($index = 0; $index < $archive->numFiles; $index++) {
                $name = $archive->getNameIndex($index);
                if ($name === 'database.json') {
                    continue;
                }
                if (! str_starts_with($name, 'media/') || ! $this->allowedMedia(substr($name, 6))) {
                    throw new RuntimeException('El paquete contiene una ruta multimedia no permitida.');
                }
                $media[] = substr($name, 6);
            }
            DB::transaction(function () use ($tables, $archive, $media, $payload): void {
                $allTables = [...self::TABLES, ...self::PRIVATE_TABLES, 'cache', 'cache_locks'];
                $quoted = implode(', ', array_map(fn (string $table): string => '"'.$table.'"', $allTables));
                DB::statement('LOCK TABLE '.$quoted.' IN ACCESS EXCLUSIVE MODE');
                foreach ($allTables as $table) {
                    if (! in_array($table, ['niveles', 'roles', 'levels', 'sessions', 'cache', 'cache_locks'], true) && DB::table($table)->exists()) {
                        throw new RuntimeException('La importación requiere una base nueva sin usuarios, contenido ni sesiones. Tabla ocupada: '.$table.'. No se modificó la base.');
                    }
                }
                foreach (['sessions', 'cache', 'cache_locks'] as $table) {
                    DB::table($table)->delete();
                }
                foreach (array_reverse(self::TABLES) as $table) {
                    DB::table($table)->delete();
                }
                foreach (self::TABLES as $table) {
                    foreach (array_chunk($tables[$table], 100) as $rows) {
                        DB::table($table)->insert($this->rewriteMediaUrls($rows, $payload['source_url'] ?? ''));
                    }
                    foreach (Schema::getColumns($table) as $column) {
                        $sequence = DB::selectOne('SELECT pg_get_serial_sequence(?, ?) AS name', [$table, $column['name']])->name;
                        if ($sequence !== null) {
                            $max = DB::table($table)->max($column['name']);
                            DB::select('SELECT setval(?::regclass, ?, ?)', [$sequence, $max ?? 1, $max !== null]);
                        }
                    }
                }
                foreach ($media as $path) {
                    $stream = $archive->getStream('media/'.$path);
                    if ($stream === false) {
                        throw new RuntimeException('No se pudo leer un archivo multimedia.');
                    }
                    try {
                        if (! Storage::disk('public')->put($path, $stream)) {
                            throw new RuntimeException('No se pudo escribir un archivo multimedia.');
                        }
                    } finally {
                        fclose($stream);
                    }
                }
            });

            return [...array_map(count(...), $tables), 'media_files' => count($media)];
        } finally {
            $archive->close();
        }
    }

    /** @return array<string, int> */
    public function importEncrypted(string $source): array
    {
        $bytes = Crypt::decryptString(file_get_contents($source));
        $disk = Storage::disk('local');
        $temporary = 'production-transfer-'.Str::uuid().'.zip';
        try {
            if (! $disk->put($temporary, $bytes)) {
                throw new RuntimeException('No se pudo preparar el paquete en el almacenamiento privado.');
            }

            return $this->import($disk->path($temporary));
        } finally {
            $disk->delete($temporary);
        }
    }

    private function allowedMedia(string $path): bool
    {
        return preg_match('#^(kichwa/(imagenes|audio)/[a-zA-Z0-9]+\.(png|jpg|jpeg|webp|mp3|wav|ogg|m4a|mp4)|avatars/[a-f0-9]{40}\.webp)$#', $path) === 1;
    }

    /** @param array<int, array<string, mixed>> $rows
     * @return array<int, array<string, mixed>>
     */
    private function rewriteMediaUrls(array $rows, string $sourceUrl): array
    {
        if ($sourceUrl === '' || $sourceUrl === rtrim(config('app.url'), '/')) {
            return $rows;
        }
        foreach ($rows as &$row) {
            foreach ($row as &$value) {
                if (is_string($value)) {
                    foreach (['/api/media/', '/storage/'] as $prefix) {
                        $value = str_replace($sourceUrl.$prefix, rtrim(config('app.url'), '/').$prefix, $value);
                    }
                }
            }
        }

        return $rows;
    }
}
