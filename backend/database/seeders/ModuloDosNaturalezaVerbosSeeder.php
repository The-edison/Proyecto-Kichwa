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
use Illuminate\Support\Facades\Storage;

class ModuloDosNaturalezaVerbosSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            DB::select('SELECT pg_advisory_xact_lock(20261112)');

            foreach (['nature' => $this->natureExercises(), 'verbs' => $this->verbExercises()] as $lesson => $exercises) {
                $topic = Tema::where('clave_leccion', 'basico-modulo2-unidad'.($lesson === 'nature' ? 3 : 4)."-$lesson-v1")->firstOrFail();
                $unit = Unidad::whereKey($topic->id_unidad)->lockForUpdate()->firstOrFail();
                Actividad::where('id_unidad', $unit->id_unidad)->update(['publicado' => false]);
                $order = (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');

                foreach ($exercises as $index => $exercise) {
                    $origin = "m2-{$lesson}-varied-".($index + 1).'-v1';
                    $visual = $exercise['config']['visual_word'];
                    $exercise['config']['prompt_image'] = $lesson === 'verbs' ? $this->verbImage($visual) : $this->natureImage($visual);
                    $exercise['config']['prompt_image_alt'] = $lesson === 'verbs' ? $this->verbImageAlt($visual) : $this->natureImageAlt($visual);
                    $exercise['config'] += [
                        'managed' => true,
                        'reviewed' => true,
                        'difficulty' => 'inicial',
                        'topic_practice' => true,
                    ];
                    EstadoContenido::assertReady($exercise);
                    $record = Actividad::where('id_unidad', $unit->id_unidad)
                        ->where('origen_reactivo', $origin)->orderByDesc('id_actividad')->first();
                    if ($record === null) {
                        $record = new Actividad;
                        $record->id_unidad = $unit->id_unidad;
                        $record->origen_reactivo = $origin;
                    }
                    $attributes = KichwaResource::attributes('exercises', $exercise);
                    $contentChanged = $record->exists && collect($attributes)
                        ->contains(fn ($value, $key): bool => $record->getAttribute($key) != $value);
                    if ($contentChanged
                        && DB::table('respuestas_actividad')->where('id_actividad', $record->id_actividad)->exists()) {
                        $position = $record->orden_actividad;
                        $record->orden_actividad = ++$order;
                        $record->save();
                        $record = new Actividad;
                        $record->id_unidad = $unit->id_unidad;
                        $record->origen_reactivo = $origin;
                        $record->orden_actividad = $position;
                    }
                    $record->fill($attributes);
                    if (! $record->exists) {
                        $record->orden_actividad = ++$order;
                    }
                    $record->publicado = true;
                    $record->save();
                }
            }
        });

        PublicacionContenido::invalidate();
    }

    private function natureExercises(): array
    {
        return [
            $this->choice('El sol en el paisaje', 'Observa el sol. ¿Cómo se dice «sol» en kichwa?', ['inti', 'killa', 'tamya', 'wayra'], 'inti', 'inti'),
            $this->fill('La luna de noche', 'Observa la luna y elige su nombre en kichwa.', 'luna → _____', ['killa', 'yaku', 'wasi', 'urku'], 'killa', 'killa'),
            $this->choice('El agua del río', 'Observa el agua del río. ¿Cómo se dice «agua» en kichwa?', ['allpa', 'yaku', 'wayra', 'tamya'], 'yaku', 'yaku'),
            $this->choice('La montaña', 'Observa la montaña. ¿Qué palabra la nombra?', ['tamya', 'urku', 'yura', 'punku'], 'urku', 'urku'),
            $this->fill('Escribe lluvia', 'Observa la lluvia y escribe su nombre en kichwa.', 'lluvia → _____', [], 'tamya', 'tamya'),
            $this->choice('Killa en el calendario', 'Cuando hablamos del calendario, ¿qué significa «killa»?', ['luna', 'mes', 'sol', 'día'], 'mes', 'calendar'),
            $this->fill('La casa andina', 'Observa la casa y elige su nombre en kichwa.', 'casa → _____', ['wasi', 'yura', 'punku', 'tuku', 'urku', 'allpa'], 'wasi', 'wasi'),
            $this->choice('El árbol del paisaje', 'Observa el árbol. ¿Cómo se dice «árbol» en kichwa?', ['yura', 'wasi', 'urku', 'punku'], 'yura', 'yura'),
            $this->choice('La puerta', '¿Cuál es el nombre en kichwa de una puerta?', ['tuku', 'punku', 'wasi', 'allpa'], 'punku', 'punku'),
            $this->fill('Escribe ventana', 'Observa la ventana y escribe su nombre en kichwa.', 'ventana → _____', [], 'tuku', 'tuku'),
        ];
    }

    private function verbExercises(): array
    {
        return [
            $this->choice('La acción de comer', '¿Qué verbo kichwa significa «comer»?', ['upyana', 'mikuna', 'yanuna', 'purina'], 'mikuna', 'mikuna'),
            $this->fill('La acción de beber', 'Observa a la persona beber agua y elige el verbo kichwa.', 'beber → _____', ['mikuna', 'upyana', 'uyana', 'rikuna', 'yanuna', 'puñuna'], 'upyana', 'upyana'),
            $this->fill('Escribe la acción de dormir', 'Observa a la persona dormir y escribe el verbo en kichwa.', 'dormir → _____', [], 'puñuna', 'puñuna'),
            $this->fill('La acción de caminar', 'Observa a la persona caminar y elige el verbo en kichwa.', 'caminar → _____', ['purina', 'puñuna', 'rikuna', 'yachana', 'tarpuna', 'llamkana'], 'purina', 'purina'),
            $this->choice('La acción de escribir', 'Observa a la estudiante. ¿Qué verbo kichwa significa «escribir»?', ['killkana', 'yachana', 'rikuna', 'pichana'], 'killkana', 'killkana'),
            $this->choice('La acción de limpiar', '¿Cuál de estos verbos significa «limpiar»?', ['pichana', 'yanuna', 'yachana', 'tarpuna'], 'pichana', 'pichana'),
            $this->fill('La acción de aprender', 'Observa a la estudiante y elige el verbo kichwa para «aprender».', 'aprender → _____', ['llamkana', 'yachana', 'rikuna', 'uyana', 'killkana', 'pichana'], 'yachana', 'yachana'),
            $this->choice('La acción de trabajar', '¿Qué verbo kichwa significa «trabajar»?', ['killkana', 'llamkana', 'puñuna', 'pichana'], 'llamkana', 'llamkana'),
            $this->choice('La acción de cocinar', 'Observa a la persona cocinar. ¿Qué verbo kichwa significa «cocinar»?', ['yanuna', 'tarpuna', 'mikuna', 'upyana'], 'yanuna', 'yanuna'),
            $this->fill('La acción de sembrar', 'Observa a la persona sembrar semillas y elige el verbo en kichwa.', 'sembrar → _____', ['tarpuna', 'yanuna', 'purina', 'pichana', 'rikuna', 'killkana'], 'tarpuna', 'tarpuna'),
        ];
    }

    private function choice(string $title, string $prompt, array $options, string $answer, string $visual): array
    {
        $elements = [];
        $solution = null;
        foreach ($options as $index => $option) {
            $id = 'option-'.$index;
            $elements[] = ['id' => $id, 'texto' => $option];
            if ($option === $answer) {
                $solution = $id;
            }
        }

        $correctFeedback = $visual === 'calendar'
            ? 'Correcto: en un calendario, «killa» significa «mes»; al hablar del cielo, significa «luna».'
            : "Correcto: la respuesta es «{$answer}».";

        return ['type' => 'seleccion_multiple', 'prompt' => $prompt, 'elements' => $elements, 'zones' => [],
            'resource' => null, 'solution' => ['seleccion' => [$solution]],
            'config' => ['title' => $title, 'visual_word' => $visual, 'presentation' => 'buttons',
                'max_selections' => 1, 'exact_selections' => true,
                'correct_feedback' => $correctFeedback,
                'incorrect_feedback' => 'Revisa el significado en la lección y vuelve a elegir.']];
    }

    private function fill(string $title, string $prompt, string $label, array $options, string $answer, string $visual): array
    {
        $element = ['id' => 'word', 'texto' => $label];
        if ($options !== []) {
            $element['opciones'] = $options;
        }

        $config = ['title' => $title, 'visual_word' => $visual];
        if ($options !== []) {
            $config['verb_fill'] = true;
        }
        $config['correct_feedback'] = "Correcto: la palabra en kichwa es «{$answer}».";
        $config['incorrect_feedback'] = 'Repasa el nombre de esta acción o elemento en la lección e inténtalo de nuevo.';

        return ['type' => 'completar', 'prompt' => $prompt, 'elements' => [$element], 'zones' => [],
            'resource' => null, 'solution' => ['textos' => ['word' => [$answer]]],
            'config' => $config];
    }

    private function verbImage(string $verb): string
    {
        $filename = ['mikuna' => 'mikuna-comer', 'upyana' => 'upyana-beber', 'puñuna' => 'pununa-dormir',
            'purina' => 'purina-caminar', 'killkana' => 'killkana-escribir', 'pichana' => 'pichana-limpiar',
            'yachana' => 'yachana-aprender', 'llamkana' => 'llamkana-trabajar', 'yanuna' => 'yanuna-cocinar',
            'tarpuna' => 'tarpuna-sembrar'][$verb];
        $source = resource_path("images/modulo2/verbos/$filename.png");

        return $this->storeIllustration($source, 'verb-fill-v1');
    }

    private function natureImage(string $word): string
    {
        $filename = ['inti' => 'inti-sol', 'killa' => 'killa-luna', 'yaku' => 'yaku-agua',
            'urku' => 'urku-montana', 'tamya' => 'tamya-lluvia', 'wasi' => 'wasi-casa',
            'yura' => 'yura-arbol', 'punku' => 'punku-puerta', 'tuku' => 'tuku-ventana'];
        $source = $word === 'calendar' ? resource_path('images/calendario-killa-contexto.png')
            : resource_path('images/modulo2/naturaleza/'.$filename[$word].'.png');

        return $this->storeIllustration($source, 'nature-exercise-v1');
    }

    private function storeIllustration(string $source, string $version): string
    {
        $path = 'kichwa/imagenes/'.hash('sha256', hash_file('sha256', $source).":$version").'.webp';
        if (! Storage::disk('public')->exists($path)) {
            $image = imagecreatefrompng($source);
            ob_start();
            imagewebp($image, null, 86);
            $bytes = ob_get_clean();
            imagedestroy($image);
            if (! Storage::disk('public')->put($path, $bytes)) {
                throw new \RuntimeException('No se pudo guardar la ilustración del verbo.');
            }
        }

        return $path;
    }

    private function natureImageAlt(string $word): string
    {
        return ['inti' => 'El sol ilumina un paisaje andino.', 'killa' => 'La luna brilla en el cielo nocturno.',
            'yaku' => 'Agua de un río que corre entre rocas.', 'urku' => 'Una montaña andina de cima nevada.',
            'tamya' => 'La lluvia cae sobre una chacra.', 'calendar' => 'Un calendario mensual con sus casillas.',
            'wasi' => 'Una casa andina de adobe.', 'yura' => 'Un árbol en el paisaje andino.',
            'punku' => 'Una puerta de madera en una casa.', 'tuku' => 'Una ventana abierta en una casa.'][$word];
    }

    private function verbImageAlt(string $verb): string
    {
        return ['mikuna' => 'Una niña come.', 'upyana' => 'Una estudiante bebe agua.',
            'puñuna' => 'Una niña duerme.', 'purina' => 'Una persona camina por un sendero andino.',
            'killkana' => 'Una estudiante escribe en un cuaderno.', 'pichana' => 'Una persona barre el suelo.',
            'yachana' => 'Una estudiante aprende con ayuda de un libro.', 'llamkana' => 'Una artesana trabaja en un telar.',
            'yanuna' => 'Una persona cocina una sopa.', 'tarpuna' => 'Una persona siembra semillas en la tierra.'][$verb];
    }

    private function matching(string $title, string $prompt, array $pairs, string $visual): array
    {
        $elements = [];
        $solution = [];
        foreach ($pairs as $index => [$spanish, $kichwa]) {
            $elements[] = ['id' => 'es-'.$index, 'texto' => $spanish, 'grupo' => 'origen'];
            $solution[] = ['origen' => 'es-'.$index, 'destino' => 'qu-'.$index];
        }
        foreach (array_reverse(array_keys($pairs)) as $index) {
            $elements[] = ['id' => 'qu-'.$index, 'texto' => $pairs[$index][1], 'grupo' => 'destino'];
        }

        return ['type' => 'relacionar', 'prompt' => $prompt, 'elements' => $elements, 'zones' => [],
            'resource' => null, 'solution' => ['pares' => $solution],
            'config' => ['title' => $title, 'visual_word' => $visual,
                'correct_feedback' => 'Correcto: relacionaste cada palabra con su significado.',
                'incorrect_feedback' => 'Revisa cada significado en la lección y cambia las parejas que no coincidan.']];
    }

    private function ordering(string $title, string $prompt, string $word, string $visual): array
    {
        $letters = preg_split('//u', $word, -1, PREG_SPLIT_NO_EMPTY);
        $elements = [];
        $order = [];
        foreach (array_reverse($letters) as $index => $letter) {
            $id = 'letter-'.$index;
            $elements[] = ['id' => $id, 'texto' => $letter];
            $order[] = $id;
        }

        return ['type' => 'ordenar', 'prompt' => $prompt, 'elements' => $elements, 'zones' => [],
            'resource' => null, 'solution' => ['orden' => array_reverse($order)],
            'config' => ['title' => $title, 'visual_word' => $visual, 'presentation' => 'tiles',
                'correct_feedback' => "Correcto: formaste «{$word}».",
                'incorrect_feedback' => 'Revisa el orden de las letras y usa cada ficha una sola vez.']];
    }
}
