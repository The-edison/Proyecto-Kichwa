<?php

namespace Database\Seeders;

use App\Models\EvaluacionKichwa;
use App\Models\Modulo;
use App\Models\Pregunta;
use App\Models\Tema;
use App\Models\Unidad;
use App\Models\Usuario;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class UnidadUnoVerificacionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        if (! app()->environment('testing') || ! str_contains(DB::connection()->getDatabaseName(), 'unidad1_verificacion') || ! str_ends_with(DB::connection()->getDatabaseName(), '_test')) {
            throw new \RuntimeException('Este seeder sólo puede usarse en la base aislada de verificación de Unidad 1.');
        }
        $this->call([NivelSeeder::class, UnidadUnoSeeder::class]);
        Modulo::query()->update(['publicado' => true]);
        Unidad::query()->update(['publicado' => true]);
        Tema::query()->update(['publicado' => true]);
        foreach (Pregunta::all() as $question) {
            $config = $question->configuracion;
            if (($config['requires_audio'] ?? false) || ($config['requires_images'] ?? false)) {
                continue;
            }
            $config['reviewed'] = true;
            $question->update(['configuracion' => $config, 'publicado' => true]);
        }
        EvaluacionKichwa::query()->update(['publicado' => true]);
        foreach (['estudiante', 'administrador', 'concurrencia'] as $role) {
            $email = 'unidad1.'.$role.'@example.test';
            if (Usuario::where('correo_usuario', $email)->exists()) {
                continue;
            }
            $factory = Usuario::factory();
            if ($role === 'administrador') {
                $factory = $factory->administrador();
            }
            $factory->create(['nombre_usuario' => 'Verificación '.$role, 'correo_usuario' => $email, 'contrasena_usuario' => 'VerificacionUnidad#2026']);
        }
    }
}
