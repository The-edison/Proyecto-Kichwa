<?php

namespace Database\Seeders;

use App\Models\Actividad;
use App\Models\EvaluacionKichwa;
use App\Models\Modulo;
use App\Models\Nivel;
use App\Models\Pregunta;
use App\Models\Tema;
use App\Models\Unidad;
use App\Services\EstadoContenido;
use App\Services\KichwaResource;
use App\Services\PublicacionContenido;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class IntermedioModuloUnoCompletoSeeder extends Seeder
{
    private const BANK_KEY = 'intermedio-modulo1-ampliacion-v1';

    public function run(): void
    {
        $this->publishMorphemeImages();
        DB::transaction(function (): void {
            DB::select('SELECT pg_advisory_xact_lock(20261110)');
            $level = Nivel::where('orden_nivel', 2)->firstOrFail();
            $module = Modulo::where('id_nivel', $level->id_nivel)->where('orden_modulo', 1)->firstOrFail();
            $units = Unidad::where('id_modulo', $module->id_modulo)->orderBy('orden_unidad')->get()->keyBy('orden_unidad');
            if ($units->count() !== 5) {
                throw new \RuntimeException('El módulo intermedio 1 necesita sus cinco unidades antes de ampliarse.');
            }

            foreach ($this->banks() as $unitNumber => $bank) {
                $unit = $units[$unitNumber];
                $this->addExamples($unit, $bank['examples']);
                $this->addExercises($unit, $unitNumber, $bank['pairs']);
                if ($unitNumber === 1) {
                    $this->updateUnitOneOriginals($unit);
                    $this->curateUnitOne($unit);
                } elseif (in_array($unitNumber, [2, 3], true)) {
                    $this->addMorphemeReadings($unit, $unitNumber);
                } elseif (in_array($unitNumber, [4, 5], true)) {
                    $this->addSentenceReadings($unit, $unitNumber);
                }
                $this->makeGuided($unit);
                if ($unitNumber === 1) {
                    $this->mixUnitOneExercises($unit);
                } elseif (in_array($unitNumber, [2, 3], true)) {
                    $this->curateMorphemeUnit($unit, $unitNumber);
                } elseif (in_array($unitNumber, [4, 5], true)) {
                    $this->curateSentenceUnit($unit, $unitNumber);
                }
            }
            $this->addFinal($module, $units);
            $this->updateUnitOneFinalImages($module);
            $this->updateMorphemeFinalImages($module);
        });
        PublicacionContenido::invalidate();
    }

    private function addExamples(Unidad $unit, array $examples): void
    {
        foreach ($examples as $topicOrder => $lines) {
            $topic = Tema::where('id_unidad', $unit->id_unidad)->where('orden_tema', $topicOrder)->firstOrFail();
            if (str_contains($topic->contenido_tema, 'Más ejemplos para practicar')) {
                continue;
            }
            $topic->update(['contenido_tema' => $topic->contenido_tema."\n\nMás ejemplos para practicar\n".implode("\n", $lines)]);
        }
    }

    private function addExercises(Unidad $unit, int $unitNumber, array $pairs): void
    {
        $image = 'kichwa/imagenes/intermediom1u'.$unitNumber.'.png';
        $order = (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
        $exercises = [];
        foreach (array_chunk($pairs, 4) as $group => $chunk) {
            $elements = [];
            $solution = [];
            foreach ($chunk as $index => [$kichwa, $meaning]) {
                $elements[] = ['id' => 'k'.$index, 'texto' => $kichwa, 'grupo' => 'origen'];
                $solution[] = ['origen' => 'k'.$index, 'destino' => 'e'.$index];
            }
            foreach (array_reverse(array_keys($chunk)) as $index) {
                $elements[] = ['id' => 'e'.$index, 'texto' => $chunk[$index][1], 'grupo' => 'destino'];
            }
            $exercises[] = ['type' => 'relacionar', 'prompt' => 'Relaciona cada expresión kichwa con su significado.',
                'elements' => $elements, 'solution' => ['pares' => $solution],
                'config' => ['title' => 'Conecta las ideas · '.$this->focus($unitNumber, $group), 'prompt_image' => $unitNumber === 1 ? $this->unitOneImage($group + 4) : ($this->morphemeImage($unitNumber, $group) ?? $image)]];
        }
        foreach (range(0, 7) as $index) {
            [$kichwa, $meaning] = $pairs[$index + 4];
            $options = [$meaning, $pairs[($index + 9) % 16][1], $pairs[($index + 13) % 16][1]];
            $correct = $index % 3;
            $rotated = array_merge(array_slice($options, 3 - $correct), array_slice($options, 0, 3 - $correct));
            $exercises[] = $this->choice('Interpreta la expresión', '¿Qué significa «'.$kichwa.'»?', $rotated, $correct,
                $unitNumber === 1 ? $this->unitOneImage($index + 8) : ($this->morphemeImage($unitNumber, (int) floor($index / 3)) ?? $image), $kichwa.' significa «'.$meaning.'».');
        }
        foreach (array_chunk(array_slice($pairs, 0, 12), 3) as $group => $chunk) {
            $elements = [];
            $solutions = [];
            foreach ($chunk as $index => [$kichwa, $meaning]) {
                $id = 'r'.$index;
                $elements[] = ['id' => $id, 'texto' => $meaning.' → _____',
                    'opciones' => [$kichwa, $pairs[($group * 3 + $index + 5) % 16][0], $pairs[($group * 3 + $index + 9) % 16][0]]];
                $solutions[$id] = [$kichwa];
            }
            $exercises[] = ['type' => 'completar', 'prompt' => 'Lee las pistas en español y completa las tres expresiones en kichwa.',
                'elements' => $elements, 'solution' => ['textos' => $solutions],
                'config' => ['title' => 'Completa el desafío · Parte '.($group + 1), 'prompt_image' => $unitNumber === 1 ? $this->unitOneImage($group + 16) : ($this->morphemeImage($unitNumber, $group) ?? $image)]];
        }

        foreach ($exercises as $index => $exercise) {
            $origin = self::BANK_KEY.'-u'.$unitNumber.'-'.($index + 1);
            $scene = $this->morphemeExerciseScene($unitNumber, $index + 1);
            if ($scene !== null) {
                $exercise['config']['prompt_image'] = $this->morphemeImage($unitNumber, $scene);
            }
            $unitTwoVisual = [1 => 'tema', 5 => 'hermana', 15 => 'objeto', 16 => 'lugar'][$index + 1] ?? null;
            if ($unitNumber === 2 && $unitTwoVisual !== null) {
                $exercise['config']['prompt_image'] = $this->unitTwoVisual($unitTwoVisual);
            }
            $unitThreeVisual = [1 => 'compania', 3 => 'motivo', 4 => 'abundancia', 5 => 'compania', 9 => 'pormama', 16 => 'motivo'][$index + 1] ?? null;
            if ($unitNumber === 3 && $unitThreeVisual !== null) {
                $exercise['config']['prompt_image'] = $this->unitThreeVisual($unitThreeVisual);
            }
            $exercise += ['zones' => [], 'resource' => null];
            $exercise['config'] += ['managed' => true, 'reviewed' => true, 'difficulty' => 'intermedio',
                'prompt_image_alt' => $unitNumber === 1 ? $this->unitOneImageAlt($exercise['config']['prompt_image']) : ($this->unitTwoVisualAlt($exercise['config']['prompt_image']) ?? $this->unitThreeVisualAlt($exercise['config']['prompt_image']) ?? $this->morphemeImageAlt($unitNumber, $exercise['config']['prompt_image']) ?? $this->imageAlt($unitNumber)),
                'correct_feedback' => '¡Muy bien! Continúa con el siguiente desafío.',
                'incorrect_feedback' => 'Repasa los ejemplos de la unidad y vuelve a intentarlo.'];
            EstadoContenido::assertReady($exercise);
            $existing = Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', $origin)
                ->orderByDesc('publicado')->orderByDesc('id_actividad')->first();
            if ($existing) {
                if (in_array($unitNumber, [1, 2, 3], true)) {
                    $this->updateExerciseImage($existing, $exercise['config']['prompt_image'], $exercise['config']['prompt_image_alt']);
                }

                continue;
            }
            if (Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', $origin)->exists()) {
                continue;
            }
            $record = new Actividad(KichwaResource::attributes('exercises', $exercise));
            $record->id_unidad = $unit->id_unidad;
            $record->id_tema = null;
            $record->origen_reactivo = $origin;
            $record->orden_actividad = ++$order;
            $record->publicado = true;
            $record->save();
        }
    }

    private function unitOneImages(): array
    {
        return [
            1 => ['intermediom1ejercicio01.png', 'Una mujer trabaja en la chacra y tiene agua cerca durante el día.'],
            2 => ['intermediom1ejercicio02.png', 'Dos hermanos salen de la escuela y uno observa a un perro en un recuerdo del día anterior.'],
            3 => ['intermediom1ejercicio03.png', 'Una familia prepara semillas al amanecer antes de ir a sembrar a la chacra.'],
            4 => ['intermediom1ejercicio04.png', 'Un calendario junto a una chacra representa ayer, hoy y mañana.'],
            5 => ['intermediom1ejercicio05.png', 'Una mujer recuerda un viaje a la escuela y mira un camino por recorrer.'],
            6 => ['intermediom1ejercicio06.png', 'En la chacra unas personas siembran, trabajan, beben agua y recorren un camino.'],
            7 => ['intermediom1ejercicio07.png', 'Una familia andina camina hacia la chacra mientras otras personas trabajan y preparan semillas.'],
            8 => ['intermediom1recuerdo.png', 'Una mujer recuerda el pasado al mirar una fotografía antigua de su camino a la escuela.'],
            9 => ['intermediom1ejercicio09.png', 'Una persona prepara su camino hacia la chacra para una acción que sucederá después.'],
            10 => ['intermediom1rirkani.png', 'Una persona llega a una escuela andina después de caminar por el sendero.'],
            11 => ['intermediom1ejercicio11.png', 'Un niño observa a un perro junto al camino de una escuela andina.'],
            12 => ['intermediom1tarpushun.png', 'Familia prepara semillas de maíz para sembrarlas en una chacra al amanecer.'],
            13 => ['intermediom1ejercicio13.png', 'Una persona se dispone a beber agua de una jarra después de trabajar en la chacra.'],
            14 => ['intermediom1llankani.png', 'Una persona trabaja la tierra entre plantas de maíz bajo el sol del mediodía.'],
            15 => ['intermediom1ejercicio15.png', 'Una persona prepara su bolso antes de salir por un camino hacia la chacra.'],
            16 => ['intermediom1ejercicio16.png', 'Un calendario de tres días representa hoy, ayer y mañana en una comunidad andina.'],
            17 => ['intermediom1ejercicio17.png', 'Una mujer recuerda el pasado, actúa en el presente y prepara semillas para el futuro.'],
            18 => ['intermediom1ejercicio18.png', 'Una persona recuerda un viaje, observa a un perro y prepara semillas para sembrar.'],
            19 => ['intermediom1ejercicio19.png', 'Un trabajador de la chacra se dispone a beber agua y luego emprender un viaje.'],
        ];
    }

    private function unitOneImage(int $order): string
    {
        return 'kichwa/imagenes/'.$this->unitOneImages()[$order][0];
    }

    private function unitOneImageAlt(?string $image): ?string
    {
        foreach ($this->unitOneImages() as [$filename, $alt]) {
            if ($image === 'kichwa/imagenes/'.$filename) {
                return $alt;
            }
        }

        return null;
    }

    private function morphemeImages(): array
    {
        return [
            2 => [
                ['pertenencia', 'Una madre y su hijo muestran su casa familiar en una comunidad andina.'],
                ['destino', 'Una mujer camina por un sendero hacia su casa andina.'],
                ['chacra', 'Una persona trabaja en la chacra, con su casa al fondo.'],
            ],
            3 => [
                ['compania', 'Dos compañeros caminan juntos hacia una comunidad andina.'],
                ['limite', 'Una madre y su hijo siguen un sendero hasta la escuela.'],
                ['motivo', 'Una persona trabaja para su hijo junto a una canasta llena de frutas.'],
            ],
        ];
    }

    private function sentenceVisuals(): array
    {
        return [
            4 => [
                'tiempo' => ['tiempo', 'Calendario con ayer: kayna, hoy: kunan y mañana: kaya.'],
                'oraciones' => ['oraciones', 'Tres escenas muestran ayer fui, hoy voy y mañana iré.'],
                'lugar' => ['lugar', 'Kaypi significa aquí, kaypimi precisamente aquí y alli bien.'],
                'ampliacion' => ['ampliacion', 'Una oración se amplía con referencias de tiempo, lugar y modo.'],
            ],
            5 => [
                'afirmacion' => ['afirmacion', 'Ejemplos de afirmación con -mi y negación con mana y -chu.'],
                'negacion' => ['negacion', 'Una persona va y otra no va: contraste entre rini y mana rinichu.'],
                'pregunta' => ['pregunta', 'Una persona pregunta rinkichu y otra responde sí o no.'],
                'duda' => ['duda', 'Cielo con nubes y posible lluvia: -cha y -chari expresan quizá.'],
                'modalidades' => ['modalidades', 'Un esquema distingue negación con mana…-chu, pregunta con -chu y duda con -cha.'],
                'frases' => ['frases', 'Tres frases ilustran no voy, no trabajaré y la pregunta ¿irás?'],
            ],
        ];
    }

    private function sentenceVisual(int $unitNumber, string $key): string
    {
        return 'kichwa/imagenes/intermediom1u'.$unitNumber.$key.'.webp';
    }

    private function sentenceVisualAlt(int $unitNumber, string $key): string
    {
        return $this->sentenceVisuals()[$unitNumber][$key][1];
    }

    private function morphemeImage(int $unitNumber, int $scene): ?string
    {
        $name = $this->morphemeImages()[$unitNumber][$scene % 3][0] ?? null;

        return $name === null ? null : 'kichwa/imagenes/intermediom1u'.$unitNumber.$name.'.webp';
    }

    private function morphemeImageAlt(int $unitNumber, ?string $image): ?string
    {
        foreach ($this->morphemeImages()[$unitNumber] ?? [] as $scene => [, $alt]) {
            if ($image === $this->morphemeImage($unitNumber, $scene)) {
                return $alt;
            }
        }

        return null;
    }

    private function unitTwoVisuals(): array
    {
        return [
            'tema' => ['tema-esquema', 'Esquema: -ka presenta el tema y -pa indica pertenencia con la palabra mama.'],
            'objeto' => ['objeto-esquema', 'Esquema: -ta señala el objeto de una acción y -man indica el destino.'],
            'lugar' => ['lugar-esquema', 'Esquema: -pi señala dónde ocurre algo y -manta indica de dónde viene.'],
            'hermana' => ['hermana', 'Una hermana muestra su bolso tejido mientras su hermano señala que le pertenece.'],
        ];
    }

    private function unitTwoVisual(string $key): string
    {
        $name = str_replace('-', '', $this->unitTwoVisuals()[$key][0]);

        return 'kichwa/imagenes/intermediom1u2'.$name.'.webp';
    }

    private function unitTwoVisualAlt(?string $image): ?string
    {
        foreach ($this->unitTwoVisuals() as $key => [, $alt]) {
            if ($image === $this->unitTwoVisual($key)) {
                return $alt;
            }
        }

        return null;
    }

    private function unitThreeVisuals(): array
    {
        return [
            'compania' => ['compania-esquema', 'Esquema: -wan significa con alguien y -kama indica hasta cuándo o dónde.'],
            'motivo' => ['motivo-esquema', 'Esquema: -rayku indica motivo y -shina expresa semejanza.'],
            'abundancia' => ['abundancia-esquema', 'Esquema: -sapa expresa abundancia, como en yakusapa y shunkusapa.'],
            'conmama' => ['con-mama', 'Una madre y su hijo caminan juntos por un sendero andino.'],
            'pormama' => ['por-mama', 'Un joven lleva una cosecha a su madre para ayudarla.'],
            'fruta' => ['fruta-jugosa', 'Una fruta andina abierta muestra abundante jugo y semillas.'],
            'corazon' => ['gran-corazon', 'Una mujer ayuda generosamente a una vecina mayor con su canasta.'],
        ];
    }

    private function unitThreeVisual(string $key): string
    {
        $name = str_replace('-', '', $this->unitThreeVisuals()[$key][0]);

        return 'kichwa/imagenes/intermediom1u3'.$name.'.webp';
    }

    private function unitThreeVisualAlt(?string $image): ?string
    {
        foreach ($this->unitThreeVisuals() as $key => [, $alt]) {
            if ($image === $this->unitThreeVisual($key)) {
                return $alt;
            }
        }

        return null;
    }

    private function morphemeExerciseScene(int $unitNumber, int $number): ?int
    {
        $scenes = [
            2 => [1 => 0, 2 => 1, 5 => 0, 9 => 1, 11 => 2, 15 => 1, 16 => 2],
            3 => [1 => 0, 3 => 2, 4 => 2, 5 => 1, 9 => 2, 16 => 2],
        ];

        return $scenes[$unitNumber][$number] ?? null;
    }

    private function publishMorphemeImages(): void
    {
        foreach ($this->sentenceVisuals() as $unitNumber => $visuals) {
            foreach ($visuals as $key => [$name]) {
                $source = resource_path('images/intermedio/intermediom1u'.$unitNumber.'-'.$name.'.png');
                $this->publishIllustration($source, $this->sentenceVisual($unitNumber, $key));
            }
        }
        foreach ($this->morphemeImages() as $unitNumber => $scenes) {
            foreach ($scenes as $scene => [$name]) {
                $path = $this->morphemeImage($unitNumber, $scene);
                $source = resource_path('images/intermedio/intermediom1u'.$unitNumber.'-'.$name.'.png');
                $this->publishIllustration($source, $path);
            }
        }
        foreach ($this->unitTwoVisuals() as $key => [$name]) {
            $source = resource_path('images/intermedio/intermediom1u2-'.$name.'.png');
            $this->publishIllustration($source, $this->unitTwoVisual($key));
        }
        foreach ($this->unitThreeVisuals() as $key => [$name]) {
            $source = resource_path('images/intermedio/intermediom1u3-'.$name.'.png');
            $this->publishIllustration($source, $this->unitThreeVisual($key));
        }
    }

    private function publishIllustration(string $source, string $path): void
    {
        if (Storage::disk('public')->exists($path)) {
            return;
        }
        if (! is_file($source)) {
            throw new \RuntimeException('Falta la ilustración '.$source.'.');
        }
        $image = imagecreatefrompng($source);
        $small = imagescale($image, 900);
        ob_start();
        imagewebp($small, null, 88);
        $bytes = ob_get_clean();
        imagedestroy($image);
        imagedestroy($small);
        if (! Storage::disk('public')->put($path, $bytes)) {
            throw new \RuntimeException('No se pudo publicar la ilustración '.$path.'.');
        }
    }

    private function addMorphemeReadings(Unidad $unit, int $unitNumber): void
    {
        $readings = $unitNumber === 2 ? [
            ['tema', 'Lee y responde · Tema y pertenencia', '¿Qué forma significa «de la mamá»?',
                ['mamaka', 'mamapa', 'mamaman'], 1,
                'En casa, Sisa distingue dos formas. «Mamaka» presenta a la mamá como tema de la conversación. «Mamapa» señala que algo es de la mamá. La terminación -pa expresa pertenencia.',
                'Mamapa expresa «de la mamá»; -ka presenta el tema.', 0],
            ['lugar', 'Lee y responde · Lugar y procedencia', '¿Qué forma significa «de la chacra»?',
                ['chakrapi', 'chakraman', 'chakramanta'], 2,
                'Una familia trabaja en la chacra: «chakrapi» significa «en la chacra». Cuando vuelve con maíz de allí, usa «chakramanta»: «de la chacra». La terminación -manta indica procedencia.',
                'Chakramanta señala procedencia; chakrapi indica el lugar.', 2],
        ] : [
            ['compania', 'Lee y responde · Compañía y límite', '¿Qué forma expresa «con mamá»?',
                ['mamawan', 'mamakama', 'mamarayku'], 0,
                'Killa camina con su mamá. Para decir «con mamá» usa «mamawan»: -wan expresa compañía. Al despedirse dice «kayakama», que significa «hasta mañana»: -kama marca un límite.',
                'Mamawan expresa compañía; kayakama indica hasta cuándo.', 0],
            ['abundancia-clara', 'Lee y responde · Abundancia', '¿Qué palabra describe una fruta con mucho jugo?',
                ['yakuwan', 'yakusapa', 'yakukama'], 1,
                'Una familia recoge frutas. Una fruta con mucho jugo se describe como «yakusapa». La terminación -sapa destaca que tiene abundante jugo.',
                'Yakusapa describe una fruta jugosa; -sapa indica abundancia.', 2],
        ];

        foreach ($readings as [$key, $title, $prompt, $options, $correct, $passage, $explanation, $scene]) {
            $origin = 'intermedio-modulo1-unidad'.$unitNumber.'-lectura-'.$key.'-v1';
            if (Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', $origin)->exists()) {
                continue;
            }
            $image = $unitNumber === 3 ? $this->unitThreeVisual($key === 'compania' ? 'conmama' : 'fruta')
                : $this->morphemeImage($unitNumber, $scene);
            $exercise = $this->choice($title, $prompt, $options, $correct, $image, $explanation);
            $exercise += ['zones' => [], 'resource' => null];
            $exercise['config'] += ['managed' => true, 'reviewed' => true, 'difficulty' => 'intermedio',
                'reading_passage' => $passage, 'prompt_image_alt' => $this->unitThreeVisualAlt($image) ?? $this->morphemeImageAlt($unitNumber, $image),
                'correct_feedback' => '¡Muy bien! '.$explanation,
                'incorrect_feedback' => 'Vuelve a leer la terminación y su significado.'];
            EstadoContenido::assertReady($exercise);
            $record = new Actividad(KichwaResource::attributes('exercises', $exercise));
            $record->id_unidad = $unit->id_unidad;
            $record->id_tema = null;
            $record->origen_reactivo = $origin;
            $record->orden_actividad = 1 + (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
            $record->publicado = true;
            $record->save();
        }
        if ($unitNumber === 3) {
            $this->addHeartChoice($unit);
        } else {
            $this->addUnitTwoFocusedExercises($unit);
        }
    }

    private function addUnitTwoFocusedExercises(Unidad $unit): void
    {
        $matching = [
            'type' => 'relacionar',
            'prompt' => 'Relaciona cada objeto de la acción y el destino con su significado.',
            'elements' => [
                ['id' => 'k0', 'texto' => 'wawata', 'grupo' => 'origen'],
                ['id' => 'k1', 'texto' => 'allkuta', 'grupo' => 'origen'],
                ['id' => 'k2', 'texto' => 'rumita', 'grupo' => 'origen'],
                ['id' => 'k3', 'texto' => 'wasiman', 'grupo' => 'origen'],
                ['id' => 'e3', 'texto' => 'hacia la casa', 'grupo' => 'destino'],
                ['id' => 'e1', 'texto' => 'al perro, como objeto', 'grupo' => 'destino'],
                ['id' => 'e0', 'texto' => 'al bebé, como objeto', 'grupo' => 'destino'],
                ['id' => 'e2', 'texto' => 'a la piedra, como objeto', 'grupo' => 'destino'],
            ],
            'solution' => ['pares' => [
                ['origen' => 'k0', 'destino' => 'e0'],
                ['origen' => 'k1', 'destino' => 'e1'],
                ['origen' => 'k2', 'destino' => 'e2'],
                ['origen' => 'k3', 'destino' => 'e3'],
            ]],
            'config' => ['title' => 'Relaciona · Objeto y destino', 'prompt_image' => $this->unitTwoVisual('objeto'),
                'prompt_image_alt' => $this->unitTwoVisualAlt($this->unitTwoVisual('objeto')),
                'correct_feedback' => '¡Bien! -ta señala el objeto y -man indica hacia dónde se va.',
                'incorrect_feedback' => 'Revisa cuáles palabras reciben la acción y cuál señala un destino.'],
        ];
        $location = [
            'type' => 'completar',
            'prompt' => 'Lee cada situación y elige la forma que indica el lugar o la procedencia.',
            'elements' => [
                ['id' => 'comunidad', 'texto' => 'La familia está en la comunidad: _____',
                    'opciones' => ['ayllullaktapi', 'ayllullaktaman', 'ayllullaktapa']],
                ['id' => 'chacra', 'texto' => 'El maíz viene de la chacra: _____',
                    'opciones' => ['chakramanta', 'chakrapi', 'chakraman']],
                ['id' => 'quito', 'texto' => 'Una viajera llega desde Quito: _____',
                    'opciones' => ['Quitomanta', 'Quitopi', 'Quitoman']],
            ],
            'solution' => ['textos' => [
                'comunidad' => ['ayllullaktapi'],
                'chacra' => ['chakramanta'],
                'quito' => ['Quitomanta'],
            ]],
            'config' => ['title' => 'Aplica · Lugar y procedencia', 'prompt_image' => $this->unitTwoVisual('lugar'),
                'prompt_image_alt' => $this->unitTwoVisualAlt($this->unitTwoVisual('lugar')),
                'correct_feedback' => '¡Correcto! -pi indica dónde y -manta indica de dónde.',
                'incorrect_feedback' => 'Busca «en» para -pi y «de» o «desde» para -manta.'],
        ];
        foreach (['objeto-destino-v2' => $matching, 'lugar-procedencia-v2' => $location] as $key => $exercise) {
            $origin = 'intermedio-modulo1-unidad2-'.$key;
            if (Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', $origin)->exists()) {
                continue;
            }
            $exercise += ['zones' => [], 'resource' => null];
            $exercise['config'] += ['managed' => true, 'reviewed' => true, 'difficulty' => 'intermedio'];
            EstadoContenido::assertReady($exercise);
            $record = new Actividad(KichwaResource::attributes('exercises', $exercise));
            $record->id_unidad = $unit->id_unidad;
            $record->id_tema = null;
            $record->origen_reactivo = $origin;
            $record->orden_actividad = 1 + (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
            $record->publicado = true;
            $record->save();
        }
    }

    private function addHeartChoice(Unidad $unit): void
    {
        $origin = 'intermedio-modulo1-unidad3-sapa-corazon-v2';
        if (Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', $origin)->exists()) {
            return;
        }
        $image = $this->unitThreeVisual('corazon');
        $exercise = $this->choice('Observa y responde · Gran corazón', 'La mujer ayuda generosamente a su vecina. ¿Qué palabra del tema expresa que tiene un gran corazón?',
            ['shunkurayku', 'shunkusapa', 'shunkushina'], 1, $image, 'Shunkusapa expresa que alguien tiene un gran corazón.');
        $exercise += ['zones' => [], 'resource' => null];
        $exercise['config'] += ['managed' => true, 'reviewed' => true, 'difficulty' => 'intermedio',
            'prompt_image_alt' => $this->unitThreeVisualAlt($image),
            'correct_feedback' => '¡Muy bien! Shunkusapa expresa un gran corazón.',
            'incorrect_feedback' => 'Observa la ayuda que ofrece la mujer y recuerda el significado de -sapa.'];
        EstadoContenido::assertReady($exercise);
        $record = new Actividad(KichwaResource::attributes('exercises', $exercise));
        $record->id_unidad = $unit->id_unidad;
        $record->id_tema = null;
        $record->origen_reactivo = $origin;
        $record->orden_actividad = 1 + (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
        $record->publicado = true;
        $record->save();
    }

    private function curateMorphemeUnit(Unidad $unit, int $unitNumber): void
    {
        $practiceKeys = $unitNumber === 2 ? ['ka-pa', 'ta-man', 'pi-manta'] : ['wan-kama', 'rayku-shina', 'sapa'];
        $unitThreePrompts = [
            'Selecciona la palabra correcta para expresar compañía o límite en cada frase.',
            'Completa cada pista con la palabra que expresa motivo o semejanza.',
            'Selecciona la palabra en kichwa que corresponde a cada característica.',
        ];
        foreach ($practiceKeys as $scene => $key) {
            $origin = 'intermedio-modulo1-unidad'.$unitNumber.'-'.$key.'-v1-practice';
            $practice = Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', $origin)
                ->where('publicado', true)->firstOrFail();
            $image = $unitNumber === 2 ? $this->unitTwoVisual(['tema', 'objeto', 'lugar'][$scene])
                : $this->unitThreeVisual(['compania', 'motivo', 'abundancia'][$scene]);
            $alt = $unitNumber === 2 ? $this->unitTwoVisualAlt($image) : $this->unitThreeVisualAlt($image);
            $this->updateExerciseImage($practice, $image, $alt, $unitNumber === 3 ? $unitThreePrompts[$scene] : null);
        }
        if ($unitNumber === 3) {
            $companionReading = Actividad::where('id_unidad', $unit->id_unidad)
                ->where('origen_reactivo', 'intermedio-modulo1-unidad3-lectura-compania-v1')
                ->where('publicado', true)->firstOrFail();
            $image = $this->unitThreeVisual('conmama');
            $this->updateExerciseImage($companionReading, $image, $this->unitThreeVisualAlt($image));
        }

        $readingKeys = $unitNumber === 2 ? ['tema', 'lugar'] : ['compania', 'abundancia-clara'];
        $base = 'intermedio-modulo1-unidad'.$unitNumber.'-';
        $bank = self::BANK_KEY.'-u'.$unitNumber.'-';
        $origins = $unitNumber === 2 ? [
            $base.$practiceKeys[0].'-v1-practice', $base.'lectura-'.$readingKeys[0].'-v1', $bank.'1', $bank.'5',
            $base.$practiceKeys[1].'-v1-practice', $base.'objeto-destino-v2', $bank.'9', $bank.'15',
            $base.$practiceKeys[2].'-v1-practice', $base.'lectura-'.$readingKeys[1].'-v1', $bank.'11', $base.'lugar-procedencia-v2',
        ] : [
            $base.$practiceKeys[0].'-v1-practice', $base.'lectura-'.$readingKeys[0].'-v1', $bank.'1', $bank.'5',
            $base.$practiceKeys[1].'-v1-practice', $bank.'3', $bank.'9', $bank.'16',
            $base.$practiceKeys[2].'-v1-practice', $base.'lectura-'.$readingKeys[1].'-v1', $bank.'4', $base.'sapa-corazon-v2',
        ];
        $activities = Actividad::where('id_unidad', $unit->id_unidad)->orderBy('orden_actividad')->get();
        $ordered = collect();
        foreach ($origins as $origin) {
            $selected = $activities->where('origen_reactivo', $origin)->sortByDesc('id_actividad')->first();
            if ($selected === null) {
                throw new \RuntimeException('Falta el ejercicio de la unidad '.$unitNumber.': '.$origin);
            }
            $ordered->push($selected);
        }
        $publishedIds = $ordered->pluck('id_actividad');
        foreach ($activities as $activity) {
            $shouldPublish = $publishedIds->contains($activity->id_actividad);
            if ($activity->publicado !== $shouldPublish) {
                $activity->update(['publicado' => $shouldPublish]);
            }
        }
        $ordered = $ordered->concat($activities->reject(fn (Actividad $activity): bool => $publishedIds->contains($activity->id_actividad)));
        $temporaryOrder = 1 + (int) $activities->max('orden_actividad');
        foreach ($ordered as $index => $activity) {
            $activity->update(['orden_actividad' => $temporaryOrder + $index]);
        }
        foreach ($ordered as $index => $activity) {
            $activity->update(['orden_actividad' => $index + 1]);
        }
    }

    private function addSentenceReadings(Unidad $unit, int $unitNumber): void
    {
        $readings = $unitNumber === 4 ? [
            ['tiempo', 'Lee y responde · Ayer, hoy y mañana', 'Sisa fue ayer a la escuela. ¿Qué palabra sitúa esa acción en el tiempo?',
                ['kayna', 'kunan', 'kaya'], 0,
                'Sisa cuenta: «Kayna rirkani», ayer fui. Hoy dice «Kunan rini», hoy voy. Para mañana prepara su camino y dice «Kaya risha», mañana iré.',
                'Kayna significa ayer; kunan es hoy y kaya es mañana.', 'oraciones'],
            ['lugar', 'Lee y responde · Lugar y modo', 'En «Kaypi kawsan», ¿qué información aporta kaypi?',
                ['Cómo está', 'Dónde vive', 'Cuándo llegó'], 1,
                'Un niño vive cerca de la casa. «Kaypi kawsan» significa «Vive aquí». Su mamá está bien: «Allimi kan». Kaypi indica lugar y alli indica cómo está alguien.',
                'Kaypi indica lugar: aquí. Alli significa bien.', 'lugar'],
        ] : [
            ['negacion', 'Lee y responde · Afirmar y negar', 'Si Sisa quiere decir «no voy», ¿qué expresión usa?',
                ['rinimi', 'mana rinichu', 'rinkichu?'], 1,
                'Sisa dice «Rini»: voy. Luego cambia de opinión y dice «Mana rinichu»: no voy. Para negar usa mana antes del verbo y -chu al final.',
                'Mana rinichu significa no voy; mana y -chu forman la negación.', 'negacion'],
            ['duda', 'Lee y responde · Pregunta o posibilidad', 'Si todavía no se sabe si lloverá, ¿qué expresión comunica posibilidad?',
                ['rinkichu?', 'allpami', 'tamyankachari'], 2,
                'La familia mira las nubes. Alguien pregunta «Rinkichu?»: ¿irás? Otra persona mira el cielo y dice «Tamyankachari»: quizá lloverá. -chu pregunta; -chari expresa duda.',
                'Tamyankachari significa quizá lloverá; -chari expresa duda.', 'duda'],
        ];

        foreach ($readings as [$key, $title, $prompt, $options, $correct, $passage, $explanation, $visual]) {
            $origin = 'intermedio-modulo1-unidad'.$unitNumber.'-lectura-'.$key.'-v1';
            if (Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', $origin)->exists()) {
                continue;
            }
            $image = $this->sentenceVisual($unitNumber, $visual);
            $exercise = $this->choice($title, $prompt, $options, $correct, $image, $explanation);
            $exercise += ['zones' => [], 'resource' => null];
            $exercise['config'] += ['managed' => true, 'reviewed' => true, 'difficulty' => 'intermedio',
                'reading_passage' => $passage, 'prompt_image_alt' => $this->sentenceVisualAlt($unitNumber, $visual),
                'correct_feedback' => '¡Muy bien! '.$explanation,
                'incorrect_feedback' => 'Vuelve a leer la situación y observa la imagen.'];
            EstadoContenido::assertReady($exercise);
            $record = new Actividad(KichwaResource::attributes('exercises', $exercise));
            $record->id_unidad = $unit->id_unidad;
            $record->id_tema = null;
            $record->origen_reactivo = $origin;
            $record->orden_actividad = 1 + (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
            $record->publicado = true;
            $record->save();
        }
    }

    private function curateSentenceUnit(Unidad $unit, int $unitNumber): void
    {
        $base = 'intermedio-modulo1-unidad'.$unitNumber.'-';
        $bank = self::BANK_KEY.'-u'.$unitNumber.'-';
        $origins = $unitNumber === 4 ? [
            $base.'time-words-v1-practice', $base.'lectura-tiempo-v1', $bank.'1', $bank.'6',
            $bank.'11', $bank.'14', $base.'place-manner-v1-practice', $base.'lectura-lugar-v1',
            $bank.'4', $bank.'7', $bank.'9', $bank.'15',
        ] : [
            $base.'affirm-negative-v1-practice', $bank.'1', $bank.'8', $base.'lectura-negacion-v1',
            $bank.'10', $bank.'16', $base.'question-doubt-v1-practice', $bank.'4',
            $bank.'12', $bank.'7', $base.'lectura-duda-v1', $bank.'14',
        ];
        $visuals = $unitNumber === 4 ? [
            $origins[0] => 'tiempo', $origins[2] => 'tiempo', $origins[3] => 'tiempo',
            $origins[4] => 'oraciones', $origins[5] => 'tiempo', $origins[6] => 'lugar',
            $origins[8] => 'ampliacion', $origins[9] => 'lugar', $origins[10] => 'lugar',
            $origins[11] => 'lugar',
        ] : [
            $origins[0] => 'afirmacion', $origins[1] => 'afirmacion', $origins[2] => 'afirmacion',
            $origins[4] => 'negacion', $origins[5] => 'frases', $origins[6] => 'modalidades',
            $origins[7] => 'modalidades', $origins[8] => 'pregunta', $origins[9] => 'duda',
            $origins[11] => 'modalidades',
        ];
        $activities = Actividad::where('id_unidad', $unit->id_unidad)->orderBy('orden_actividad')->get();
        $ordered = collect();
        foreach ($origins as $origin) {
            $activity = $activities->where('origen_reactivo', $origin)->sortByDesc('id_actividad')->first();
            if ($activity === null) {
                throw new \RuntimeException('Falta el ejercicio de la unidad '.$unitNumber.': '.$origin);
            }
            if (isset($visuals[$origin])) {
                $key = $visuals[$origin];
                $this->updateExerciseImage($activity, $this->sentenceVisual($unitNumber, $key), $this->sentenceVisualAlt($unitNumber, $key));
                $activity = Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', $origin)
                    ->orderByDesc('publicado')->orderByDesc('id_actividad')->firstOrFail();
            }
            $ordered->push($activity);
        }
        $publishedIds = $ordered->pluck('id_actividad');
        $activities = Actividad::where('id_unidad', $unit->id_unidad)->orderBy('orden_actividad')->get();
        foreach ($activities as $activity) {
            $shouldPublish = $publishedIds->contains($activity->id_actividad);
            if ($activity->publicado !== $shouldPublish) {
                $activity->update(['publicado' => $shouldPublish]);
            }
        }
        $ordered = $ordered->concat($activities->reject(fn (Actividad $activity): bool => $publishedIds->contains($activity->id_actividad)));
        $temporaryOrder = 1 + (int) $activities->max('orden_actividad');
        foreach ($ordered as $index => $activity) {
            $activity->update(['orden_actividad' => $temporaryOrder + $index]);
        }
        foreach ($ordered as $index => $activity) {
            $activity->update(['orden_actividad' => $index + 1]);
        }
    }

    private function updateUnitOneOriginals(Unidad $unit): void
    {
        $practices = [
            'intermedio-modulo1-unidad1-present-v1-practice' => ['hoy' => 1, 'agua' => 13, 'trabajo' => 14],
            'intermedio-modulo1-unidad1-past-v1-practice' => ['ayer' => 2, 'fui' => 10, 'vio' => 11],
            'intermedio-modulo1-unidad1-future-v1-practice' => ['manana' => 9, 'iremos' => 15, 'sembraremos' => 12],
        ];
        foreach ($practices as $origin => $images) {
            $exercise = Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', $origin)
                ->where('publicado', true)->firstOrFail();
            $elements = $exercise->elementos_actividad;
            foreach ($elements as &$element) {
                $image = $this->unitOneImage($images[$element['id']]);
                $element['imagen'] = $image;
                $element['imagen_alt'] = $this->unitOneImageAlt($image);
            }
            unset($element);
            $config = array_replace($exercise->configuracion ?? [], [
                'prompt_image' => null,
                'prompt_image_alt' => null,
                'sentence_images' => true,
            ]);
            if ($elements === $exercise->elementos_actividad && $config === $exercise->configuracion) {
                continue;
            }
            if (DB::table('respuestas_actividad')->where('id_actividad', $exercise->id_actividad)->exists()) {
                $oldOrder = $exercise->orden_actividad;
                $archiveOrder = 1 + (int) Actividad::where('id_unidad', $exercise->id_unidad)->max('orden_actividad');
                $exercise->update(['orden_actividad' => $archiveOrder, 'publicado' => false]);
                $version = $exercise->replicate();
                $version->orden_actividad = $oldOrder;
                $version->elementos_actividad = $elements;
                $version->configuracion = $config;
                $version->publicado = true;
                $version->save();

                continue;
            }
            $exercise->update(['elementos_actividad' => $elements, 'configuracion' => $config]);
        }
    }

    private function curateUnitOne(Unidad $unit): void
    {
        $readings = [
            ['intermedio-modulo1-unidad1-lectura-tiempos-v2', 'Lee y responde · Ayer, hoy y mañana', '¿Qué hará Elena mañana?',
                ['Irá a la chacra.', 'Fue a la escuela.', 'Trabaja en la chacra.'], 0,
                "Elena cuenta lo que hace en tres momentos:\nKayna: «Kaynami ñuka yachana wasiman rirkani». Ayer fui a la escuela.\nKunan: «Kunan punchapimi ñuka chakrapi llankani». Hoy trabajo en la chacra.\nKaya: «Kaya punchami chakraman risha». Mañana iré a la chacra.",
                'Kaya significa mañana y «chakraman risha» significa «iré a la chacra».'],
            ['intermedio-modulo1-unidad1-lectura-hoy-v1', 'Lee y responde · Hoy y mañana', '¿Qué hace Inti hoy?',
                ['Bebe agua.', 'Va a la chacra.', 'Fue a la escuela.'], 0,
                "Inti cuenta dos acciones:\n«Kunanmi yakuta upini. Kaya punchami chakraman risha».\nPistas: kunan = hoy · yakuta = agua · upini = bebo · kaya = mañana · risha = iré.",
                'Kunan sitúa la primera acción en hoy: Inti bebe agua.'],
        ];
        foreach ($readings as [$origin, $title, $prompt, $options, $correct, $passage, $explanation]) {
            if (Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', $origin)->exists()) {
                continue;
            }
            $exercise = $this->choice($title, $prompt, $options, $correct, null, $explanation);
            $exercise += ['zones' => [], 'resource' => null];
            $exercise['config'] += ['managed' => true, 'reviewed' => true, 'difficulty' => 'intermedio',
                'reading_passage' => $passage,
                'correct_feedback' => '¡Muy bien! '.$explanation,
                'incorrect_feedback' => 'Revisa la frase que indica el momento de la pregunta y vuelve a intentarlo.'];
            EstadoContenido::assertReady($exercise);
            $record = new Actividad(KichwaResource::attributes('exercises', $exercise));
            $record->id_unidad = $unit->id_unidad;
            $record->id_tema = null;
            $record->origen_reactivo = $origin;
            $record->orden_actividad = 1 + (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
            $record->publicado = true;
            $record->save();
        }

        $matchingOrigin = 'intermedio-modulo1-unidad1-momentos-v1';
        if (! Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', $matchingOrigin)->exists()) {
            $exercise = ['type' => 'relacionar', 'prompt' => 'Une cada palabra de tiempo con su significado.',
                'elements' => [
                    ['id' => 'k0', 'texto' => 'kayna', 'grupo' => 'origen'],
                    ['id' => 'k1', 'texto' => 'kunan', 'grupo' => 'origen'],
                    ['id' => 'k2', 'texto' => 'kaya', 'grupo' => 'origen'],
                    ['id' => 'e2', 'texto' => 'mañana', 'grupo' => 'destino'],
                    ['id' => 'e0', 'texto' => 'ayer', 'grupo' => 'destino'],
                    ['id' => 'e1', 'texto' => 'hoy', 'grupo' => 'destino'],
                ], 'solution' => ['pares' => [
                    ['origen' => 'k0', 'destino' => 'e0'],
                    ['origen' => 'k1', 'destino' => 'e1'],
                    ['origen' => 'k2', 'destino' => 'e2'],
                ]], 'zones' => [], 'resource' => null,
                'config' => ['title' => 'Relaciona · Ayer, hoy y mañana', 'managed' => true, 'reviewed' => true,
                    'difficulty' => 'intermedio', 'correct_feedback' => '¡Correcto! Kayna es ayer, kunan es hoy y kaya es mañana.',
                    'incorrect_feedback' => 'Recuerda: kayna = ayer, kunan = hoy, kaya = mañana.'],
            ];
            EstadoContenido::assertReady($exercise);
            $record = new Actividad(KichwaResource::attributes('exercises', $exercise));
            $record->id_unidad = $unit->id_unidad;
            $record->id_tema = null;
            $record->origen_reactivo = $matchingOrigin;
            $record->orden_actividad = 1 + (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
            $record->publicado = true;
            $record->save();
        }

        Actividad::where('id_unidad', $unit->id_unidad)
            ->where('origen_reactivo', 'intermedio-modulo1-unidad1-lectura-tiempos-v1')
            ->update(['publicado' => false]);

        $retained = [5, 6, 7, 8, 13, 14];
        foreach (range(1, 16) as $number) {
            $versions = Actividad::where('id_unidad', $unit->id_unidad)
                ->where('origen_reactivo', self::BANK_KEY.'-u1-'.$number)
                ->orderBy('orden_actividad')->orderByDesc('id_actividad')->get();
            $selected = in_array($number, $retained, true) ? $versions->first() : null;
            foreach ($versions as $version) {
                if ($version->publicado !== ($version->id_actividad === $selected?->id_actividad)) {
                    $version->update(['publicado' => $version->id_actividad === $selected?->id_actividad]);
                }
            }
        }
    }

    private function mixUnitOneExercises(Unidad $unit): void
    {
        $origins = [
            'intermedio-modulo1-unidad1-present-v1-practice',
            'intermedio-modulo1-unidad1-lectura-hoy-v1',
            'intermedio-modulo1-unidad1-momentos-v1',
            self::BANK_KEY.'-u1-13',
            self::BANK_KEY.'-u1-5',
            self::BANK_KEY.'-u1-6',
            'intermedio-modulo1-unidad1-past-v1-practice',
            'intermedio-modulo1-unidad1-lectura-tiempos-v2',
            self::BANK_KEY.'-u1-7',
            self::BANK_KEY.'-u1-8',
            'intermedio-modulo1-unidad1-future-v1-practice',
            self::BANK_KEY.'-u1-14',
        ];
        $exercises = PublicacionContenido::exercises($unit->id_unidad)->get()->keyBy('origen_reactivo');
        if ($exercises->count() !== count($origins)) {
            throw new \RuntimeException('La unidad 1 debe tener exactamente doce ejercicios publicados.');
        }

        $ordered = collect();
        foreach ($origins as $origin) {
            $exercise = $exercises->get($origin);
            if ($exercise === null) {
                throw new \RuntimeException('Falta el ejercicio de la unidad 1: '.$origin);
            }
            $ordered->push($exercise);
        }

        $activities = Actividad::where('id_unidad', $unit->id_unidad)->orderBy('orden_actividad')->get();
        $publishedIds = $ordered->pluck('id_actividad');
        $ordered = $ordered->concat($activities->reject(fn (Actividad $activity): bool => $publishedIds->contains($activity->id_actividad)));
        if ($ordered->every(fn (Actividad $activity, int $index): bool => $activity->orden_actividad === $index + 1)) {
            return;
        }

        $temporaryOrder = (int) $activities->max('orden_actividad');
        foreach ($ordered as $index => $activity) {
            $activity->update(['orden_actividad' => $temporaryOrder + $index + 1]);
        }
        foreach ($ordered as $index => $activity) {
            $activity->update(['orden_actividad' => $index + 1]);
        }
    }

    private function updateUnitOneFinalImages(Modulo $module): void
    {
        $evaluation = EvaluacionKichwa::where('id_modulo', $module->id_modulo)
            ->where('configuracion->bank_key', self::BANK_KEY.'-final')->firstOrFail();
        $images = [
            1 => ['intermediom1examen01.png', 'Una mujer mira un álbum con recuerdos antiguos de su camino a la escuela.'],
            2 => ['intermediom1examen02.png', 'Un joven se prepara para salir por un camino hacia la chacra.'],
            3 => ['intermediom1examen03.png', 'Una familia sostiene semillas antes de sembrarlas junta en un terreno vacío.'],
            4 => ['intermediom1examen04.png', 'Una persona llega a la escuela después de recorrer un camino.'],
        ];
        foreach ($images as $questionOrder => [$filename, $alt]) {
            $question = Pregunta::where('id_evaluacion', $evaluation->id_evaluacion)
                ->where('orden_pregunta', $questionOrder)->firstOrFail();
            $config = array_replace($question->configuracion ?? [], [
                'prompt_image' => 'kichwa/imagenes/'.$filename,
                'prompt_image_alt' => $alt,
            ]);
            if ($config !== $question->configuracion) {
                $question->update(['configuracion' => $config]);
            }
        }
    }

    private function updateMorphemeFinalImages(Modulo $module): void
    {
        $evaluation = EvaluacionKichwa::where('id_modulo', $module->id_modulo)
            ->where('configuracion->bank_key', self::BANK_KEY.'-final')->firstOrFail();
        foreach ([2 => 5, 3 => 9] as $unitNumber => $firstQuestion) {
            foreach (range(0, 3) as $offset) {
                $scene = min(2, $offset);
                $image = $unitNumber === 2 && $offset === 0 ? $this->unitTwoVisual('tema')
                    : ($unitNumber === 2 && $offset === 3 ? $this->unitTwoVisual('lugar')
                        : ($unitNumber === 3 ? $this->unitThreeVisual(['conmama', 'compania', 'motivo', 'fruta'][$offset]) : $this->morphemeImage($unitNumber, $scene)));
                $question = Pregunta::where('id_evaluacion', $evaluation->id_evaluacion)
                    ->where('orden_pregunta', $firstQuestion + $offset)->firstOrFail();
                $config = array_replace($question->configuracion ?? [], [
                    'prompt_image' => $image,
                    'prompt_image_alt' => $this->unitTwoVisualAlt($image) ?? $this->unitThreeVisualAlt($image) ?? $this->morphemeImageAlt($unitNumber, $image),
                ]);
                if ($config !== $question->configuracion) {
                    $question->update(['configuracion' => $config]);
                }
            }
        }
        foreach ([4 => ['tiempo', 'lugar', 'lugar', 'tiempo'],
            5 => ['afirmacion', 'pregunta', 'duda', 'afirmacion']] as $unitNumber => $keys) {
            foreach ($keys as $offset => $key) {
                $question = Pregunta::where('id_evaluacion', $evaluation->id_evaluacion)
                    ->where('orden_pregunta', ($unitNumber - 1) * 4 + $offset + 1)->firstOrFail();
                $config = array_replace($question->configuracion ?? [], [
                    'prompt_image' => $this->sentenceVisual($unitNumber, $key),
                    'prompt_image_alt' => $this->sentenceVisualAlt($unitNumber, $key),
                ]);
                if ($config !== $question->configuracion) {
                    $question->update(['configuracion' => $config]);
                }
            }
        }
    }

    private function updateExerciseImage(Actividad $exercise, ?string $image, ?string $alt, ?string $prompt = null): void
    {
        $config = array_replace($exercise->configuracion ?? [], ['prompt_image' => $image, 'prompt_image_alt' => $alt]);
        $changes = ['configuracion' => $config];
        if ($prompt !== null) {
            $changes['enunciado_actividad'] = $prompt;
        }
        if ($config === $exercise->configuracion && ($prompt === null || $prompt === $exercise->enunciado_actividad)) {
            return;
        }
        if (DB::table('respuestas_actividad')->where('id_actividad', $exercise->id_actividad)->exists()) {
            $oldOrder = $exercise->orden_actividad;
            $archiveOrder = 1 + (int) Actividad::where('id_unidad', $exercise->id_unidad)->max('orden_actividad');
            $exercise->update(['orden_actividad' => $archiveOrder, 'publicado' => false]);
            $version = $exercise->replicate();
            $version->orden_actividad = $oldOrder;
            $version->fill($changes);
            $version->publicado = true;
            $version->save();

            return;
        }
        $exercise->update($changes);
    }

    private function makeGuided(Unidad $unit): void
    {
        $unit->update(['configuracion' => array_replace($unit->configuracion ?? [],
            ['learning_mode' => 'guided', 'guided_lesson' => 'intermediate-module-one'])]);

        foreach (Actividad::where('id_unidad', $unit->id_unidad)->get() as $activity) {
            if ($activity->id_tema === null && ($activity->configuracion['topic_practice'] ?? false)) {
                continue;
            }
            $config = array_replace($activity->configuracion ?? [], ['topic_practice' => true]);
            if (DB::table('respuestas_actividad')->where('id_actividad', $activity->id_actividad)->exists()) {
                if (Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', $activity->origen_reactivo)
                    ->whereNull('id_tema')->where('configuracion->topic_practice', true)->exists()) {
                    continue;
                }
                $oldOrder = $activity->orden_actividad;
                $archiveOrder = 1 + (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
                $activity->update(['orden_actividad' => $archiveOrder, 'publicado' => false]);
                $version = $activity->replicate();
                $version->orden_actividad = $oldOrder;
                $version->id_tema = null;
                $version->configuracion = $config;
                $version->publicado = true;
                $version->save();

                continue;
            }
            $activity->update(['id_tema' => null, 'configuracion' => $config]);
        }
    }

    private function addFinal(Modulo $module, $units): void
    {
        if (EvaluacionKichwa::where('id_modulo', $module->id_modulo)->where('configuracion->bank_key', self::BANK_KEY.'-final')->exists()) {
            return;
        }
        $evaluation = EvaluacionKichwa::create(['id_modulo' => $module->id_modulo, 'id_unidad' => null, 'id_tema' => null,
            'titulo_evaluacion' => 'Examen final · Conjugación y morfemas', 'tipo_evaluacion' => 'modulo', 'publicado' => false,
            'configuracion' => ['managed' => true, 'final' => true, 'question_count' => 20, 'pass_percentage' => 80,
                'bank_key' => self::BANK_KEY.'-final', 'prerequisite_units' => $units->modelKeys()]]);
        foreach ($this->finalQuestions() as $index => [$unit, $prompt, $options, $correct, $explanation]) {
            $data = $this->choice('Unidad '.$unit.' · '.$units[$unit]->titulo_unidad, $prompt, $options, $correct,
                'kichwa/imagenes/intermediom1u'.$unit.'.png', $explanation);
            $data += ['zones' => [], 'resource' => null];
            $data['config'] += ['managed' => true, 'reviewed' => true, 'max_selections' => 1,
                'prompt_image_alt' => $this->imageAlt($unit),
                'correct_feedback' => 'Correcto. '.$explanation,
                'incorrect_feedback' => 'Repasa esta idea: '.$explanation];
            EstadoContenido::assertReady($data);
            $question = new Pregunta(KichwaResource::attributes('questions', $data));
            $question->id_evaluacion = $evaluation->id_evaluacion;
            $question->origen_reactivo = self::BANK_KEY.'-final-'.($index + 1);
            $question->puntaje_pregunta = 1;
            $question->orden_pregunta = $index + 1;
            $question->publicado = true;
            $question->save();
        }
        $evaluation->update(['publicado' => true]);
    }

    private function choice(string $title, string $prompt, array $options, int $correct, ?string $image, string $explanation): array
    {
        return ['type' => 'seleccion_multiple', 'prompt' => $prompt,
            'elements' => array_map(fn (string $text, int $index): array => ['id' => 'o'.$index, 'texto' => $text], $options, array_keys($options)),
            'solution' => ['seleccion' => ['o'.$correct]],
            'config' => ['title' => $title, 'max_selections' => 1, 'presentation' => 'buttons',
                'prompt_image' => $image, 'explanation' => $explanation]];
    }

    private function focus(int $unit, int $group): string
    {
        return [1 => ['Hoy y ayer', 'Mañana', 'La chacra', 'Acciones cotidianas'],
            2 => ['Tema y pertenencia', 'Objeto y destino', 'Lugar y origen', 'Forma y función'],
            3 => ['Compañía', 'Hasta dónde', 'Motivo y semejanza', 'Abundancia'],
            4 => ['Ayer y hoy', 'Mañana', 'Aquí', 'Cómo sucede'],
            5 => ['Afirmar', 'Negar', 'Preguntar', 'Expresar duda']][$unit][$group];
    }

    private function imageAlt(int $unit): string
    {
        return [1 => 'Tres escenas de la chacra muestran acciones en distintos momentos.',
            2 => 'Escena de una casa, la escuela, una chacra y personas en camino.',
            3 => 'Familia andina camina junta hacia un pueblo con una canasta de frutas.',
            4 => 'Un estudiante llega a una escuela andina en escenas de distintos momentos.',
            5 => 'Cuatro escenas muestran afirmación, negación, pregunta y duda en una chacra.'][$unit];
    }

    private function banks(): array
    {
        return [
            1 => ['pairs' => [
                ['kunan', 'hoy o ahora'], ['kayna', 'ayer'], ['kaya', 'mañana'], ['kunan pacha', 'tiempo presente'],
                ['yallishka pacha', 'tiempo pasado'], ['shamuk pacha', 'tiempo futuro'], ['rirkani', 'fui'], ['rikurka', 'vio'],
                ['tarpushun', 'sembraremos'], ['upiasha', 'beberé'], ['llankani', 'trabajo'], ['risha', 'iré'],
                ['Kaynami rirkani.', 'Ayer fui.'], ['Kaya risha.', 'Mañana iré.'], ['Kunan llankani.', 'Hoy trabajo.'], ['Ñukanchik tarpushun.', 'Nosotros sembraremos.'],
            ], 'examples' => [
                1 => ['Kunan punchapimi ñuka chakrapi llankani. = Hoy trabajo en la chacra.', 'Kunan yakuta upini. = Hoy bebo agua.'],
                2 => ['Kaynami ñuka yachana wasiman rirkani. = Ayer fui a la escuela.', 'Paykunaka yakutami upiarkakuna. = Ellos bebieron agua.'],
                3 => ['Kaya punchami chakraman risha. = Mañana iré a la chacra.', 'Ñukanchikka murutami tarpushun. = Nosotros sembraremos granos.'],
            ]],
            2 => ['pairs' => [
                ['mamaka', 'la mamá, como tema'], ['wasika', 'la casa, como tema'], ['ñukapa', 'mío o de mí'], ['mamapa', 'de la mamá'],
                ['panipa', 'de la hermana'], ['wawata', 'al bebé, como objeto'], ['allkuta', 'al perro, como objeto'], ['rumita', 'a la piedra, como objeto'],
                ['wasiman', 'hacia la casa'], ['yachanaman', 'a estudiar'], ['chakrapi', 'en la chacra'], ['ayllullaktapi', 'en la comunidad'],
                ['wasimanta', 'de la casa'], ['chakramanta', 'de la chacra'], ['Quitomanta', 'desde Quito'], ['mashita', 'al compañero, como objeto'],
            ], 'examples' => [
                1 => ['Mamaka allimi kan. = La mamá está bien. Aquí -ka marca el tema.', 'Chayka ñukapa misi. = Ese es mi gato. Aquí -pa expresa pertenencia.'],
                2 => ['Paymi wawata wakichirka. = Él cuidó al bebé; -ta marca el objeto.', 'Paymi wasiman rinka. = Él irá a la casa; -man señala el destino.'],
                3 => ['Chakrapi papakuna tyan. = En la chacra hay papas.', 'Chakramanta sara apamushka. = Trajo maíz de la chacra.'],
            ]],
            3 => ['pairs' => [
                ['mamawan', 'con mamá'], ['mashiwan', 'con un compañero'], ['misiwan', 'con el gato'], ['yantawan', 'con la leña'],
                ['kayakama', 'hasta mañana'], ['yachanawasikama', 'hasta la escuela'], ['chaykama', 'hasta allí'], ['waykukama', 'hasta la quebrada'],
                ['mamarayku', 'por la mamá'], ['wawarayku', 'por el bebé'], ['taytashina', 'como el papá'], ['wawashina', 'como el niño'],
                ['wiksasapa', 'barrigón'], ['yuyaysapa', 'muy inteligente'], ['yakusapa', 'jugoso'], ['shunkusapa', 'de gran corazón'],
            ], 'examples' => [
                1 => ['Ñuka mamawan rini. = Voy con mamá; -wan expresa compañía.', 'Kayakama. = Hasta mañana; -kama marca el límite.'],
                2 => ['Wawarayku llankani. = Trabajo por el bebé; -rayku señala el motivo.', 'Taytashina purin. = Camina como el papá; -shina compara.'],
                3 => ['Kay muruka yakusapa kan. = Esta fruta es jugosa.', 'Payka shunkusapa kan. = Él o ella es de gran corazón.'],
            ]],
            4 => ['pairs' => [
                ['kayna', 'ayer'], ['kunan', 'hoy o ahora'], ['kaya', 'mañana'], ['kayna puncha', 'el día de ayer'],
                ['kunan puncha', 'el día de hoy'], ['kaya puncha', 'el día de mañana'], ['kaypi', 'aquí'], ['kaypimi', 'precisamente aquí'],
                ['alli', 'bien'], ['allimi', 'sí está bien'], ['Kayna rirkani.', 'Ayer fui.'], ['Kunan rini.', 'Hoy voy.'],
                ['Kaya risha.', 'Mañana iré.'], ['Kaypi kawsan.', 'Vive aquí.'], ['Allimi kan.', 'Está bien.'], ['Kaypi pukllan.', 'Juega aquí.'],
            ], 'examples' => [
                1 => ['Kayna punchami ashkata puñushkani. = Ayer dormí mucho.', 'Kaya punchami chakraman risha. = Mañana iré a la chacra.'],
                2 => ['Kaypimi shuk wawa kawsan. = Aquí vive un niño.', 'Ñuka mamaka allimi kan. = Mi mamá está bien.'],
            ]],
            5 => ['pairs' => [
                ['-mi', 'marca una afirmación'], ['-m', 'variante de afirmación'], ['mana', 'palabra de negación'], ['mana…-chu', 'construcción negativa'],
                ['-chu', 'marca una pregunta cerrada'], ['-cha', 'marca posibilidad'], ['-chari', 'marca posibilidad o duda'], ['ñukami', 'yo sí, con afirmación'],
                ['allpami', 'la tierra sí, con afirmación'], ['mana rinichu', 'no voy'], ['mana llankashachu', 'no trabajaré'], ['rinkichu?', '¿irás?'],
                ['yachankichu?', '¿sabes?'], ['paycha', 'tal vez él o ella'], ['tamyankachari', 'quizá lloverá'], ['kanchu?', '¿es?'],
            ], 'examples' => [
                1 => ['Kay allpami alli kan. = Esta tierra sí es buena.', 'Ñuka mana yachana wasiman rirkani-chu. = Yo no fui a la escuela.'],
                2 => ['Kan Kichwa shimita yachakunkichu? = ¿Estás aprendiendo kichwa?', 'Paycha kunan yachana wasiman rinka. = Tal vez él irá hoy a la escuela.'],
            ]],
        ];
    }

    private function finalQuestions(): array
    {
        return [
            [1, 'En una historia, la acción ocurrió ayer. ¿Qué palabra sitúa el relato en ese momento?', ['Kaya', 'Kayna', 'Kunan', 'Kaypi'], 1, 'Kayna significa ayer.'],
            [1, '¿Cuál oración anuncia una acción de mañana?', ['Kaya risha.', 'Kayna rirkani.', 'Kunan llankani.', 'Kaypi kawsan.'], 0, 'Kaya risha significa mañana iré.'],
            [1, 'En «Ñukanchik tarpushun», ¿cuándo se realizará la siembra?', ['Ayer', 'Ahora', 'Después', 'Nunca'], 2, 'Tarpushun expresa sembraremos.'],
            [1, '¿Cuál forma verbal se presenta como una acción ya realizada?', ['Llankani', 'Risha', 'Upiasha', 'Rirkani'], 3, 'Rirkani significa fui.'],
            [2, 'En «mamapa», ¿qué expresa -pa?', ['Pertenencia', 'Destino', 'Lugar', 'Pregunta'], 0, '-pa expresa pertenencia: de la mamá.'],
            [2, 'Una persona va hacia la casa. ¿Qué forma corresponde?', ['Wasika', 'Wasiman', 'Wasipi', 'Wasimanta'], 1, 'Wasiman indica movimiento hacia la casa.'],
            [2, '¿Qué expresión sitúa una acción dentro de la chacra?', ['Chakramanta', 'Chakrapa', 'Chakraka', 'Chakrapi'], 3, 'Chakrapi significa en la chacra.'],
            [2, 'En «Quitomanta», ¿qué señala -manta?', ['Una pregunta', 'Un objeto', 'El origen', 'Compañía'], 2, '-manta indica procedencia: desde Quito.'],
            [3, 'Quieres decir «con mamá». ¿Qué palabra eliges?', ['Mamawan', 'Mamakama', 'Mamarayku', 'Mamashina'], 0, 'Mamawan significa con mamá.'],
            [3, 'En «kayakama», ¿qué expresa -kama?', ['Posesión', 'Límite temporal', 'Abundancia', 'Pregunta'], 1, 'Kayakama significa hasta mañana.'],
            [3, '¿Cuál forma expresa un motivo?', ['Wawashina', 'Wawasapa', 'Wawawan', 'Wawarayku'], 3, 'Wawarayku significa por el bebé.'],
            [3, 'Una fruta tiene mucho jugo. ¿Qué palabra del material la describe?', ['Yakukama', 'Yakupi', 'Yakusapa', 'Yakuwan'], 2, 'Yakusapa significa jugoso.'],
            [4, '¿Qué palabra completa «_____ punchami chakraman risha» si la acción será mañana?', ['Kayna', 'Kaya', 'Kaypi', 'Alli'], 1, 'Kaya ubica la acción en mañana.'],
            [4, 'En «Kaypi kawsan», ¿qué información aporta kaypi?', ['El lugar', 'El modo', 'El pasado', 'La duda'], 0, 'Kaypi significa aquí.'],
            [4, 'Si quieres decir que alguien está bien, ¿qué forma usas?', ['Kayna', 'Kaypi', 'Alli', 'Kaya'], 2, 'Alli significa bien.'],
            [4, '¿Cuál pareja contrapone ayer y hoy?', ['Kaya y kaypi', 'Alli y kaya', 'Kaypi y kunan', 'Kayna y kunan'], 3, 'Kayna es ayer y kunan es hoy.'],
            [5, 'En el material, ¿qué construcción niega una acción?', ['-mi', 'mana…-chu', '-rayku', '-sapa'], 1, 'Mana…-chu expresa negación.'],
            [5, '«Rinkichu?» espera una respuesta de sí o no. ¿Qué marca la pregunta?', ['-chu', '-cha', '-manta', '-pa'], 0, '-chu marca una pregunta cerrada.'],
            [5, '¿Cuál forma expresa duda o posibilidad?', ['Ñukami', 'Allpami', 'Paycha', 'Mamaka'], 2, 'Paycha significa tal vez él o ella.'],
            [5, 'En «Kay allpami alli kan», ¿qué aporta -mi?', ['Negación', 'Destino', 'Comparación', 'Afirmación'], 3, '-mi destaca una afirmación.'],
        ];
    }
}
