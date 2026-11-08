<?php

namespace Database\Seeders;

use App\Models\EvaluacionKichwa;
use App\Models\Modulo;
use App\Models\Nivel;
use App\Models\Pregunta;
use App\Models\Unidad;
use App\Services\EstadoContenido;
use App\Services\KichwaResource;
use App\Services\PublicacionContenido;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class IntermedioModuloDosEvaluacionSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            DB::select('SELECT pg_advisory_xact_lock(20261112)');
            $level = Nivel::where('orden_nivel', 2)->firstOrFail();
            $module = Modulo::where('id_nivel', $level->id_nivel)->where('orden_modulo', 2)->firstOrFail();
            if (EvaluacionKichwa::where('id_modulo', $module->id_modulo)->where('configuracion->bank_key', 'intermedio-modulo2-final-v6')->exists()) {
                return;
            }
            $units = Unidad::where('id_modulo', $module->id_modulo)->whereBetween('orden_unidad', [1, 4])->orderBy('orden_unidad')->get();
            if ($units->count() !== 4) {
                throw new \RuntimeException('Crea las cuatro unidades del módulo 2 intermedio antes de cargar su prueba final.');
            }
            $evaluation = EvaluacionKichwa::create(['id_modulo' => $module->id_modulo, 'id_unidad' => null, 'id_tema' => null,
                'titulo_evaluacion' => 'Prueba final del módulo 2 · Nivel intermedio', 'tipo_evaluacion' => 'modulo', 'publicado' => false,
                'configuracion' => ['managed' => true, 'final' => true, 'question_count' => 20, 'pass_percentage' => 80,
                    'bank_key' => 'intermedio-modulo2-final-v6', 'prerequisite_units' => $units->modelKeys()]]);
            foreach ($this->questions() as $index => [$unit, $prompt, $options, $correct, $explanation]) {
                $choices = [];
                foreach ($options as $position => $option) {
                    $choices[] = ['id' => 'opcion-'.($position + 1), 'texto' => $option];
                }
                $data = ['type' => 'seleccion_multiple', 'prompt' => $prompt, 'elements' => $choices, 'zones' => [], 'resource' => null,
                    'solution' => ['seleccion' => array_map(fn (int $position): string => 'opcion-'.($position + 1), $correct)],
                    'config' => ['managed' => true, 'reviewed' => true, 'max_selections' => count($correct), 'exact_selections' => true,
                        'title' => 'Unidad '.$unit.' · '.$units[$unit - 1]->titulo_unidad,
                        'correct_feedback' => 'Correcto. '.$explanation, 'incorrect_feedback' => 'Repasa esta idea: '.$explanation]];
                EstadoContenido::assertReady($data);
                $question = new Pregunta(KichwaResource::attributes('questions', $data));
                $question->id_evaluacion = $evaluation->id_evaluacion;
                $question->origen_reactivo = 'intermedio-modulo2-final-v6-'.($index + 1);
                $question->puntaje_pregunta = 1;
                $question->orden_pregunta = $index + 1;
                $question->publicado = true;
                $question->save();
            }
            EvaluacionKichwa::where('id_modulo', $module->id_modulo)->whereIn('configuracion->bank_key', ['intermedio-modulo2-final-v1', 'intermedio-modulo2-final-v2', 'intermedio-modulo2-final-v3', 'intermedio-modulo2-final-v4', 'intermedio-modulo2-final-v5'])->update(['publicado' => false]);
            $evaluation->update(['publicado' => true]);
        });
        PublicacionContenido::invalidate();
    }

    private function questions(): array
    {
        return json_decode(file_get_contents(resource_path('lessons/intermediate-module-two-final.json')), true, 512, JSON_THROW_ON_ERROR);
    }
}
