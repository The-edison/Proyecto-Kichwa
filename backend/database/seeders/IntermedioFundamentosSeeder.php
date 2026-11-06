<?php

namespace Database\Seeders;

use App\Models\Actividad;
use App\Models\Modulo;
use App\Models\Nivel;
use App\Models\Tema;
use App\Models\Unidad;
use App\Services\EstadoContenido;
use App\Services\KichwaResource;
use App\Services\PublicacionContenido;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class IntermedioFundamentosSeeder extends Seeder
{
    public function run(): void
    {
        $lessons = json_decode(file_get_contents(resource_path('lessons/intermediate-foundations.json')), true, 512, JSON_THROW_ON_ERROR);

        DB::transaction(function () use ($lessons): void {
            DB::select('SELECT pg_advisory_xact_lock(20261106)');
            $level = Nivel::where('orden_nivel', 2)->firstOrFail();
            $module = Modulo::firstOrNew(['id_nivel' => $level->id_nivel, 'orden_modulo' => 1]);
            $module->fill([
                'nombre_modulo' => 'Conjugación y morfemas básicos y medios',
                'descripcion_modulo' => 'Tiempos verbales, morfemas, adverbios y formas de expresar afirmación, negación y duda.',
                'publicado' => true,
            ])->save();

            foreach ($lessons as $unitIndex => $lesson) {
                $unit = Unidad::firstOrNew(['id_modulo' => $module->id_modulo, 'orden_unidad' => $unitIndex + 1]);
                $unit->fill([
                    'titulo_unidad' => $lesson['title'],
                    'objetivo_unidad' => $lesson['objective'],
                    'publicado' => true,
                    'configuracion' => array_replace($unit->configuracion ?? [], ['learning_mode' => 'classic']),
                ])->save();

                foreach ($lesson['topics'] as $topicIndex => $section) {
                    $key = 'intermedio-modulo1-unidad'.($unitIndex + 1).'-'.$section['key'].'-v1';
                    $topic = Tema::firstOrNew(['clave_leccion' => $key]);
                    $topic->fill([
                        'id_unidad' => $unit->id_unidad,
                        'tipo_tema' => 'gramatica',
                        'titulo_tema' => $section['title'],
                        'contenido_tema' => $section['body'],
                        'orden_tema' => $topicIndex + 1,
                        'publicado' => true,
                    ])->save();

                    $answers = [];
                    $elements = [];
                    foreach ($section['rows'] as [$id, $sentence, $options, $answer]) {
                        $elements[] = ['id' => $id, 'texto' => $sentence, 'opciones' => $options];
                        $answers[$id] = [$answer];
                    }
                    $exercise = [
                        'type' => 'completar',
                        'prompt' => $section['prompt'],
                        'elements' => $elements,
                        'zones' => [],
                        'resource' => null,
                        'solution' => ['textos' => $answers],
                        'config' => [
                            'title' => 'Practica: '.$section['title'],
                            'managed' => true,
                            'reviewed' => true,
                            'difficulty' => 'intermedio',
                            'correct_feedback' => '¡Bien! Completaste las respuestas de este tema.',
                            'incorrect_feedback' => 'Revisa los ejemplos del tema y vuelve a intentarlo.',
                        ],
                    ];
                    EstadoContenido::assertReady($exercise);
                    $origin = $key.'-practice';
                    $activity = Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', $origin)->firstOrNew();
                    $activity->fill(KichwaResource::attributes('exercises', $exercise));
                    $activity->id_tema = $topic->id_tema;
                    $activity->id_unidad = $unit->id_unidad;
                    $activity->origen_reactivo = $origin;
                    $activity->orden_actividad = $topicIndex + 1;
                    $activity->publicado = true;
                    $activity->save();
                }
            }
        });

        PublicacionContenido::invalidate();
    }
}
