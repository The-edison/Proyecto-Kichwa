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

class IntermedioAnalisisVerbalEjerciciosSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            DB::select('SELECT pg_advisory_xact_lock(20261107)');
            $topic = Tema::where('clave_leccion', IntermedioAnalisisVerbalSeeder::LESSON_KEY)->firstOrFail();
            $unit = Unidad::whereKey($topic->id_unidad)->lockForUpdate()->firstOrFail();
            $order = (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
            foreach ($this->exercises() as $activity => $exercise) {
                $origin = 'intermedio-m2-u3-actividad-'.$activity.(in_array($activity, [2, 5], true) ? '-v2' : '-v1');
                if (Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', $origin)->exists()) {
                    continue;
                }
                $exercise += ['zones' => [], 'resource' => null];
                $exercise['config'] += ['managed' => true, 'reviewed' => true, 'verbal_practice' => $activity,
                    'correct_feedback' => '¡Correcto! Continúa con el siguiente ejercicio.',
                    'incorrect_feedback' => 'Revisa las respuestas marcadas y vuelve a intentarlo.'];
                EstadoContenido::assertReady($exercise);
                $position = ++$order;
                if (in_array($activity, [2, 5], true)) {
                    $previous = Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'intermedio-m2-u3-actividad-'.$activity.'-v1')->first();
                    if ($previous) {
                        $position = $previous->orden_actividad;
                        $previous->update(['publicado' => false, 'orden_actividad' => $order]);
                    }
                }
                $record = new Actividad(KichwaResource::attributes('exercises', $exercise));
                $record->id_unidad = $unit->id_unidad;
                $record->origen_reactivo = $origin;
                $record->orden_actividad = $position;
                $record->publicado = true;
                $record->save();
            }
            $this->listeningExercises($unit);
        });
        PublicacionContenido::invalidate();
    }

    private function listeningExercises(Unidad $unit): void
    {
        Actividad::where('id_unidad', $unit->id_unidad)->whereIn('origen_reactivo', ['intermedio-m2-u3-actividad-3-v1', 'intermedio-m2-u3-actividad-6-v1'])->update(['publicado' => false]);
        $bank = [
            ['wawaku', 3, 1, 'Ñuka churika shuk sumak wawaku kan.', ['Mi hijo es un lindo bebé.', 'Mi casita recibe a todos.', 'Mi amiguito es muy guapo.'], 0],
            ['warmiku', 3, 1, 'Ñuka warmiku mishkitami yanun.', ['Mi amiguito es muy guapo.', 'Mi mujercita cocina rico.', 'Mi hijo es un lindo bebé.'], 1],
            ['wasiku', 3, 2, 'Ñuka wasiku tukuykunatami chaskin.', ['Mi hijo es un lindo bebé.', 'Mi mujercita cocina rico.', 'Mi casita recibe a todos.'], 2],
            ['mashiku', 3, 2, 'Ñuka mashiku shuk sumak musumi kan.', ['Mi amiguito es muy guapo.', 'Mi casita recibe a todos.', 'Mi mujercita cocina rico.'], 0],
            ['mikunayan', 6, 1, 'Ñukatami mikunayan ishki kuyita', ['Me dan ganas de comer dos cuyes.', 'Tengo muchas ganas de escribir hoy.', 'Al ver esa comida siento mucho asco.'], 0],
            ['millanayan', 6, 1, 'Chay mikunata rikushpaka ashkatami millanayan.', ['Tengo muchas ganas de aprender esta lengua.', 'Al ver esa comida siento mucho asco.', 'Me dan ganas de comer dos cuyes.'], 1],
            ['killkanayan', 6, 2, 'Kunan punchami ashkata killkanayan.', ['Me dan ganas de comer dos cuyes.', 'Tengo muchas ganas de aprender esta lengua.', 'Hoy tengo muchas ganas de escribir.'], 2],
            ['yachanayan', 6, 2, 'Ñukataka kay shimita ashkatami yachanayan.', ['Tengo muchas ganas de aprender esta lengua.', 'Hoy tengo muchas ganas de escribir.', 'Al ver esa comida siento mucho asco.'], 0],
        ];
        foreach ($bank as [$key, $activity, $panel, $sentence, $options, $correct]) {
            $origin = 'intermedio-m2-u3-escucha-'.$key.'-v1';
            $existing = Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', $origin)->first();
            if ($existing) {
                if ($key === 'mikunayan' && ($existing->configuracion['verbal_sentence'] ?? null) !== $sentence) {
                    $existing->update(['configuracion' => array_replace($existing->configuracion, ['verbal_sentence' => $sentence])]);
                }

                continue;
            }
            $title = $activity === 3 ? 'Actividad 3. Escucha y selecciona' : 'Actividad 6. Escucha e identifica el deseo';
            $exercise = $this->choice($title, 'Escucha cada oración y elige su significado en español.', $options, $correct);
            $exercise += ['zones' => [], 'resource' => null];
            $exercise['config'] += ['managed' => true, 'reviewed' => true, 'verbal_practice' => $activity,
                'verbal_listening' => $key, 'verbal_panel' => $panel, 'verbal_sentence' => $sentence,
                'correct_feedback' => '¡Correcto! '.$options[$correct], 'incorrect_feedback' => 'Escucha de nuevo y revisa el significado.'];
            EstadoContenido::assertReady($exercise);
            $record = new Actividad(KichwaResource::attributes('exercises', $exercise));
            $record->id_unidad = $unit->id_unidad;
            $record->origen_reactivo = $origin;
            $record->orden_actividad = 1 + (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
            $record->publicado = true;
            $record->save();
        }
        $origins = ['intermedio-m2-u3-actividad-1-v1', 'intermedio-m2-u3-actividad-2-v2',
            'intermedio-m2-u3-escucha-wawaku-v1', 'intermedio-m2-u3-escucha-warmiku-v1',
            'intermedio-m2-u3-escucha-wasiku-v1', 'intermedio-m2-u3-escucha-mashiku-v1',
            'intermedio-m2-u3-actividad-4-v1', 'intermedio-m2-u3-actividad-5-v2',
            'intermedio-m2-u3-escucha-mikunayan-v1', 'intermedio-m2-u3-escucha-millanayan-v1',
            'intermedio-m2-u3-escucha-killkanayan-v1', 'intermedio-m2-u3-escucha-yachanayan-v1',
            'intermedio-m2-u3-actividad-7-v1', 'intermedio-m2-u3-actividad-8-v1'];
        $records = Actividad::where('id_unidad', $unit->id_unidad)->orderBy('orden_actividad')->get();
        $ordered = [];
        foreach ($origins as $origin) {
            $record = $records->firstWhere('origen_reactivo', $origin);
            if ($record) {
                $record->update(['publicado' => true]);
                $ordered[$record->id_actividad] = $record;
            }
        }
        foreach ($records as $record) {
            $ordered[$record->id_actividad] ??= $record;
        }
        $position = 1 + (int) $records->max('orden_actividad');
        foreach ($ordered as $record) {
            $record->update(['orden_actividad' => $position++]);
        }
        foreach (array_values($ordered) as $index => $record) {
            $record->update(['orden_actividad' => $index + 1]);
        }
    }

    private function matching(string $title, array $words, array $meanings): array
    {
        $elements = [];
        $pairs = [];
        foreach ($words as $i => $word) {
            $elements[] = ['id' => 'k'.$i, 'texto' => $word, 'grupo' => 'origen'];
            $pairs[] = ['origen' => 'k'.$i, 'destino' => 'd'.$i];
        }
        foreach ([2, 3, 0, 1] as $i) {
            $elements[] = ['id' => 'd'.$i, 'texto' => $meanings[$i], 'grupo' => 'destino'];
        }

        return ['type' => 'relacionar', 'prompt' => 'Une cada palabra en kichwa con su significado.', 'elements' => $elements,
            'solution' => ['pares' => $pairs], 'config' => ['title' => $title, 'morpheme_practice' => 1]];
    }

    private function writing(string $title, string $prompt, array $rows, array $meanings = []): array
    {
        $elements = [];
        $texts = [];
        foreach ($rows as [$id, $text, $correct, $options]) {
            $elements[] = ['id' => $id, 'texto' => $text, 'opciones' => $options];
            $texts[$id] = [$correct];
        }

        return ['type' => 'completar', 'prompt' => $prompt, 'elements' => $elements, 'solution' => ['textos' => $texts], 'config' => ['title' => $title] + ($meanings ? ['verbal_sentence_meanings' => $meanings] : [])];
    }

    private function choice(string $title, string $prompt, array $options, int $correct): array
    {
        return ['type' => 'seleccion_multiple', 'prompt' => $prompt,
            'elements' => array_map(fn ($text, $i) => ['id' => 'o'.$i, 'texto' => $text], $options, array_keys($options)),
            'solution' => ['seleccion' => ['o'.$correct]], 'config' => ['title' => $title, 'morpheme_practice' => 2]];
    }

    private function exercises(): array
    {
        return [
            1 => $this->matching('Actividad 1. Relaciona las palabras', ['Wawaku', 'Warmiku', 'Wasiku', 'Mashiku'], ['Bebecito', 'Mujercita', 'Casita', 'Amiguito']),
            2 => $this->writing('Actividad 2. Ordena los segmentos', 'Toca o arrastra los bloques para separar cada palabra.', [
                ['miku-parts', 'mikukuni', 'miku ku ni', ['ni', 'ku', 'miku']],
                ['wasi-parts', 'wasiku', 'wasi ku', ['ku', 'wasi']],
                ['wawa-parts', 'wawaku', 'wawa ku', ['ku', 'wawa']],
                ['mashi-parts', 'mashiku', 'mashi ku', ['ku', 'mashi']],
            ]),
            4 => $this->matching('Actividad 4. Relaciona las formas verbales', ['Shamuychi', 'Apamuychi', 'Armachina', 'Hapichi'], ['Vengan', 'Traigan', 'Hacer bañar', 'Cojan']),
            5 => $this->writing('Actividad 5. Completa la oración', 'Elige la forma que completa cada oración.', [
                ['shamu', 'Kaya tukuykuna _____.', 'Shamuychi', ['Shamuy', 'Shamuychi']],
                ['apamu', 'Kipaka sarata _____.', 'Apamuychi', ['Apamuychi', 'Apamuy']],
                ['arma', 'Inti punchapi allkuta _____ kan.', 'Armachina', ['Armachi', 'Armachina']],
                ['hapi', 'Tukuykuna misita _____.', 'Hapichi', ['Hapichi', 'Hapina']],
            ], ['shamu' => 'Mañana vengan todos.', 'apamu' => 'Después traigan el maíz.', 'arma' => 'El domingo hay que hacer bañar al perro.', 'hapi' => 'Todos, cojan al gato.']),
            7 => $this->writing('Actividad 7. Clasifica el morfema', 'Elige el morfema que contiene cada palabra.', [
                ['warmi', 'Warmiku', 'ku', ['ku', 'chi', 'naya', 'pay']],
                ['arma', 'Armachina', 'chi', ['ku', 'chi', 'naya', 'pay']],
                ['killka', 'Killkanayan', 'naya', ['ku', 'chi', 'naya', 'pay']],
                ['shamu', 'Shamupay', 'pay', ['ku', 'chi', 'naya', 'pay']],
            ]),
            8 => $this->writing('Actividad 8. Actividad integradora', 'Separa la palabra, une las funciones y elige el significado.', [
                ['segments', 'mikukuni', 'miku ku ni', ['ni', 'miku', 'ku']],
                ['chi', '-chi', 'causa', ['cortesia', 'causa', 'deseo']],
                ['naya', '-naya', 'deseo', ['cortesia', 'causa', 'deseo']],
                ['pay', '-pay', 'cortesia', ['cortesia', 'causa', 'deseo']],
                ['ku-function', 'En mikukuni, ¿qué expresa -ku?', 'curso', ['causa', 'curso', 'deseo']],
            ]),
        ];
    }
}
