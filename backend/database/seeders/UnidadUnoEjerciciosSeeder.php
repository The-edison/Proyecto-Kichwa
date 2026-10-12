<?php

namespace Database\Seeders;

use App\Models\Actividad;
use App\Models\EvaluacionKichwa;
use App\Models\IntentoEvaluacion;
use App\Models\Modulo;
use App\Models\Nivel;
use App\Models\Pregunta;
use App\Models\Tema;
use App\Models\Unidad;
use App\Services\ContratoEjercicio;
use App\Services\EstadoContenido;
use App\Services\KichwaResource;
use App\Services\PublicacionContenido;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class UnidadUnoEjerciciosSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->call(UnidadUnoSeeder::class);
        DB::transaction(function (): void {
            DB::select('SELECT pg_advisory_xact_lock(20261011)');
            $origins = ['u1-practica-consonantes-completas', 'u1-practica-ts'];
            foreach (range(1, 3) as $lesson) {
                foreach (range(1, 10) as $number) {
                    $origins[] = 'practice:u1-l'.$lesson.'-r'.$number;
                }
            }
            if (Actividad::whereIn('origen_reactivo', $origins)->distinct()->count('origen_reactivo') === count($origins)) {
                return;
            }
            foreach (range(1, 4) as $lesson) {
                $topic = Tema::where('clave_leccion', 'basico-modulo1-unidad1-leccion'.$lesson)->firstOrFail();
                $evaluation = EvaluacionKichwa::where('id_tema', $topic->id_tema)->orderBy('id_evaluacion')->firstOrFail();
                $used = IntentoEvaluacion::where('id_evaluacion', $evaluation->id_evaluacion)->exists();
                foreach (Pregunta::where('id_evaluacion', $evaluation->id_evaluacion)->whereNotNull('origen_reactivo')->orderBy('orden_pregunta')->get() as $question) {
                    $exercise = KichwaResource::present('questions', $question, true);
                    ContratoEjercicio::validate($exercise);
                    if (! $used) {
                        $question->update(['configuracion' => array_replace($question->configuracion, ['reviewed' => true]), 'publicado' => true]);
                    }
                    if ($lesson < 4) {
                        $this->practice($topic, 'practice:'.$question->origen_reactivo, $exercise);
                    }
                }
                if ($lesson === 2) {
                    $consonants = ['CH', 'H', 'K', 'L', 'LL', 'M', 'N', 'Ñ', 'P', 'R', 'S', 'SH', 'T', 'W', 'Y'];
                    $this->practice($topic, 'u1-practica-consonantes-completas', $this->selection('Selecciona las quince consonantes principales del documento.', array_merge($consonants, ['A', 'I', 'U', 'TS']), range(0, 14), 'Las quince consonantes principales son '.implode(', ', $consonants).'. TS es complementaria.'));
                    $this->practice($topic, 'u1-practica-ts', $this->selection('Selecciona los dos ejemplos del documento que utilizan TS.', ['tsalik', 'tsuntsu', 'Wasi', 'Sisa'], [0, 1], 'El documento presenta tsalik y tsuntsu como ejemplos de palabras originarias o antiguas con TS.'));
                }
                $topic->update(['publicado' => true]);
                $unit = Unidad::whereKey($topic->id_unidad)->lockForUpdate()->firstOrFail();
                $unit->update(['publicado' => true]);
                $module = Modulo::findOrFail($unit->id_modulo);
                $module->update(['publicado' => true]);
                Nivel::whereKey($module->id_nivel)->update(['publicado' => true]);
                if (EstadoContenido::eligible($evaluation->id_evaluacion)->count() < 10) {
                    throw new \RuntimeException('La lección no dispone de diez preguntas válidas. No se publica una entrega incompleta.');
                }
                $evaluation->update(['publicado' => true]);
            }
        });
        PublicacionContenido::invalidate();
    }

    private function practice(Tema $topic, string $origin, array $exercise): void
    {
        if (Actividad::where('origen_reactivo', $origin)->exists()) {
            return;
        }
        $exercise['config'] = array_replace($exercise['config'] ?? [], ['managed' => true, 'reviewed' => true]);
        EstadoContenido::assertReady($exercise);
        unset($exercise['id']);
        $practice = new Actividad(KichwaResource::attributes('exercises', $exercise + ['unit_id' => $topic->id_unidad]));
        $practice->id_tema = $topic->id_tema;
        Unidad::whereKey($topic->id_unidad)->lockForUpdate()->firstOrFail();
        $practice->orden_actividad = 1 + (int) Actividad::where('id_unidad', $topic->id_unidad)->max('orden_actividad');
        $practice->publicado = true;
        $practice->origen_reactivo = $origin;
        $practice->save();
    }

    private function selection(string $prompt, array $options, array $correct, string $explanation): array
    {
        return ['type' => 'seleccion_multiple', 'prompt' => $prompt,
            'elements' => array_map(fn ($text, $id) => ['id' => 'e'.$id, 'texto' => $text], $options, array_keys($options)),
            'zones' => [], 'resource' => null, 'solution' => ['seleccion' => array_map(fn ($id) => 'e'.$id, $correct)],
            'config' => ['managed' => true, 'reviewed' => true, 'max_selections' => count($correct), 'exact_selections' => true, 'explanation' => $explanation]];
    }
}
