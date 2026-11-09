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

class IntermedioTiemposEjerciciosSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            DB::select('SELECT pg_advisory_xact_lock(20261106)');
            $topic = Tema::where('clave_leccion', IntermedioTiemposSeeder::LESSON_KEY)->firstOrFail();
            $unit = Unidad::whereKey($topic->id_unidad)->lockForUpdate()->firstOrFail();
            $order = (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
            foreach ($this->exercises() as $activity => $exercise) {
                $origin = 'intermedio-m2-u2-actividad-'.$activity.'-v1';
                if (Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', $origin)->exists()) {
                    continue;
                }
                $exercise += ['zones' => [], 'resource' => null];
                $exercise['config'] += ['managed' => true, 'reviewed' => true, 'time_practice' => $activity,
                    'correct_feedback' => '¡Correcto! Continúa con el siguiente ejercicio.',
                    'incorrect_feedback' => 'Revisa tus respuestas y vuelve a intentarlo.'];
                EstadoContenido::assertReady($exercise);
                $record = new Actividad(KichwaResource::attributes('exercises', $exercise));
                $record->id_unidad = $unit->id_unidad;
                $record->origen_reactivo = $origin;
                $record->orden_actividad = ++$order;
                $record->publicado = true;
                $record->save();
            }
            $this->listeningExercises($unit);
        });
        PublicacionContenido::invalidate();
    }

    private function listeningExercises(Unidad $unit): void
    {
        Actividad::where('id_unidad', $unit->id_unidad)->whereIn('origen_reactivo', ['intermedio-m2-u2-actividad-3-v1', 'intermedio-m2-u2-actividad-4-v1', 'intermedio-m2-u2-actividad-6-v1'])->update(['publicado' => false]);
        $bank = [
            ['alex', 3, 1, ['Alex descansó ayer.', 'Alex llegó ayer desde Quito.', 'Alex se perdió en el mercado.'], 0],
            ['edgar', 3, 1, ['Edgar descansó ayer.', 'Edgar lloró mucho el domingo.', 'Edgar llegó el domingo desde Quito.'], 1],
            ['kaled', 3, 2, ['Kaled se perdió en el mercado.', 'Kaled descansó ayer.', 'Kaled llegó ayer desde Quito.'], 2],
            ['pakarina', 3, 2, ['Pakarina llegó ayer desde Quito.', 'Pakarina se perdió en el mercado.', 'Pakarina lloró el domingo.'], 1],
            ['llanka', 6, 1, ['Mañana trabajaré con Matías.', 'Mañana caminaré con Matías.', 'Ayer trabajé con Matías.'], 0],
            ['yachachi', 6, 1, ['Mañana coseré tu sombrero.', 'Mañana enseñaré todas las frutas en clase.', 'Ayer enseñé todas las frutas en clase.'], 1],
            ['puri', 6, 2, ['Mañana trabajaré en mi comunidad.', 'Ayer caminé por toda mi comunidad.', 'Mañana caminaré por toda mi comunidad.'], 2],
            ['sira', 6, 2, ['Mañana coseré tu sombrero.', 'Mañana enseñaré todas las frutas.', 'Ayer cosí tu sombrero.'], 0],
        ];
        foreach ($bank as [$key, $activity, $panel, $options, $correct]) {
            $origin = 'intermedio-m2-u2-escucha-'.$key.'-v1';
            if (Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', $origin)->exists()) {
                continue;
            }
            $title = $activity === 3 ? 'Actividad 3. Escucha y selecciona' : 'Actividad 6. Escucha e identifica';
            $exercise = $this->choice($title, 'Escucha cada oración y elige su significado en español.', $options);
            $exercise += ['zones' => [], 'resource' => null];
            $exercise['solution'] = ['seleccion' => ['o'.$correct]];
            $exercise['config'] += ['managed' => true, 'reviewed' => true, 'time_practice' => $activity, 'time_listening' => $key, 'time_panel' => $panel,
                'correct_feedback' => '¡Correcto! '.$options[$correct], 'incorrect_feedback' => 'Escucha de nuevo y revisa el significado.'];
            EstadoContenido::assertReady($exercise);
            $record = new Actividad(KichwaResource::attributes('exercises', $exercise));
            $record->id_unidad = $unit->id_unidad;
            $record->origen_reactivo = $origin;
            $record->orden_actividad = 1 + (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
            $record->publicado = true;
            $record->save();
        }
        $origins = ['intermedio-m2-u2-actividad-2-v1',
            'intermedio-m2-u2-escucha-alex-v1', 'intermedio-m2-u2-escucha-edgar-v1',
            'intermedio-m2-u2-escucha-kaled-v1', 'intermedio-m2-u2-escucha-pakarina-v1',
            'intermedio-m2-u2-actividad-5-v1',
            'intermedio-m2-u2-escucha-llanka-v1', 'intermedio-m2-u2-escucha-yachachi-v1',
            'intermedio-m2-u2-escucha-puri-v1', 'intermedio-m2-u2-escucha-sira-v1',
            'intermedio-m2-u2-actividad-8-v1', 'intermedio-m2-u2-actividad-7-v1'];
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

    private function writing(string $title, string $prompt, array $rows): array
    {
        $elements = [];
        $texts = [];
        foreach ($rows as [$id, $text, $correct, $options]) {
            $elements[] = ['id' => $id, 'texto' => $text, 'opciones' => $options];
            $texts[$id] = [$correct];
        }

        return ['type' => 'completar', 'prompt' => $prompt, 'elements' => $elements, 'solution' => ['textos' => $texts], 'config' => ['title' => $title]];
    }

    private function choice(string $title, string $prompt, array $options): array
    {
        return ['type' => 'seleccion_multiple', 'prompt' => $prompt,
            'elements' => array_map(fn ($text, $i) => ['id' => 'o'.$i, 'texto' => $text], $options, array_keys($options)),
            'solution' => ['seleccion' => ['o0']], 'config' => ['title' => $title, 'morpheme_practice' => 2]];
    }

    private function exercises(): array
    {
        $words = ['Samarirka', 'Wakarka', 'Chayarka', 'Chinkarirka', 'Urmarka'];
        $meanings = ['Descansó', 'Lloró', 'Llegó', 'Se perdió', 'Cayó'];
        $elements = [];
        $pairs = [];
        foreach ($words as $index => $word) {
            $elements[] = ['id' => 'k'.$index, 'texto' => $word, 'grupo' => 'origen'];
            $pairs[] = ['origen' => 'k'.$index, 'destino' => 'd'.$index];
        }
        foreach ([2, 0, 4, 1, 3] as $index) {
            $elements[] = ['id' => 'd'.$index, 'texto' => $meanings[$index], 'grupo' => 'destino'];
        }
        $comparison = [];
        foreach ([['samari', 'Samari · descansar', 'samarirka', 'samarisha'], ['chaya', 'Chaya · llegar', 'chayarka', 'chayasha'], ['sira', 'Sira · coser', 'sirarka', 'sirasha']] as [$root, $text, $past, $future]) {
            $comparison[] = [$root.'-past', $text.' · pasado (él/ella)', $past, []];
            $comparison[] = [$root.'-future', $text.' · futuro (yo)', $future, []];
        }

        return [
            2 => ['type' => 'relacionar', 'prompt' => 'Une cada forma del pasado con su significado.', 'elements' => $elements, 'solution' => ['pares' => $pairs], 'config' => ['title' => 'Actividad 2. Relaciona las formas del pasado', 'morpheme_practice' => 1]],
            5 => $this->writing('Actividad 5. Forma el futuro', 'Escribe cada palabra en futuro con -sha.', [
                ['llanka', 'llanka', 'llankasha', []], ['yachachi', 'yachachi', 'yachachisha', []],
                ['puri', 'puri', 'purisha', []], ['kuya', 'kuya', 'kuyasha', []], ['sira', 'sira', 'sirasha', []],
            ]),
            7 => $this->writing('Actividad 7. Compara el tiempo verbal', 'Completa el pasado (él/ella) y el futuro (yo).', $comparison),
            8 => $this->writing('Actividad 8. Actividad integradora', 'Clasifica las palabras y completa la oración.', [
                ['samari', 'Samarirka', 'rka', ['rka', 'sha']], ['puri', 'Purisha', 'sha', ['rka', 'sha']],
                ['chinkari', 'Chinkarirka', 'rka', ['rka', 'sha']], ['yachachi', 'Yachachisha', 'sha', ['rka', 'sha']],
                ['sentence', 'Ñuka llanka___ mañana.', 'sha', ['rka', 'sha']],
            ]),
        ];
    }
}
