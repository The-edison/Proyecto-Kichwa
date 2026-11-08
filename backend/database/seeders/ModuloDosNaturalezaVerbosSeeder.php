<?php

namespace Database\Seeders;

use App\Models\Actividad;
use App\Models\Tema;
use App\Services\EstadoContenido;
use App\Services\KichwaResource;
use App\Services\PublicacionContenido;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ModuloDosNaturalezaVerbosSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            DB::select('SELECT pg_advisory_xact_lock(20261109)');
            foreach (['nature' => 3, 'verbs' => 4] as $lesson => $number) {
                $topic = Tema::where('clave_leccion', 'basico-modulo2-unidad'.$number.'-'.$lesson.'-v1')->firstOrFail();
                $unitId = $topic->id_unidad;
                $originals = Actividad::where('id_unidad', $unitId)
                    ->where('origen_reactivo', 'like', 'u'.$number.'-guided-'.$lesson.'-%')
                    ->orderBy('orden_actividad')->get();
                if ($originals->isEmpty()) {
                    throw new \RuntimeException('Carga los ejercicios iniciales de la unidad '.$number.' antes de crear la práctica variada.');
                }
                Actividad::whereIn('id_actividad', $originals->skip(1)->pluck('id_actividad'))->update(['publicado' => false]);
                Actividad::where('id_unidad', $unitId)->where('origen_reactivo', 'like', 'm2-u'.$number.'-%-v1')
                    ->update(['publicado' => false]);

                $order = (int) Actividad::where('id_unidad', $unitId)->max('orden_actividad');
                foreach ($this->bank()[$lesson] as $definition) {
                    $key = $definition['key'];
                    unset($definition['key']);
                    $origin = 'm2-u'.$number.'-'.$key.'-v2';
                    $config = $definition['config'] + [
                        'managed' => true, 'reviewed' => true, 'difficulty' => 'inicial', 'topic_practice' => true,
                        'correct_feedback' => '¡Bien hecho! La respuesta concuerda con la lección.',
                        'incorrect_feedback' => 'Revisa el significado y prueba otra vez.',
                    ];
                    $exercise = $definition + ['zones' => [], 'resource' => null];
                    $exercise['config'] = $config;
                    EstadoContenido::assertReady($exercise);
                    $activity = Actividad::where('id_unidad', $unitId)->where('origen_reactivo', $origin)->first();
                    if ($activity) {
                        if (! $activity->publicado) {
                            $activity->update(['publicado' => true]);
                        }

                        continue;
                    }
                    $activity = new Actividad(KichwaResource::attributes('exercises', $exercise));
                    $activity->id_unidad = $unitId;
                    $activity->id_tema = null;
                    $activity->origen_reactivo = $origin;
                    $activity->orden_actividad = ++$order;
                    $activity->publicado = true;
                    $activity->save();
                }
            }
        });
        PublicacionContenido::invalidate();
    }

    private function choice(string $key, string $title, string $prompt, array $options, array $correct): array
    {
        return ['key' => $key, 'type' => 'seleccion_multiple', 'prompt' => $prompt,
            'elements' => array_map(fn (int $position, string $text): array => ['id' => 'option-'.($position + 1), 'texto' => $text], array_keys($options), $options),
            'solution' => ['seleccion' => array_map(fn (int $position): string => 'option-'.($position + 1), $correct)],
            'config' => ['title' => $title, 'presentation' => 'buttons', 'max_selections' => count($correct), 'exact_selections' => true]];
    }

    private function complete(string $key, string $title, string $prompt, array $items): array
    {
        return ['key' => $key, 'type' => 'completar', 'prompt' => $prompt,
            'elements' => array_map(fn (array $item): array => ['id' => $item[0], 'texto' => $item[1], 'opciones' => $item[2]], $items),
            'solution' => ['textos' => array_reduce($items, function (array $answers, array $item): array {
                $answers[$item[0]] = [$item[3]];

                return $answers;
            }, [])],
            'config' => ['title' => $title]];
    }

    private function order(string $key, string $title, string $prompt, array $letters): array
    {
        return ['key' => $key, 'type' => 'ordenar', 'prompt' => $prompt,
            'elements' => array_reverse(array_map(fn (int $position, string $letter): array => ['id' => 'letter-'.($position + 1), 'texto' => $letter], array_keys($letters), $letters)),
            'solution' => ['orden' => array_map(fn (int $position): string => 'letter-'.($position + 1), array_keys($letters))],
            'config' => ['title' => $title, 'presentation' => 'tiles']];
    }

    private function bank(): array
    {
        return [
            'nature' => [
                $this->choice('killa-context', 'Una palabra, dos contextos', 'En un calendario, ¿qué significa «killa»?',
                    ['luna', 'mes', 'agua', 'lluvia'], [1]),
                $this->complete('landscape-clues', 'Pistas del paisaje', 'Completa cada pista con la palabra kichwa correcta.', [
                    ['rain', 'Cae agua del cielo: _____.', ['inti', 'tamya', 'urku'], 'tamya'],
                    ['sun', 'Da luz durante el día: _____.', ['killa', 'wayra', 'inti'], 'inti'],
                    ['mountain', 'Se eleva en el paisaje: _____.', ['urku', 'allpa', 'yaku'], 'urku'],
                ]),
                $this->order('rain-letters', 'Construye una palabra', 'Ordena las letras para formar la palabra kichwa que significa «lluvia».', ['t', 'a', 'm', 'y', 'a']),
                $this->choice('house-parts', 'Explora la casa', 'Elige las DOS palabras para «puerta» y «ventana».',
                    ['wasi', 'punku', 'tuku', 'yura'], [1, 2]),
            ],
            'verbs' => [
                $this->complete('action-clues', 'Acciones en contexto', 'Elige el verbo que corresponde a cada acción.', [
                    ['drink', 'Para beber agua: _____.', ['uyana', 'upyana', 'purina'], 'upyana'],
                    ['plant', 'Para sembrar una semilla: _____.', ['tarpuna', 'yanuna', 'pichana'], 'tarpuna'],
                    ['listen', 'Para escuchar una voz: _____.', ['rikuna', 'yachana', 'uyana'], 'uyana'],
                ]),
                $this->order('walk-root', 'Separa la raíz', 'Quita -na de «purina» y ordena las letras de la raíz.', ['p', 'u', 'r', 'i']),
                $this->choice('garden-kitchen', 'Dos acciones diferentes', 'Para cocinar y sembrar, elige los DOS verbos correspondientes.',
                    ['rikuna', 'yanuna', 'puñuna', 'tarpuna'], [1, 3]),
                $this->choice('learn-action', 'Aprender en kichwa', 'Alguien estudia una palabra nueva. ¿Qué verbo significa «aprender»?',
                    ['killkana', 'llamkana', 'yachana', 'mikuna'], [2]),
            ],
        ];
    }
}
