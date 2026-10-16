<?php

namespace Database\Seeders;

use App\Models\Actividad;
use App\Models\Tema;
use App\Models\Unidad;
use App\Services\EstadoContenido;
use App\Services\KichwaResource;
use App\Services\PublicacionContenido;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class UnidadUnoAudioSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            DB::select('SELECT pg_advisory_xact_lock(20261011)');
            $topic = Tema::where('clave_leccion', UnidadUnoGuiadaSeeder::LESSON_KEY)->firstOrFail();
            $unit = Unidad::whereKey($topic->id_unidad)->lockForUpdate()->firstOrFail();
            if (Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'u1-guided-missing-vowels-v1')->exists()) {
                return;
            }
            $exercise = ['type' => 'completar', 'prompt' => 'Escucha y escribe la vocal que falta en cada palabra.', 'resource' => null, 'zones' => [],
                'elements' => [['id' => 'audio1', 'texto' => 'sh_nku'], ['id' => 'audio2', 'texto' => 'p_rina'], ['id' => 'audio3', 'texto' => 'll_ma']],
                'solution' => ['textos' => ['audio1' => ['u'], 'audio2' => ['u'], 'audio3' => ['a']]],
                'config' => ['title' => 'La vocal que falta', 'presentation' => 'writing', 'listening_vowels' => true, 'managed' => true, 'reviewed' => true,
                    'difficulty' => 'inicial', 'correct_feedback' => 'Alli rurashka. Completaste las tres palabras correctamente.',
                    'incorrect_feedback' => 'Kutin rurapay. Escucha de nuevo y revisa las vocales.']];
            EstadoContenido::assertReady($exercise);
            $record = new Actividad(KichwaResource::attributes('exercises', $exercise));
            $record->id_unidad = $unit->id_unidad;
            $record->origen_reactivo = 'u1-guided-missing-vowels-v1';
            $record->orden_actividad = 1 + (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
            $record->publicado = true;
            $record->save();
        });
        PublicacionContenido::invalidate();
    }
}
