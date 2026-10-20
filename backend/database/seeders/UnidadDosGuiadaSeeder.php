<?php

namespace Database\Seeders;

use App\Models\Actividad;
use App\Models\EvaluacionKichwa;
use App\Models\Tema;
use App\Models\Unidad;
use App\Services\EstadoContenido;
use App\Services\KichwaResource;
use App\Services\PublicacionContenido;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class UnidadDosGuiadaSeeder extends Seeder
{
    public const LESSON_KEY = 'basico-modulo1-unidad2-saludos-v1';

    public function run(): void
    {
        $this->call(UnidadUnoGuiadaSeeder::class);
        $images = [];
        foreach (['manana', 'tarde', 'noche'] as $time) {
            $images[$time] = $this->imagePath($time);
        }
        DB::transaction(function () use ($images): void {
            DB::select('SELECT pg_advisory_xact_lock(20261011)');
            if (Tema::where('clave_leccion', self::LESSON_KEY)->exists()) {
                return;
            }
            $firstLesson = Tema::where('clave_leccion', UnidadUnoGuiadaSeeder::LESSON_KEY)->firstOrFail();
            $firstUnit = Unidad::findOrFail($firstLesson->id_unidad);
            $unit = Unidad::where('id_modulo', $firstUnit->id_modulo)->where('orden_unidad', 2)->lockForUpdate()->first();
            if (! $unit) {
                $unit = Unidad::create(['id_modulo' => $firstUnit->id_modulo, 'orden_unidad' => 2,
                    'titulo_unidad' => 'Saludos y conversación', 'objetivo_unidad' => 'Saludar según el momento del día y conversar en kichwa.', 'publicado' => true]);
            }
            Actividad::where('id_unidad', $unit->id_unidad)->update(['publicado' => false]);
            EvaluacionKichwa::where('id_unidad', $unit->id_unidad)->update(['publicado' => false]);
            Tema::where('id_unidad', $unit->id_unidad)->update(['publicado' => false]);
            Tema::create(['id_unidad' => $unit->id_unidad, 'clave_leccion' => self::LESSON_KEY, 'tipo_tema' => 'vocabulario',
                'titulo_tema' => 'Saludos y conversación',
                'contenido_tema' => "Elige una expresión según lo que necesitas decir.\n\nPara saludar:\nAlli puncha = buenos días\nAlli chishi = buenas tardes\nAlli tuta = buenas noches\n\nPara conversar:\nImanalla kanki? = ¿Cómo estás?\nAllilla kani. = Estoy bien.\nMaymanta kanki? = ¿De dónde eres?\nMaypitak llankanki? = ¿Dónde trabajas?\n\nPara despedirse o ser amable:\nKayakaman = hasta mañana\nKipakaman = hasta luego\nYupaychani = gracias\nKishpichiway = perdón\n\nUn ejemplo de conversación:\nA: Imanalla kanki?\nB: Allilla kani.\nUna pregunta necesita una respuesta que trate del mismo tema.",
                'orden_tema' => 1 + (int) Tema::where('id_unidad', $unit->id_unidad)->max('orden_tema'), 'publicado' => true]);
            $bank = [
                ['time' => 'manana', 'answer' => 'puncha', 'choices' => ['chishi', 'puncha', 'tuta'], 'meaning' => 'buenos días', 'alt' => 'Amanecer en un pueblo andino: el sol aparece junto al horizonte y las nubes tienen tonos rosados.'],
                ['time' => 'tarde', 'answer' => 'chishi', 'choices' => ['chishi', 'tuta', 'puncha'], 'meaning' => 'buenas tardes', 'alt' => 'Un pueblo andino por la tarde, con cielo azul y el sol alto iluminando el paisaje.'],
                ['time' => 'noche', 'answer' => 'tuta', 'choices' => ['puncha', 'chishi', 'tuta'], 'meaning' => 'buenas noches', 'alt' => 'Un pueblo andino bajo un cielo oscuro con luna y estrellas y una ventana iluminada.'],
            ];
            $order = (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
            foreach ($bank as $item) {
                $exercise = ['type' => 'seleccion_multiple', 'prompt' => 'Observa la imagen. Elige el saludo en kichwa que corresponde al momento del día.',
                    'resource' => null, 'zones' => [],
                    'elements' => array_map(fn (string $word): array => ['id' => $word, 'texto' => 'Alli '.$word], $item['choices']),
                    'solution' => ['seleccion' => [$item['answer']]],
                    'config' => ['title' => '1. SALUDOS ( NAPAYKUNA )', 'prompt_image' => $images[$item['time']], 'prompt_image_alt' => $item['alt'],
                        'presentation' => 'buttons', 'max_selections' => 1, 'exact_selections' => true, 'managed' => true, 'reviewed' => true, 'difficulty' => 'inicial',
                        'correct_feedback' => 'Alli rurashka. Alli '.$item['answer'].' significa '.$item['meaning'].'.',
                        'incorrect_feedback' => 'Kutin rurapay. Observa la luz del cielo y vuelve a elegir el saludo.']];
                EstadoContenido::assertReady($exercise);
                $record = new Actividad(KichwaResource::attributes('exercises', $exercise));
                $record->id_unidad = $unit->id_unidad;
                $record->origen_reactivo = 'u2-guided-saludo-'.$item['time'].'-v1';
                $record->orden_actividad = ++$order;
                $record->publicado = true;
                $record->save();
            }
            $unit->update(['titulo_unidad' => 'Saludos y conversación', 'objetivo_unidad' => 'Saludar según el momento del día y conversar en kichwa.',
                'publicado' => true, 'configuracion' => array_replace($unit->configuracion ?? [], ['learning_mode' => 'guided', 'guided_lesson' => 'greetings'])]);
        });
        $this->refreshIllustrations($images);
        $this->seedListeningQuestions();
        $this->seedListeningGreetings();
        $this->refreshQuestionChoices();
        $this->seedConversationPairs();
        $this->splitConversationPairs();
        $this->seedFarewellAndCourtesy();
        PublicacionContenido::invalidate();
    }

    private function refreshQuestionChoices(): void
    {
        $images = [];
        foreach (['imatak', 'pitak-kan', 'imamanta'] as $name) {
            $source = resource_path('images/unidad2/preguntas/'.$name.'.png');
            $path = 'kichwa/imagenes/'.hash('sha256', hash_file('sha256', $source).':questions-webp640-q84').'.webp';
            if (! Storage::disk('public')->exists($path)) {
                $image = imagecreatefrompng($source);
                $small = imagescale($image, 640);
                ob_start();
                imagewebp($small, null, 84);
                $bytes = ob_get_clean();
                imagedestroy($small);
                imagedestroy($image);
                Storage::disk('public')->put($path, $bytes);
            }
            $images[$name] = $path;
        }
        DB::transaction(function () use ($images): void {
            DB::select('SELECT pg_advisory_xact_lock(20261011)');
            $lesson = Tema::where('clave_leccion', self::LESSON_KEY)->firstOrFail();
            $unit = Unidad::whereKey($lesson->id_unidad)->lockForUpdate()->firstOrFail();
            $previous = Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'u2-listening-questions-v1')->orderByDesc('id_actividad')->firstOrFail();
            if ($previous->tipo_actividad === 'completar' && ($previous->configuracion['title'] ?? '') === '2. PREGUNTAS Y RESPUESTAS ( TAPUYKUNA KUTICHIKUNAPASH )') {
                return;
            }
            $exercise = ['type' => 'completar', 'prompt' => 'Observa cada imagen y escucha su audio. Selecciona el significado correcto en español para cada pregunta.',
                'resource' => null, 'zones' => [],
                'elements' => [
                    ['id' => 'imatak', 'texto' => 'Pregunta 1', 'imagen' => $images['imatak'], 'opciones' => ['¿Quién es?', '¿Qué es?', '¿Por qué?']],
                    ['id' => 'pitak-kan', 'texto' => 'Pregunta 2', 'imagen' => $images['pitak-kan'], 'opciones' => ['¿Por qué?', '¿Quién es?', '¿Qué es?']],
                    ['id' => 'imamanta', 'texto' => 'Pregunta 3', 'imagen' => $images['imamanta'], 'opciones' => ['¿Qué es?', '¿Por qué?', '¿Quién es?']],
                ],
                'solution' => ['textos' => ['imatak' => ['¿Qué es?'], 'pitak-kan' => ['¿Quién es?'], 'imamanta' => ['¿Por qué?']]],
                'config' => array_replace($previous->configuracion, ['requires_images' => true, 'title' => '2. PREGUNTAS Y RESPUESTAS ( TAPUYKUNA KUTICHIKUNAPASH )'])];
            EstadoContenido::assertReady($exercise);
            $position = $previous->orden_actividad;
            $previous->update(['publicado' => false, 'orden_actividad' => 1 + (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad')]);
            $record = new Actividad(KichwaResource::attributes('exercises', $exercise));
            $record->id_unidad = $unit->id_unidad;
            $record->origen_reactivo = $previous->origen_reactivo;
            $record->orden_actividad = $position;
            $record->publicado = true;
            $record->save();
        });
    }

    private function seedConversationPairs(): void
    {
        DB::transaction(function (): void {
            DB::select('SELECT pg_advisory_xact_lock(20261011)');
            $lesson = Tema::where('clave_leccion', self::LESSON_KEY)->firstOrFail();
            $unit = Unidad::whereKey($lesson->id_unidad)->lockForUpdate()->firstOrFail();
            if (Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'u2-conversation-pairs-v1')->exists()) {
                return;
            }
            $groups = [
                'q' => [
                    ['Imanalla kanki?', '¿Cómo estás?'],
                    ['Maymanta kanki?', '¿De dónde eres?'],
                    ['Maypitak llankanki?', '¿Dónde trabajas?'],
                    ['Mashna watakunatatak charinki?', '¿Cuántos años tienes?'],
                    ['Llakillachu kanki?', '¿Estás triste?'],
                    ['Imata ruranki?', '¿Qué haces?'],
                ],
                'a' => [
                    ['Allilla kani', 'Estoy bien'],
                    ['Ambatomanta kani', 'Soy de Ambato'],
                    ['Quitupi llankani', 'Trabajo en Quito'],
                    ['Ishkay chunka watakuntami charini', 'Tengo 20 años'],
                    ['Ari', 'Sí'],
                    ['Nimata', 'Nada'],
                ],
            ];
            $elements = [];
            $pairs = [];
            foreach ($groups as $group => $rows) {
                foreach ($rows as $index => [$kichwa, $spanish]) {
                    $elements[] = ['id' => $group.'-'.$index, 'texto' => $kichwa, 'grupo' => 'origen'];
                    $pairs[] = ['origen' => $group.'-'.$index, 'destino' => 'es-'.$group.'-'.$index];
                }
                foreach ([3, 0, 5, 1, 4, 2] as $index) {
                    $elements[] = ['id' => 'es-'.$group.'-'.$index, 'texto' => $rows[$index][1], 'grupo' => 'destino'];
                }
            }
            $exercise = ['type' => 'relacionar', 'prompt' => 'Relaciona cada pregunta y cada respuesta en kichwa con su significado en español. Completa las seis parejas de cada bloque.',
                'resource' => null, 'zones' => [], 'elements' => $elements, 'solution' => ['pares' => $pairs],
                'config' => ['title' => 'Una pregunta y una respuesta en dos idiomas', 'conversation_pairs' => true,
                    'managed' => true, 'reviewed' => true, 'difficulty' => 'inicial',
                    'correct_feedback' => '¡Muy bien! Relacionaste las seis preguntas y las seis respuestas con su significado en español.',
                    'incorrect_feedback' => 'Revisa las parejas de preguntas y de respuestas. Cada expresión tiene su propio significado en español.']];
            EstadoContenido::assertReady($exercise);
            $record = new Actividad(KichwaResource::attributes('exercises', $exercise));
            $record->id_unidad = $unit->id_unidad;
            $record->origen_reactivo = 'u2-conversation-pairs-v1';
            $record->orden_actividad = 1 + (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
            $record->publicado = true;
            $record->save();
        });
    }

    private function splitConversationPairs(): void
    {
        DB::transaction(function (): void {
            DB::select('SELECT pg_advisory_xact_lock(20261011)');
            $lesson = Tema::where('clave_leccion', self::LESSON_KEY)->firstOrFail();
            $unit = Unidad::whereKey($lesson->id_unidad)->lockForUpdate()->firstOrFail();
            if (Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'u2-conversation-q-v2')->exists()) {
                return;
            }
            $previous = Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'u2-conversation-pairs-v1')->firstOrFail();
            $position = $previous->orden_actividad;
            foreach (Actividad::where('id_unidad', $unit->id_unidad)->where('orden_actividad', '>', $position)->orderByDesc('orden_actividad')->get() as $following) {
                $following->update(['orden_actividad' => $following->orden_actividad + 1]);
            }
            $previous->update(['publicado' => false, 'orden_actividad' => 2 + (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad')]);
            foreach (['q' => 'preguntas', 'a' => 'respuestas'] as $group => $label) {
                $exercise = ['type' => 'relacionar', 'prompt' => 'Relaciona las seis '.$label.' en kichwa con su significado en español.',
                    'resource' => null, 'zones' => [],
                    'elements' => array_values(array_filter($previous->elementos_actividad, fn ($element) => str_starts_with($element['id'], $group.'-') || str_starts_with($element['id'], 'es-'.$group.'-'))),
                    'solution' => ['pares' => array_values(array_filter($previous->solucion_actividad['pares'], fn ($pair) => str_starts_with($pair['origen'], $group.'-')))],
                    'config' => array_replace($previous->configuracion, ['conversation_group' => $group,
                        'title' => ucfirst($label).' y sus significados',
                        'correct_feedback' => '¡Muy bien! Relacionaste las seis '.$label.' con su significado en español.',
                        'incorrect_feedback' => 'Revisa las parejas de '.$label.' y vuelve a comprobar este ejercicio.'])];
                EstadoContenido::assertReady($exercise);
                $record = new Actividad(KichwaResource::attributes('exercises', $exercise));
                $record->id_unidad = $unit->id_unidad;
                $record->origen_reactivo = 'u2-conversation-'.$group.'-v2';
                $record->orden_actividad = $position++;
                $record->publicado = true;
                $record->save();
            }
        });
    }

    private function seedFarewellAndCourtesy(): void
    {
        DB::transaction(function (): void {
            DB::select('SELECT pg_advisory_xact_lock(20261011)');
            $lesson = Tema::where('clave_leccion', self::LESSON_KEY)->firstOrFail();
            $unit = Unidad::whereKey($lesson->id_unidad)->lockForUpdate()->firstOrFail();
            $groups = [
                'd' => ['title' => '3. DESPEDIDA ( CHIKANYARIKUNA )', 'rows' => [
                    ['Kipakaman', 'Hasta luego'], ['Kayakaman', 'Hasta mañana'], ['Shukti punchakama', 'Hasta otro día'],
                    ['Ashtak kaman', 'Hasta pronto'], ['Chisikaman', 'Hasta tarde'],
                ], 'order' => [3, 0, 4, 1, 2]],
                'c' => ['title' => '4. CORTESÍA ( ALLI KAWSAYMANTA RIMAYKUNA )', 'rows' => [
                    ['Alli shamushka', 'Bienvenido'], ['Yupaychani', 'Gracias'], ['Kishpichiway', 'Perdón'], ['Tiyaripay', 'Siéntese'],
                ], 'order' => [2, 0, 3, 1]],
            ];
            foreach ($groups as $group => $bank) {
                if (Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'u2-expressions-'.$group.'-v1')->exists()) {
                    continue;
                }
                $elements = [];
                $pairs = [];
                foreach ($bank['rows'] as $index => [$kichwa, $spanish]) {
                    $elements[] = ['id' => $group.'-'.$index, 'texto' => $kichwa, 'grupo' => 'origen'];
                    $pairs[] = ['origen' => $group.'-'.$index, 'destino' => 'es-'.$group.'-'.$index];
                }
                foreach ($bank['order'] as $index) {
                    $elements[] = ['id' => 'es-'.$group.'-'.$index, 'texto' => $bank['rows'][$index][1], 'grupo' => 'destino'];
                }
                $exercise = ['type' => 'relacionar', 'prompt' => 'Relaciona cada expresión en kichwa con su significado en español. Puedes escuchar cada expresión con su botón de audio.',
                    'resource' => null, 'zones' => [], 'elements' => $elements, 'solution' => ['pares' => $pairs],
                    'config' => ['title' => $bank['title'], 'conversation_pairs' => true, 'conversation_group' => $group,
                        'managed' => true, 'reviewed' => true, 'difficulty' => 'inicial',
                        'correct_feedback' => '¡Muy bien! Relacionaste todas las expresiones con su significado en español.',
                        'incorrect_feedback' => 'Escucha de nuevo las expresiones y revisa las parejas de este ejercicio.']];
                EstadoContenido::assertReady($exercise);
                $record = new Actividad(KichwaResource::attributes('exercises', $exercise));
                $record->id_unidad = $unit->id_unidad;
                $record->origen_reactivo = 'u2-expressions-'.$group.'-v1';
                $record->orden_actividad = 1 + (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
                $record->publicado = true;
                $record->save();
            }
        });
    }

    private function seedListeningGreetings(): void
    {
        DB::transaction(function (): void {
            DB::select('SELECT pg_advisory_xact_lock(20261011)');
            $lesson = Tema::where('clave_leccion', self::LESSON_KEY)->firstOrFail();
            $unit = Unidad::whereKey($lesson->id_unidad)->lockForUpdate()->firstOrFail();
            if (Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'u2-listening-greetings-v1')->exists()) {
                return;
            }
            $exercise = ['type' => 'completar', 'prompt' => 'Escucha cada oración. Selecciona la palabra que falta en las tres oraciones.',
                'resource' => null, 'zones' => [],
                'elements' => [
                    ['id' => 'alli-puncha-churi', 'texto' => 'Alli _____, churi.', 'opciones' => ['chishi', 'puncha', 'tuta', 'kaya']],
                    ['id' => 'alli-chishi-kusa', 'texto' => 'Alli _____, kusa.', 'opciones' => ['puncha', 'tuta', 'kaya', 'chishi']],
                    ['id' => 'alli-tuta-tayta', 'texto' => 'Alli _____, tayta.', 'opciones' => ['puncha', 'chishi', 'tuta', 'kaya']],
                ],
                'solution' => ['textos' => ['alli-puncha-churi' => ['puncha'], 'alli-chishi-kusa' => ['chishi'], 'alli-tuta-tayta' => ['tuta']]],
                'config' => ['title' => 'La palabra que falta', 'listening_greetings' => true,
                    'managed' => true, 'reviewed' => true, 'difficulty' => 'inicial',
                    'correct_feedback' => '¡Muy bien! Alli puncha churi: buenos días, hijo. Alli chishi kusa: buenas tardes, marido. Alli tuta tayta: buenas noches, papá.',
                    'incorrect_feedback' => 'Escucha de nuevo las tres oraciones y revisa la palabra que completa cada saludo.']];
            EstadoContenido::assertReady($exercise);
            $position = Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'u2-listening-questions-v1')->where('publicado', true)->value('orden_actividad');
            foreach (Actividad::where('id_unidad', $unit->id_unidad)->where('orden_actividad', '>=', $position)->orderByDesc('orden_actividad')->get() as $following) {
                $following->update(['orden_actividad' => $following->orden_actividad + 1]);
            }
            $record = new Actividad(KichwaResource::attributes('exercises', $exercise));
            $record->id_unidad = $unit->id_unidad;
            $record->origen_reactivo = 'u2-listening-greetings-v1';
            $record->orden_actividad = $position;
            $record->publicado = true;
            $record->save();
        });
    }

    private function seedListeningQuestions(): void
    {
        DB::transaction(function (): void {
            DB::select('SELECT pg_advisory_xact_lock(20261011)');
            $lesson = Tema::where('clave_leccion', self::LESSON_KEY)->firstOrFail();
            $unit = Unidad::whereKey($lesson->id_unidad)->lockForUpdate()->firstOrFail();
            if (Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'u2-listening-questions-v1')->exists()) {
                return;
            }
            $exercise = ['type' => 'relacionar',
                'prompt' => 'Escucha un audio. Selecciona ese audio y luego su significado en español. Completa las tres parejas.',
                'resource' => null, 'zones' => [],
                'elements' => [
                    ['id' => 'imatak', 'texto' => 'Audio 1', 'grupo' => 'origen'],
                    ['id' => 'pitak-kan', 'texto' => 'Audio 2', 'grupo' => 'origen'],
                    ['id' => 'imamanta', 'texto' => 'Audio 3', 'grupo' => 'origen'],
                    ['id' => 'por-que', 'texto' => '¿Por qué?', 'grupo' => 'destino'],
                    ['id' => 'que-es', 'texto' => '¿Qué es?', 'grupo' => 'destino'],
                    ['id' => 'quien-es', 'texto' => '¿Quién es?', 'grupo' => 'destino'],
                ],
                'solution' => ['pares' => [
                    ['origen' => 'imatak', 'destino' => 'que-es'],
                    ['origen' => 'pitak-kan', 'destino' => 'quien-es'],
                    ['origen' => 'imamanta', 'destino' => 'por-que'],
                ]],
                'config' => ['title' => '1. PREGUNTAS Y RESPUESTAS ( TAPUYKUNA KUTICHIKUNAPASH)',
                    'listening_questions' => true, 'managed' => true, 'reviewed' => true, 'difficulty' => 'inicial',
                    'correct_feedback' => '¡Muy bien! Imatak = ¿Qué es?; Pitak kan = ¿Quién es?; Imamanta = ¿Por qué?',
                    'incorrect_feedback' => 'Escucha de nuevo cada pregunta y revisa su significado en español.']];
            EstadoContenido::assertReady($exercise);
            $record = new Actividad(KichwaResource::attributes('exercises', $exercise));
            $record->id_unidad = $unit->id_unidad;
            $record->origen_reactivo = 'u2-listening-questions-v1';
            $record->orden_actividad = 1 + (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
            $record->publicado = true;
            $record->save();
        });
    }

    private function refreshIllustrations(array $images): void
    {
        DB::transaction(function () use ($images): void {
            DB::select('SELECT pg_advisory_xact_lock(20261011)');
            $lesson = Tema::where('clave_leccion', self::LESSON_KEY)->firstOrFail();
            $unit = Unidad::whereKey($lesson->id_unidad)->lockForUpdate()->firstOrFail();
            $body = str_replace(['Kayakama = hasta mañana', 'Tupananchikkama = hasta luego'], ['Kayakaman = hasta mañana', 'Kipakaman = hasta luego'], $lesson->contenido_tema);
            if ($body !== $lesson->contenido_tema) {
                $lesson->update(['contenido_tema' => $body]);
            }
            $scenes = [
                'manana' => ['time' => '08:00', 'alt' => 'Mañana en los Andes: cielo azul claro, sol brillante y neblina fresca en el valle.'],
                'tarde' => ['time' => '17:30', 'alt' => 'Tarde en los Andes: cielo naranja y dorado con el sol bajo y sombras alargadas.'],
                'noche' => ['time' => '21:00', 'alt' => 'Noche en los Andes: cielo oscuro con luna y estrellas y una ventana iluminada.'],
            ];
            foreach ($scenes as $scene => $details) {
                $record = Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'u2-guided-saludo-'.$scene.'-v1')->orderByDesc('id_actividad')->lockForUpdate()->firstOrFail();
                $config = array_replace($record->configuracion, ['prompt_image' => $images[$scene], 'prompt_image_alt' => $details['alt'], 'context_text' => $details['time'], 'title' => '1. SALUDOS ( NAPAYKUNA )']);
                if ($record->configuracion === $config) {
                    continue;
                }
                if (DB::table('respuestas_actividad')->where('id_actividad', $record->id_actividad)->exists()) {
                    $replacement = $record->replicate();
                    $position = $record->orden_actividad;
                    $record->update(['publicado' => false, 'orden_actividad' => 1 + (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad')]);
                    $replacement->configuracion = $config;
                    $replacement->orden_actividad = $position;
                    $replacement->save();
                } else {
                    $record->update(['configuracion' => $config]);
                }
            }
        });
    }

    private function imagePath(string $time): string
    {
        $source = resource_path('images/unidad2/'.$time.($time === 'noche' ? '' : '-v2').'.png');
        $path = 'kichwa/imagenes/'.hash('sha256', hash_file('sha256', $source).':webp-480-q78-v2').'.webp';
        if (! Storage::disk('public')->exists($path)) {
            $image = imagecreatefrompng($source);
            $small = imagescale($image, 480);
            ob_start();
            imagewebp($small, null, 78);
            $bytes = ob_get_clean();
            imagedestroy($image);
            imagedestroy($small);
            if (! Storage::disk('public')->put($path, $bytes)) {
                throw new \RuntimeException('No se pudo guardar la ilustración de '.$time.'.');
            }
        }

        return $path;
    }
}
