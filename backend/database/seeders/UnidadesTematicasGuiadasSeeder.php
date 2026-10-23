<?php

namespace Database\Seeders;

use App\Models\Actividad;
use App\Models\EvaluacionKichwa;
use App\Models\Modulo;
use App\Models\Tema;
use App\Models\Unidad;
use App\Services\EstadoContenido;
use App\Services\KichwaResource;
use App\Services\PublicacionContenido;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class UnidadesTematicasGuiadasSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(UnidadDosGuiadaSeeder::class);
        $topics = json_decode(file_get_contents(resource_path('lessons/guided-topics.json')), true, 512, JSON_THROW_ON_ERROR);
        DB::transaction(function () use ($topics): void {
            DB::select('SELECT pg_advisory_xact_lock(20261019)');
            $previous = Tema::where('clave_leccion', UnidadDosGuiadaSeeder::LESSON_KEY)->firstOrFail();
            $firstModule = Modulo::findOrFail(Unidad::findOrFail($previous->id_unidad)->id_modulo);
            foreach ($topics as $topic) {
                $moduleOrder = $topic['module'];
                $key = 'basico-modulo'.$moduleOrder.'-unidad'.$topic['order'].'-'.$topic['key'].'-v1';
                if (Tema::where('clave_leccion', $key)->exists()) {
                    continue;
                }
                $moduleRecord = $moduleOrder === 1 ? $firstModule : Modulo::where('id_nivel', $firstModule->id_nivel)->where('orden_modulo', $moduleOrder)->lockForUpdate()->first();
                if (! $moduleRecord) {
                    $moduleRecord = Modulo::create(['id_nivel' => $firstModule->id_nivel, 'orden_modulo' => $moduleOrder,
                        'nombre_modulo' => 'Vocabulario y gramática básica', 'descripcion_modulo' => 'Reconocer animales, colores, partes del cuerpo, elementos del entorno y acciones en kichwa.', 'publicado' => true]);
                }
                $moduleRecord->update(['publicado' => true]);
                $module = $moduleRecord->id_modulo;
                $unit = Unidad::where('id_modulo', $module)->where('orden_unidad', $topic['order'])->lockForUpdate()->first();
                if (! $unit) {
                    $unit = Unidad::create(['id_modulo' => $module, 'orden_unidad' => $topic['order'],
                        'titulo_unidad' => $topic['title'], 'objetivo_unidad' => $topic['description'], 'publicado' => true]);
                }
                Actividad::where('id_unidad', $unit->id_unidad)->update(['publicado' => false]);
                EvaluacionKichwa::where('id_unidad', $unit->id_unidad)->update(['publicado' => false]);
                Tema::where('id_unidad', $unit->id_unidad)->update(['publicado' => false]);
                Tema::create(['id_unidad' => $unit->id_unidad, 'clave_leccion' => $key, 'tipo_tema' => 'vocabulario',
                    'titulo_tema' => $topic['title'], 'contenido_tema' => self::topicBody($topic),
                    'orden_tema' => 1 + (int) Tema::where('id_unidad', $unit->id_unidad)->max('orden_tema'), 'publicado' => true]);
                $order = (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
                foreach ($topic['sections'] as $sectionIndex => $section) {
                    if (count($section['rows']) < 2) {
                        continue;
                    }
                    $groups = array_chunk($section['rows'], 4);
                    if (count($groups) > 1 && count($groups[array_key_last($groups)]) === 1) {
                        $last = array_pop($groups);
                        array_unshift($last, array_pop($groups[array_key_last($groups)]));
                        $groups[] = $last;
                    }
                    foreach ($groups as $groupIndex => $rows) {
                        $elements = [];
                        $pairs = [];
                        foreach ($rows as $index => [$word, $meaning]) {
                            $elements[] = ['id' => 'es-'.$index, 'texto' => $meaning, 'grupo' => 'origen'];
                            $pairs[] = ['origen' => 'es-'.$index, 'destino' => 'qu-'.$index];
                        }
                        foreach (array_reverse(array_keys($rows)) as $index) {
                            $elements[] = ['id' => 'qu-'.$index, 'texto' => $rows[$index][0], 'grupo' => 'destino'];
                        }
                        $exercise = ['type' => 'relacionar', 'prompt' => 'Selecciona una expresión en español y luego su pareja en kichwa.',
                            'elements' => $elements, 'zones' => [], 'resource' => null, 'solution' => ['pares' => $pairs],
                            'config' => ['title' => $section['title'].(count($groups) > 1 ? ' · Parte '.($groupIndex + 1) : ''),
                                'managed' => true, 'reviewed' => true, 'difficulty' => 'inicial',
                                'correct_feedback' => '¡Muy bien! Relacionaste todas las expresiones correctamente.',
                                'incorrect_feedback' => 'Revisa las parejas con ayuda de la lección y vuelve a comprobar.']];
                        EstadoContenido::assertReady($exercise);
                        $record = new Actividad(KichwaResource::attributes('exercises', $exercise));
                        $record->id_unidad = $unit->id_unidad;
                        $record->origen_reactivo = 'u'.$topic['order'].'-guided-'.$topic['key'].'-'.$sectionIndex.'-'.$groupIndex.'-v1';
                        $record->orden_actividad = ++$order;
                        $record->publicado = true;
                        $record->save();
                    }
                }
                $unit->update(['titulo_unidad' => $topic['title'], 'objetivo_unidad' => $topic['description'], 'publicado' => true,
                    'configuracion' => array_replace($unit->configuracion ?? [], ['learning_mode' => 'guided', 'guided_lesson' => $topic['key']])]);
            }
        });
        PublicacionContenido::invalidate();
        $this->call(UnidadTresPronombresSeeder::class);
        $this->call(UnidadCuatroNumerosSeeder::class);
        $this->call(UnidadCincoCalendarioSeeder::class);
        $this->call(ModuloDosAnimalesSeeder::class);
        $this->call(ModuloDosColoresSeeder::class);
        $this->call(ModuloDosCuerpoSeeder::class);
    }

    public static function topicBody(array $topic): string
    {
        $body = [$topic['description'], $topic['note']];
        foreach ($topic['sections'] as $section) {
            $body[] = $section['title']."\n".implode("\n", array_map(fn (array $row): string => $row[0].' = '.$row[1], $section['rows']));
            $body = array_merge($body, $section['paragraphs']);
        }

        return implode("\n\n", $body);
    }
}
