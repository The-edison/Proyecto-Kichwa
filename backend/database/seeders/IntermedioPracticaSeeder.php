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

class IntermedioPracticaSeeder extends Seeder
{
    private const RESOURCE_FILE = 'lessons/intermediate-university-practice.json';

    public function run(): void
    {
        $lessons = json_decode(file_get_contents(resource_path(self::RESOURCE_FILE)), true, 512, JSON_THROW_ON_ERROR);

        DB::transaction(function () use ($lessons): void {
            DB::select('SELECT pg_advisory_xact_lock(20261107)');
            $level = Nivel::where('orden_nivel', 2)->firstOrFail();
            $module = Modulo::where('id_nivel', $level->id_nivel)->where('orden_modulo', 2)->firstOrFail();
            $module->update(['nombre_modulo' => 'Análisis morfológico y textual del kichwa',
                'descripcion_modulo' => 'Estudio de la derivación, la referencia temporal y la cohesión del discurso mediante análisis y producción de formas en kichwa.']);

            foreach ($lessons as $lesson) {
                $unit = Unidad::where('id_modulo', $module->id_modulo)->where('orden_unidad', $lesson['unit'])->firstOrFail();
                $config = $unit->configuracion ?? [];
                $config['learning_mode'] = 'classic';
                unset($config['guided_lesson'], $config['sequence_mode']);
                $unit->update(['titulo_unidad' => $lesson['title'], 'objetivo_unidad' => $lesson['objective'],
                    'configuracion' => $config]);

                $legacyKeys = [
                    1 => IntermedioMorfemasSeeder::LESSON_KEY,
                    2 => IntermedioTiemposSeeder::LESSON_KEY,
                    3 => IntermedioAnalisisVerbalSeeder::LESSON_KEY,
                    4 => IntermedioDialogosSeeder::LESSON_KEY,
                ];
                Tema::where('id_unidad', $unit->id_unidad)->where('clave_leccion', $legacyKeys[$lesson['unit']])
                    ->update(['publicado' => false]);
                $topics = [];
                foreach ($lesson['topics'] as $definition) {
                    $topic = Tema::firstOrNew(['clave_leccion' => 'intermedio-m2-u'.$lesson['unit'].'-'.$definition['key'].'-academico-v1']);
                    $topic->fill(['id_unidad' => $unit->id_unidad, 'tipo_tema' => 'gramatica',
                        'titulo_tema' => $definition['title'], 'contenido_tema' => $definition['body'],
                        'publicado' => true]);
                    if (! $topic->exists) {
                        $topic->orden_tema = 1 + (int) Tema::where('id_unidad', $unit->id_unidad)->max('orden_tema');
                    }
                    $topic->save();
                    $topics[$definition['key']] = $topic->id_tema;
                }
                Actividad::where('id_unidad', $unit->id_unidad)
                    ->where('origen_reactivo', 'like', 'intermedio-modulo2-unidad'.$lesson['unit'].'-%-practice-v1')
                    ->update(['publicado' => false]);
                Actividad::where('id_unidad', $unit->id_unidad)
                    ->where('origen_reactivo', 'like', 'intermedio-m2-u'.$lesson['unit'].'-%')
                    ->where('origen_reactivo', 'not like', 'intermedio-m2-u'.$lesson['unit'].'-aplicacion-%-v2')
                    ->update(['publicado' => false]);

                foreach ($lesson['exercises'] as $definition) {
                    $key = $definition['key'];
                    $topicKey = $definition['topic'];
                    unset($definition['key'], $definition['topic']);
                    $exercise = $definition;
                    $exercise['zones'] = [];
                    $exercise['resource'] = null;
                    $exercise['config'] += [
                        'university_practice' => true,
                        'managed' => true,
                        'reviewed' => true,
                        'difficulty' => 'intermedio',
                        'correct_feedback' => 'Análisis correcto. La forma concuerda con la función solicitada.',
                        'incorrect_feedback' => 'Revisa el contexto y la función de cada morfema antes de responder.',
                    ];
                    EstadoContenido::assertReady($exercise);
                    $origin = 'intermedio-m2-u'.$lesson['unit'].'-aplicacion-'.$key.'-v2';
                    $activity = Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', $origin)->first();
                    if ($activity) {
                        $activity->update(['publicado' => true]);

                        continue;
                    }
                    $activity = new Actividad;
                    $activity->fill(KichwaResource::attributes('exercises', $exercise));
                    $activity->id_unidad = $unit->id_unidad;
                    $activity->id_tema = $topics[$topicKey];
                    $activity->origen_reactivo = $origin;
                    $activity->orden_actividad = 1 + (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
                    $activity->publicado = true;
                    $activity->save();
                }
            }
        });

        PublicacionContenido::invalidate();
    }
}
