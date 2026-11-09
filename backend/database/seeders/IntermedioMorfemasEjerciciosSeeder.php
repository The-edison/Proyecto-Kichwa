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

class IntermedioMorfemasEjerciciosSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            DB::select('SELECT pg_advisory_xact_lock(20261105)');
            $topic = Tema::where('clave_leccion', IntermedioMorfemasSeeder::LESSON_KEY)->firstOrFail();
            $unit = Unidad::whereKey($topic->id_unidad)->lockForUpdate()->firstOrFail();
            $order = (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
            foreach ($this->exercises() as $index => $exercise) {
                $origin = 'intermedio-m2-u1-practica-'.($index + 1).($index === 4 ? '-v2' : '-v1');
                if (Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', $origin)->exists()) {
                    continue;
                }
                $exercise += ['zones' => [], 'resource' => null];
                $exercise['config'] += ['managed' => true, 'reviewed' => true, 'morpheme_practice' => $index + 1,
                    'correct_feedback' => '¡Correcto! Continúa con el siguiente ejercicio.',
                    'incorrect_feedback' => 'Revisa tus respuestas y vuelve a intentarlo.'];
                EstadoContenido::assertReady($exercise);
                $position = ++$order;
                if ($index === 4) {
                    $previous = Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'intermedio-m2-u1-practica-5-v1')->first();
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

    private function matching(array $words, array $meanings, string $title, string $prompt): array
    {
        $elements = [];
        $pairs = [];
        foreach ($words as $i => $word) {
            $elements[] = ['id' => 'k'.$i, 'texto' => $word, 'grupo' => 'origen'];
            $pairs[] = ['origen' => 'k'.$i, 'destino' => 'd'.$i];
        }
        foreach (array_reverse(array_keys($meanings)) as $i) {
            $elements[] = ['id' => 'd'.$i, 'texto' => $meanings[$i], 'grupo' => 'destino'];
        }

        return ['type' => 'relacionar', 'prompt' => $prompt, 'elements' => $elements, 'solution' => ['pares' => $pairs], 'config' => ['title' => $title]];
    }

    private function choice(string $title, string $prompt, array $options, int $correct): array
    {
        return ['type' => 'seleccion_multiple', 'prompt' => $prompt,
            'elements' => array_map(fn ($text, $i) => ['id' => 'o'.$i, 'texto' => $text], $options, array_keys($options)),
            'solution' => ['seleccion' => ['o'.$correct]], 'config' => ['title' => $title]];
    }

    private function exercises(): array
    {
        return [
            0 => $this->matching(['Wasikamak', 'Punkukamak', 'Llamakamak', 'Wakrakamak', 'Tantakamak'], ['Cuidador de la casa', 'Portero', 'Ovejero', 'Vaquero', 'Panadero'], 'Actividad 1. Relaciona las palabras', 'Relaciona cada palabra en kichwa con su significado en español.'),
            2 => ['type' => 'completar', 'prompt' => 'Escribe la palabra completa utilizando el morfema correspondiente.', 'elements' => array_map(fn ($base) => ['id' => $base, 'texto' => ucfirst($base).' + -kamak'], ['wasi', 'llama', 'wakra', 'tanta', 'punku']), 'solution' => ['textos' => ['wasi' => ['wasikamak'], 'llama' => ['llamakamak'], 'wakra' => ['wakrakamak'], 'tanta' => ['tantakamak'], 'punku' => ['punkukamak']]], 'config' => ['title' => 'Actividad 3. Completa la palabra']],
            4 => $this->ordinalExercise(),
            5 => $this->choice('Actividad 6. Escucha e identifica el lugar', 'Escucha la oración y selecciona la posición mencionada.', ['Primero', 'Tercero', 'Noveno'], 0),
            6 => $this->matching(['Layaya', 'Lamama', 'Lachuri', 'Laushushi'], ['Padrastro', 'Madrastra', 'Entenado', 'Entenada'], 'Actividad 8. Relaciona los parentescos', 'Une cada término en kichwa con su significado.'),
        ];
    }

    private function listeningExercises(Unidad $unit): void
    {
        Actividad::where('id_unidad', $unit->id_unidad)->whereIn('origen_reactivo', ['intermedio-m2-u1-practica-2-v1', 'intermedio-m2-u1-practica-4-v1'])->update(['publicado' => false]);
        $bank = [
            ['julio', 1, ['Julio es un buen cuidador de la casa.', 'Julio es un buen panadero.', 'Julio es un joven vaquero.'], 0],
            ['manuelito', 1, ['Don Manuelito es un buen panadero.', 'Don Manuelito es un portero de años.', 'Don Manuelito es un joven vaquero.'], 1],
            ['marilin', 2, ['Marilin es una señorita panadera.', 'Marilin es una cuidadora de la casa.', 'Marilin es una señorita ovejera.'], 2],
            ['luis', 2, ['Luis es un buen panadero.', 'Luis es un joven vaquero.', 'Luis es un portero de años.'], 0],
        ];
        foreach ($bank as [$key, $panel, $options, $correct]) {
            $origin = 'intermedio-m2-u1-escucha-'.$key.'-v1';
            if (Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', $origin)->exists()) {
                continue;
            }
            $exercise = $this->choice('Actividad 2. Escucha y selecciona', 'Escucha cada oración y elige su significado.', $options, $correct);
            $exercise += ['zones' => [], 'resource' => null];
            $exercise['config'] += ['managed' => true, 'reviewed' => true, 'morpheme_practice' => 2,
                'morpheme_listening' => $key, 'morpheme_panel' => $panel,
                'correct_feedback' => '¡Correcto! '.$options[$correct],
                'incorrect_feedback' => 'Escucha de nuevo y revisa el significado.'];
            EstadoContenido::assertReady($exercise);
            $record = new Actividad(KichwaResource::attributes('exercises', $exercise));
            $record->id_unidad = $unit->id_unidad;
            $record->origen_reactivo = $origin;
            $record->orden_actividad = 1 + (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
            $record->publicado = true;
            $record->save();
        }
        $this->thirdPlaceExercise($unit);
        $this->familyListeningExercises($unit);
        $this->reorderExercises($unit);
    }

    private function familyListeningExercises(Unidad $unit): void
    {
        Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'intermedio-m2-u1-practica-8-v1')->update(['publicado' => false]);
        $bank = [
            ['laushushi', 1, ['La hijastra no quiere trabajar.', 'La hijastra quiere cocinar.', 'El hijastro no quiere estudiar.'], 0],
            ['layaya', 1, ['El joven Brayan tiene pocos hermanos.', 'El joven Brayan tiene muchas mujeres, como el padrastro.', 'El joven Brayan vive con su madrastra.'], 1],
            ['lamama', 2, ['Tu hija cocina con la madrastra.', 'Tu hija no trabaja con el padrastro.', 'Tu hija no cocina, al igual que la madrastra.'], 2],
            ['lachuri', 2, ['Él es un padrastro.', 'Él es solo un hijastro.', 'Ella es una hijastra.'], 1],
        ];
        foreach ($bank as [$key, $panel, $options, $correct]) {
            $origin = 'intermedio-m2-u1-parentesco-escucha-'.$key.'-v1';
            if (Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', $origin)->exists()) {
                continue;
            }
            $exercise = $this->choice('Actividad 11. Escucha y elige el significado', 'Escucha cada oración y elige su significado en español.', $options, $correct);
            $exercise += ['zones' => [], 'resource' => null];
            $exercise['config'] += ['managed' => true, 'reviewed' => true, 'morpheme_practice' => 8,
                'morpheme_family_listening' => $key, 'morpheme_panel' => $panel,
                'correct_feedback' => '¡Correcto! '.$options[$correct],
                'incorrect_feedback' => 'Escucha de nuevo y revisa el significado.'];
            EstadoContenido::assertReady($exercise);
            $record = new Actividad(KichwaResource::attributes('exercises', $exercise));
            $record->id_unidad = $unit->id_unidad;
            $record->origen_reactivo = $origin;
            $record->orden_actividad = 1 + (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
            $record->publicado = true;
            $record->save();
        }
    }

    private function thirdPlaceExercise(Unidad $unit): void
    {
        $origin = 'intermedio-m2-u1-posicion-tercero-v1';
        if (Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', $origin)->exists()) {
            return;
        }
        $exercise = $this->choice('Actividad 6. Escucha e identifica el lugar', 'Escucha el audio y selecciona la posición mencionada.', ['Primero', 'Tercero', 'Noveno'], 1);
        $exercise += ['zones' => [], 'resource' => null];
        $exercise['config'] += ['managed' => true, 'reviewed' => true, 'morpheme_practice' => 6,
            'morpheme_position' => 'tercero', 'correct_feedback' => '¡Correcto! Kimsaniki significa tercero.',
            'incorrect_feedback' => 'Escucha de nuevo y revisa la posición.'];
        EstadoContenido::assertReady($exercise);
        $record = new Actividad(KichwaResource::attributes('exercises', $exercise));
        $record->id_unidad = $unit->id_unidad;
        $record->origen_reactivo = $origin;
        $record->orden_actividad = 1 + (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
        $record->publicado = true;
        $record->save();
    }

    private function reorderExercises(Unidad $unit): void
    {
        $origins = ['intermedio-m2-u1-practica-1-v1',
            'intermedio-m2-u1-escucha-julio-v1', 'intermedio-m2-u1-escucha-manuelito-v1',
            'intermedio-m2-u1-escucha-marilin-v1', 'intermedio-m2-u1-escucha-luis-v1',
            'intermedio-m2-u1-practica-3-v1', 'intermedio-m2-u1-practica-5-v2',
            'intermedio-m2-u1-practica-6-v1', 'intermedio-m2-u1-posicion-tercero-v1',
            'intermedio-m2-u1-practica-7-v1',
            'intermedio-m2-u1-parentesco-escucha-laushushi-v1', 'intermedio-m2-u1-parentesco-escucha-layaya-v1',
            'intermedio-m2-u1-parentesco-escucha-lamama-v1', 'intermedio-m2-u1-parentesco-escucha-lachuri-v1'];
        $records = Actividad::where('id_unidad', $unit->id_unidad)->orderByDesc('publicado')->orderBy('orden_actividad')->get();
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

    /**
     * Mushuk Muyu, Nivel Elemental, “Nikichik yupaykuna”.
     * https://libros.kichwa.net/wp-content/uploads/2020/03/mushukmuyuelementalOK.pdf
     */
    private function ordinalExercise(): array
    {
        $ordinals = ['uno' => 'Shukniki', 'dos' => 'Ishkayniki', 'tres' => 'Kimsaniki',
            'cuatro' => 'Chuskuniki', 'cinco' => 'Pichkaniki', 'seis' => 'Suktaniki',
            'siete' => 'Kanchisniki', 'ocho' => 'Pusakniki', 'nueve' => 'Iskunniki'];
        $bank = ['nueve', 'cuatro', 'uno', 'siete', 'tres', 'ocho', 'dos', 'seis', 'cinco'];

        return ['type' => 'ordenar', 'prompt' => 'Coloca cada palabra en su lugar, del 1.º al 9.º.',
            'elements' => array_map(fn (string $id): array => ['id' => $id, 'texto' => $ordinals[$id]], $bank),
            'solution' => ['orden' => array_keys($ordinals)],
            'config' => ['title' => 'Actividad 5. Ordena los números ordinales',
                'correct_feedback' => '¡Correcto! Cada ordinal está en su lugar, del 1.º al 9.º.']];
    }
}
