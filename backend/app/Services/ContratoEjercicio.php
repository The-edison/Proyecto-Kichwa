<?php

namespace App\Services;

use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\String\UnicodeString;

class ContratoEjercicio
{
    public static function validateDraft(array $exercise, array $answer): void
    {
        $key = match ($exercise['type']) {
            'completar' => 'textos','ordenar' => 'orden','seleccion_multiple' => 'seleccion',default => 'pares'
        };
        $ids = array_column($exercise['elements'], 'id');
        $rules = ['answer' => ['array:'.$key], 'answer.'.$key => ['sometimes', 'array', 'max:50']];
        if ($key === 'textos') {
            $rules['answer.textos.*'] = ['nullable', 'string', 'max:500'];
            foreach (array_keys(is_array($answer['textos'] ?? null) ? $answer['textos'] : []) as $id) {
                if (! in_array($id, $ids, true)) {
                    self::fail('El espacio no pertenece al ejercicio.', 'answer');
                }
            }
        } elseif ($key === 'pares') {
            $origins = array_column(array_filter($exercise['elements'], fn ($e) => $exercise['type'] === 'arrastrar' || ($e['grupo'] ?? '') === 'origen'), 'id');
            $targets = $exercise['type'] === 'arrastrar' ? array_column($exercise['zones'], 'id') : array_column(array_filter($exercise['elements'], fn ($e) => ($e['grupo'] ?? '') === 'destino'), 'id');
            $rules['answer.pares.*'] = ['array:origen,destino'];
            $rules['answer.pares.*.origen'] = ['required', 'string', Rule::in($origins), 'distinct:strict'];
            $rules['answer.pares.*.destino'] = ['required', 'string', Rule::in($targets), 'distinct:strict'];
        } else {
            $rules['answer.'.$key.'.*'] = ['string', Rule::in($ids), 'distinct:strict'];
        }
        Validator::make(['answer' => $answer], $rules)->validate();
    }

    public static function feedback(array $exercise, bool $correct): string
    {
        $config = $exercise['config'] ?? [];
        $message = trim($config[$correct ? 'correct_feedback' : 'incorrect_feedback'] ?? '');
        if ($message === '') {
            $message = $correct ? 'Respuesta correcta.' : 'Revisa el tema y vuelve a practicar.';
        }

        return trim($message.' '.($config['explanation'] ?? ''));
    }

    public static function validate(array $data): void
    {
        Validator::make($data, [
            'type' => ['required', Rule::in(['seleccion_multiple', 'completar', 'relacionar', 'arrastrar', 'ordenar'])],
            'prompt' => ['required', 'string', 'max:10000'],
            'elements' => ['required', 'array', 'min:1', 'max:50'],
            'elements.*' => ['required', 'array:id,texto,grupo,imagen,opciones'],
            'elements.*.id' => ['required', 'string', 'max:40', 'regex:/^[a-zA-Z0-9_-]+$/', 'distinct:strict'],
            'elements.*.texto' => ['required', 'string', 'max:500'],
            'elements.*.grupo' => ['sometimes', Rule::in(['origen', 'destino'])],
            'elements.*.imagen' => ['nullable', 'string', 'max:500'],
            'elements.*.opciones' => ['sometimes', 'array', 'max:50'],
            'elements.*.opciones.*' => ['string', 'max:500'],
            'zones' => ['present', 'array', 'max:50'],
            'zones.*' => ['array:id,texto,x,y,imagen'],
            'zones.*.id' => ['required', 'string', 'max:40', 'regex:/^[a-zA-Z0-9_-]+$/', 'distinct:strict'],
            'zones.*.texto' => ['required', 'string', 'max:500'],
            'zones.*.x' => ['required', 'numeric', 'between:0,1'],
            'zones.*.y' => ['required', 'numeric', 'between:0,1'],
            'zones.*.imagen' => ['nullable', 'string', 'max:500'],
            'resource' => ['nullable', 'string', 'max:500'],
            'solution' => ['required', 'array'],
            'config' => ['sometimes', 'array'],
            'config.max_selections' => ['sometimes', 'integer', 'between:1,50'],
            'config.exact_selections' => ['sometimes', 'boolean'],
            'config.ignore_accents' => ['sometimes', 'boolean'],
            'config.requires_audio' => ['sometimes', 'boolean'],
            'config.listening_vowels' => ['sometimes', 'boolean'],
            'config.listening_questions' => ['sometimes', 'boolean'],
            'config.listening_greetings' => ['sometimes', 'boolean'],
            'config.pronouns_activity' => ['sometimes', 'in:persons,groups,listening,complete,order,listening-pronouns'],
            'config.animal_group' => ['sometimes', 'in:domestic,wild'],
            'config.color_activity' => ['sometimes', 'in:apply,listen,understand,interpret,meaning,complete,order'],
            'config.color_panel' => ['sometimes', 'integer', 'between:1,5'],
            'config.body_activity' => ['sometimes', 'in:locate,details,recognize,listen,understand,order'],
            'config.body_panel' => ['sometimes', 'integer', 'between:1,4'],
            'config.animal_activity' => ['sometimes', 'in:identify,listen,understand,complete,understand-complete,order,labels,write'],
            'config.conversation_pairs' => ['sometimes', 'boolean'],
            'config.conversation_group' => ['sometimes', 'in:q,a,d,c'],
            'config.scene_choice' => ['sometimes', 'boolean'],
            'config.sentence_order' => ['sometimes', 'boolean'],
            'config.requires_images' => ['sometimes', 'boolean'],
            'config.reviewed' => ['sometimes', 'boolean'],
            'config.presentation' => ['sometimes', 'in:buttons,visual,letter,tiles,writing'],
            'config.word_target' => ['nullable', 'string', 'max:50', 'regex:/^[\p{L}]+$/u'],
            'config.missing_index' => ['sometimes', 'integer', 'between:0,49'],
            'config.context_text' => ['nullable', 'string', 'max:500'],
            'config.context_meaning' => ['nullable', 'string', 'max:500'],
            'config.prompt_image' => ['nullable', 'string', 'max:500'],
            'config.reveal_highlight' => ['nullable', 'string', 'max:50'],
            'config.explanation' => ['nullable', 'string', 'max:2000'],
            'config.correct_feedback' => ['nullable', 'string', 'max:2000'],
            'config.incorrect_feedback' => ['nullable', 'string', 'max:2000'],
        ], ['required' => 'El campo :attribute es obligatorio.', 'distinct' => 'No repitas identificadores.',
            'array' => 'La estructura de :attribute no es válida.', 'between' => 'Las coordenadas deben estar entre 0 y 1.'])->validate();
        $presentation = $data['config']['presentation'] ?? '';
        if (($data['config']['sentence_order'] ?? false) && ($data['type'] !== 'ordenar'
            || empty($data['config']['prompt_image']) || empty($data['config']['context_text'])
            || count($data['elements']) < 2 || collect($data['elements'])->contains(fn ($element) => preg_match('/\s/u', trim($element['texto']))))) {
            self::fail('Cada oración necesita una imagen, su significado y fichas de palabras separadas.', 'config');
        }
        if ($data['config']['scene_choice'] ?? false) {
            $group = $data['config']['conversation_group'] ?? '';
            $lastOption = match ($group) {
                'c' => 3, 'd' => 4, default => 5
            };
            if ($data['type'] !== 'seleccion_multiple' || ! in_array($group, ['q', 'a', 'd', 'c'], true) || count($data['elements']) !== 3
                || empty($data['config']['prompt_image']) || empty($data['config']['context_text'])
                || collect($data['elements'])->contains(fn ($element) => ! preg_match('/^'.preg_quote($group, '/').'-[0-'.$lastOption.']$/', $element['id']))) {
                self::fail('Cada escena necesita su imagen, contexto y tres opciones del mismo grupo en kichwa.', 'config');
            }
        }
        if ($data['config']['conversation_pairs'] ?? false) {
            $origins = array_merge(array_map(fn ($index) => 'q-'.$index, range(0, 5)), array_map(fn ($index) => 'a-'.$index, range(0, 5)));
            if (isset($data['config']['conversation_group'])) {
                $group = $data['config']['conversation_group'];
                $count = match ($group) {
                    'd' => 5, 'c' => 4, default => 6
                };
                $origins = array_map(fn ($index) => $group.'-'.$index, range(0, $count - 1));
            }
            $actualOrigins = array_column(array_filter($data['elements'], fn ($element) => ($element['grupo'] ?? '') === 'origen'), 'id');
            $actualDestinations = array_column(array_filter($data['elements'], fn ($element) => ($element['grupo'] ?? '') === 'destino'), 'id');
            if ($data['type'] !== 'relacionar' || ! self::sameKeys($origins, $actualOrigins)
                || ! self::sameKeys(array_map(fn ($id) => 'es-'.$id, $origins), $actualDestinations)) {
                self::fail('El panel necesita todas las expresiones y sus significados en español.', 'config');
            }
        }
        if (($data['config']['listening_greetings'] ?? false) && ($data['type'] !== 'completar'
            || array_column($data['elements'], 'id') !== ['alli-puncha-churi', 'alli-chishi-kusa', 'alli-tuta-tayta']
            || collect($data['elements'])->contains(fn ($element) => substr_count($element['texto'], '_____') !== 1 || empty($element['opciones'])))) {
            self::fail('El panel de saludos necesita las tres oraciones con sus opciones y una palabra que falta.', 'config');
        }
        if (isset($data['config']['animal_activity'])) {
            $group = $data['config']['animal_group'] ?? '';
            $activity = $data['config']['animal_activity'];
            $counts = ['domestic' => ['identify' => 6, 'listen' => 4, 'understand' => 3, 'complete' => 3, 'understand-complete' => 6, 'order' => 3],
                'wild' => ['identify' => 6, 'listen' => 3, 'labels' => 3, 'write' => 3, 'order' => 3]];
            if ($data['type'] !== 'completar' || ! isset($counts[$group][$activity]) || count($data['elements']) !== $counts[$group][$activity]
                || collect($data['elements'])->contains(fn (array $element): bool => empty($element['imagen'])
                    || ($activity === 'write' ? ! empty($element['opciones']) : empty($element['opciones'])))) {
                self::fail('El panel de animales necesita su grupo, imágenes y todas sus filas con las opciones correspondientes.', 'config');
            }
            if ($activity === 'order' && collect($data['elements'])->contains(fn (array $element): bool => collect($element['opciones'])->contains(fn (string $word): bool => preg_match('/\s/u', $word) === 1))) {
                self::fail('Cada ficha de la oración debe contener una sola palabra.', 'elements');
            }
            if ($activity === 'complete' && collect($data['elements'])->contains(fn (array $element): bool => substr_count($element['texto'], '_____') !== 1)) {
                self::fail('Cada oración necesita exactamente un espacio para completar.', 'elements');
            }
            if ($activity === 'understand-complete') {
                if (array_column($data['elements'], 'id') !== ['d-sentence-1', 'd-mama', 'd-sentence-2', 'd-boy', 'd-sentence-3', 'd-jose']) {
                    self::fail('Mantén juntas las tres oraciones, cada una seguida de su palabra que falta.', 'elements');
                }
                foreach (array_chunk($data['elements'], 2) as [$meaning, $completion]) {
                    if (substr_count($meaning['texto'], '_____') !== 0 || substr_count($completion['texto'], '_____') !== 1) {
                        self::fail('Cada oración necesita su significado y un espacio para completar, en ese orden.', 'elements');
                    }
                }
            }
        }
        if (isset($data['config']['color_activity'])) {
            $activity = $data['config']['color_activity'];
            $shapes = ['apply' => [1, ['c-cup', 'c-notebook', 'c-bag']], 'listen' => [1, ['c-audio-1', 'c-audio-2', 'c-audio-3']],
                'understand' => [2, ['c-understand-pants', 'c-understand-hat', 'c-understand-cat']],
                'interpret' => [3, ['c-hat', 'c-cat', 'c-pants', 'c-shawl', 'c-necklace', 'c-shoes']],
                'meaning' => [4, ['c-shawl', 'c-necklace', 'c-shoes']], 'complete' => [4, ['c-hat', 'c-pants', 'c-shawl']],
                'order' => [5, ['c-cat', 'c-necklace', 'c-shoes']]];
            [$panel, $ids] = $shapes[$activity];
            if ($data['type'] !== 'completar' || ($data['config']['color_panel'] ?? null) !== $panel || array_column($data['elements'], 'id') !== $ids
                || collect($data['elements'])->contains(fn (array $element): bool => $activity === 'complete' ? ! empty($element['opciones']) || substr_count($element['texto'], '_____') !== 1 : empty($element['opciones']))) {
                self::fail('El ejercicio de colores necesita todas sus filas, opciones y el panel correspondiente.', 'config');
            }
            if (in_array($activity, ['apply', 'listen', 'interpret'], true)
                && collect($data['elements'])->contains(fn (array $element): bool => array_diff($element['opciones'], ['yurak', 'yana', 'puka', 'killu', 'ankas', 'waylla', 'paku', 'maywa', 'kishpu', 'waminsi', 'suku']) !== [])) {
                self::fail('Selecciona solamente los colores de la lección.', 'elements');
            }
            if ($activity === 'order' && collect($data['elements'])->contains(fn (array $element): bool => collect($element['opciones'])->contains(fn (string $word): bool => preg_match('/\s/u', $word) === 1))) {
                self::fail('Cada ficha de la oración debe contener una sola palabra.', 'elements');
            }
        }
        if (isset($data['config']['body_activity'])) {
            $activity = $data['config']['body_activity'];
            $shapes = ['locate' => [1, ['b-uma', 'b-kunka', 'b-rikra', 'b-maki', 'b-wiksa', 'b-kunkuri', 'b-chaki', 'b-washa', 'b-ruka', 'b-sillu']],
                'details' => [2, ['b-nawi', 'b-rinri', 'b-shimi', 'b-kiru', 'b-hallu', 'b-chaki-washa']],
                'recognize' => [2, ['b-kunkuri', 'b-wiksa', 'b-washa']], 'listen' => [3, ['b-audio-1', 'b-audio-2', 'b-audio-3']],
                'understand' => [3, ['b-sentence-head', 'b-sentence-belly', 'b-sentence-foot', 'b-sentence-throat']],
                'order' => [4, ['b-sentence-head', 'b-sentence-belly', 'b-sentence-foot', 'b-sentence-throat']]];
            [$panel, $ids] = $shapes[$activity];
            if ($data['type'] !== 'completar' || ($data['config']['body_panel'] ?? null) !== $panel || array_column($data['elements'], 'id') !== $ids
                || collect($data['elements'])->contains(fn (array $element): bool => empty($element['imagen']) || ($activity === 'listen' ? ! empty($element['opciones']) : empty($element['opciones'])))) {
                self::fail('El ejercicio del cuerpo necesita todas sus imágenes, filas y el panel correspondiente.', 'config');
            }
            if ($activity === 'order' && collect($data['elements'])->contains(fn (array $element): bool => collect($element['opciones'])->contains(fn (string $word): bool => preg_match('/\s/u', $word) === 1))) {
                self::fail('Cada ficha de la oración debe contener una sola palabra.', 'elements');
            }
        }
        if (isset($data['config']['pronouns_activity'])) {
            $activity = $data['config']['pronouns_activity'];
            if ($data['type'] !== 'completar' || count($data['elements']) !== 3
                || collect($data['elements'])->contains(fn (array $element): bool => empty($element['opciones']))) {
                self::fail('Cada ejercicio de pronombres necesita tres filas con sus opciones.', 'config');
            }
            if (str_starts_with($activity, 'listening') && array_column($data['elements'], 'id') !== ['audio1', 'audio2', 'audio3']) {
                self::fail('El ejercicio debe incluir los tres audios de pronombres en orden.', 'config');
            }
            if ($activity === 'order' && collect($data['elements'])->contains(fn (array $element): bool => collect($element['opciones'])->contains(fn (string $word): bool => preg_match('/\s/u', $word) === 1))) {
                self::fail('Cada ficha debe contener una sola palabra.', 'elements');
            }
        }
        if (($data['config']['listening_questions'] ?? false) && ($data['type'] === 'completar'
            ? array_column($data['elements'], 'id') !== ['imatak', 'pitak-kan', 'imamanta'] || collect($data['elements'])->contains(fn ($element) => empty($element['imagen']) || empty($element['opciones']))
            : $data['type'] !== 'relacionar' || array_column(array_values(array_filter($data['elements'], fn ($element) => ($element['grupo'] ?? '') === 'origen')), 'id') !== ['imatak', 'pitak-kan', 'imamanta'])) {
            self::fail('El ejercicio de preguntas necesita los tres audios: Imatak, Pitak kan e Imamanta.', 'config');
        }
        if (($data['config']['listening_vowels'] ?? false) && ($data['type'] !== 'completar' || $presentation !== 'writing'
            || array_column($data['elements'], 'id') !== ['audio1', 'audio2', 'audio3']
            || collect($data['elements'])->contains(fn ($element) => ! preg_match('/^[a-z]+_[a-z]+$/', $element['texto'])))) {
            self::fail('El ejercicio de audio requiere tres palabras con una vocal faltante.', 'config');
        }
        if (($presentation === 'letter' || $presentation === 'writing') && $data['type'] !== 'completar'
            || ($presentation === 'buttons' || $presentation === 'visual') && $data['type'] !== 'seleccion_multiple'
            || $presentation === 'tiles' && $data['type'] !== 'ordenar') {
            self::fail('La presentación no corresponde al tipo de ejercicio.', 'config');
        }
        if ($presentation === 'visual' && (count($data['elements']) < 2 || collect($data['elements'])->contains(fn ($e) => empty($e['imagen'])))) {
            self::fail('Sube todas las imágenes antes de publicar.', 'elements');
        }
        if ($presentation === 'writing' && collect($data['elements'])->contains(fn ($e) => ! empty($e['opciones']))) {
            self::fail('La escritura no debe ofrecer alternativas.', 'elements');
        }
        if ($presentation === 'letter') {
            $word = $data['config']['word_target'] ?? '';
            $index = $data['config']['missing_index'] ?? -1;
            $element = $data['elements'][0];
            $expected = mb_substr($word, $index, 1);
            if (count($data['elements']) !== 1 || $index < 0 || $index >= mb_strlen($word) || empty($element['opciones'])
                || ($data['solution']['textos'][$element['id']] ?? []) !== [$expected]
                || $element['texto'] !== mb_substr($word, 0, $index).'_'.mb_substr($word, $index + 1)) {
                self::fail('La palabra, el hueco y la respuesta deben coincidir.', 'config');
            }
        }
        if ($presentation === 'tiles' && ! empty($data['config']['word_target'])) {
            $letters = array_column($data['elements'], 'texto', 'id');
            $order = $data['solution']['orden'] ?? [];
            self::selection($order, array_keys($letters));
            if (! is_array($order) || array_diff($order, array_keys($letters)) !== [] || mb_strtoupper(implode('', array_map(fn ($id) => $letters[$id], $order))) !== mb_strtoupper($data['config']['word_target'])) {
                self::fail('El orden de las fichas debe formar la palabra objetivo.', 'solution');
            }
        }
        if (! empty($data['resource'])) {
            self::file($data['resource'], 'audio');
        }
        if (! empty($data['config']['prompt_image'])) {
            self::file($data['config']['prompt_image'], 'imagenes');
        }
        foreach (array_merge($data['elements'], $data['zones']) as $element) {
            if (! empty($element['imagen'])) {
                self::file($element['imagen'], 'imagenes');
            }
        }
        $solution = $data['solution'];
        if ($data['type'] === 'ordenar') {
            self::keys($solution, ['orden']);
            self::selection($solution['orden'] ?? null, array_column($data['elements'], 'id'));
            if (count($solution['orden']) !== count($data['elements'])) {
                self::fail('La secuencia debe incluir cada letra exactamente una vez.');
            }
        } elseif ($data['type'] === 'seleccion_multiple') {
            self::keys($solution, ['seleccion']);
            self::selection($solution['seleccion'] ?? null, array_column($data['elements'], 'id'));
            if (count($solution['seleccion']) > ($data['config']['max_selections'] ?? 50)) {
                self::fail('El límite de selección debe permitir todas las respuestas correctas.');
            }
            if (($data['config']['exact_selections'] ?? false) && count($solution['seleccion']) !== ($data['config']['max_selections'] ?? 50)) {
                self::fail('La cantidad exacta debe coincidir con las opciones correctas.');
            }
        } elseif ($data['type'] === 'completar') {
            self::keys($solution, ['textos']);
            $texts = $solution['textos'] ?? null;
            if (! is_array($texts) || ! self::sameKeys(array_keys($texts), array_column($data['elements'], 'id'))) {
                self::fail();
            }
            foreach ($data['elements'] as $element) {
                $variants = $texts[$element['id']];
                if (! is_array($variants) || ! array_is_list($variants) || count($variants) < 1 || count($variants) > 20) {
                    self::fail();
                }
                foreach ($variants as $variant) {
                    if (! is_string($variant) || trim($variant) === '' || mb_strlen($variant) > 500) {
                        self::fail();
                    }
                    if (($data['config']['pronouns_activity'] ?? null) === 'order' || ($data['config']['animal_activity'] ?? null) === 'order' || ($data['config']['color_activity'] ?? null) === 'order' || ($data['config']['body_activity'] ?? null) === 'order') {
                        $words = explode(' ', $variant);
                        $options = $element['opciones'] ?? [];
                        sort($words);
                        sort($options);
                        if ($words !== $options) {
                            self::fail('La oración debe usar todas las palabras del banco exactamente una vez.');
                        }
                    } elseif (! empty($element['opciones']) && ! in_array($variant, $element['opciones'], true)) {
                        self::fail();
                    }
                }
            }
        } else {
            self::keys($solution, ['pares']);
            self::pairs($data, $solution['pares'] ?? null);
        }
        if ($data['type'] !== 'arrastrar' && $data['zones'] !== []) {
            self::fail('Las zonas sólo corresponden a arrastrar.');
        }
    }

    public static function file(string $path, string $folder): void
    {
        /** @var FilesystemAdapter $disk */
        $disk = Storage::disk('public');

        if (! preg_match('#^kichwa/'.preg_quote($folder, '#').'/[a-zA-Z0-9]+\\.(?:png|jpg|jpeg|webp|mp3|wav|ogg|m4a)$#', $path)
            || ! $disk->exists($path)) {
            self::fail('El archivo debe subirse desde el panel.', 'resource');
        }
        $mime = $disk->mimeType($path);
        $allowed = $folder === 'imagenes' ? ['image/png', 'image/jpeg', 'image/webp'] :
            ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'application/ogg', 'audio/mp4', 'video/mp4', 'audio/x-m4a'];
        if (! in_array($mime, $allowed, true)) {
            self::fail('El tipo real del archivo no es válido.', 'resource');
        }
    }

    private static function fail(string $message = 'La solución o las referencias del ejercicio no son válidas.', string $field = 'solution'): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }

    private static function keys(array $data, array $keys): void
    {
        if (! self::sameKeys(array_keys($data), $keys)) {
            self::fail();
        }
    }

    private static function sameKeys(array $a, array $b): bool
    {
        sort($a);
        sort($b);

        return $a === $b;
    }

    private static function selection(mixed $selected, array $ids): void
    {
        if (! is_array($selected) || ! array_is_list($selected) || ! count($selected)) {
            self::fail();
        }
        foreach ($selected as $id) {
            if (! is_string($id) || ! in_array($id, $ids, true)) {
                self::fail();
            }
        }
        if (count($selected) !== count(array_unique($selected))) {
            self::fail();
        }
    }

    private static function pairs(array $data, mixed $pairs): void
    {
        if ($data['type'] === 'relacionar') {
            foreach ($data['elements'] as $element) {
                if (! in_array($element['grupo'] ?? '', ['origen', 'destino'], true)) {
                    self::fail('Cada elemento de relacionar debe pertenecer a origen o destino.');
                }
            }
        }
        $sources = array_values(array_filter($data['elements'], fn ($e) => $data['type'] === 'arrastrar' || ($e['grupo'] ?? '') === 'origen'));
        $destinations = $data['type'] === 'arrastrar' ? $data['zones'] :
            array_values(array_filter($data['elements'], fn ($e) => ($e['grupo'] ?? '') === 'destino'));
        if (! count($sources) || ! count($destinations) || ! is_array($pairs) || ! array_is_list($pairs) || count($pairs) !== count($sources)) {
            self::fail();
        }
        $seen = [];
        $targets = [];
        foreach ($pairs as $pair) {
            if (! is_array($pair)) {
                self::fail();
            }
            self::keys($pair, ['origen', 'destino']);
            if (! in_array($pair['origen'], array_column($sources, 'id'), true) || ! in_array($pair['destino'], array_column($destinations, 'id'), true)
                || in_array($pair['origen'], $seen, true) || in_array($pair['destino'], $targets, true)) {
                self::fail();
            }
            $seen[] = $pair['origen'];
            $targets[] = $pair['destino'];
        }
    }

    public static function grade(array $exercise, array $answer): bool
    {
        if ($exercise['type'] === 'ordenar') {
            self::keys($answer, ['orden']);
            self::selection($answer['orden'] ?? null, array_column($exercise['elements'], 'id'));
            if (count($answer['orden']) !== count($exercise['elements'])) {
                self::fail(($exercise['config']['sentence_order'] ?? false) ? 'Ordena todas las palabras.' : 'Ordena todas las letras.', 'answer');
            }
            $letters = array_column($exercise['elements'], 'texto', 'id');

            return array_map(fn ($id) => $letters[$id], $answer['orden']) === array_map(fn ($id) => $letters[$id], $exercise['solution']['orden']);
        }
        if ($exercise['type'] === 'seleccion_multiple') {
            self::keys($answer, ['seleccion']);
            self::selection($answer['seleccion'] ?? null, array_column($exercise['elements'], 'id'));
            if (count($answer['seleccion']) > ($exercise['config']['max_selections'] ?? 50)) {
                self::fail('Has superado el límite de selecciones.', 'answer');
            }
            if (($exercise['config']['exact_selections'] ?? false) && count($answer['seleccion']) !== ($exercise['config']['max_selections'] ?? 50)) {
                self::fail('Selecciona exactamente la cantidad indicada.', 'answer');
            }

            return self::sameKeys($answer['seleccion'], $exercise['solution']['seleccion']);
        }
        if ($exercise['type'] === 'completar') {
            self::keys($answer, ['textos']);
            if (! is_array($answer['textos'] ?? null) || ! self::sameKeys(array_keys($answer['textos']), array_keys($exercise['solution']['textos']))) {
                self::fail('Responde todos los espacios.', 'answer');
            }
            if (in_array($exercise['config']['color_activity'] ?? '', ['apply', 'listen', 'interpret'], true)) {
                foreach ($exercise['elements'] as $element) {
                    if (! in_array($answer['textos'][$element['id']], $element['opciones'], true)) {
                        self::fail('Selecciona una muestra de color disponible.', 'answer');
                    }
                }
            }
            $correct = true;
            foreach ($exercise['solution']['textos'] as $id => $variants) {
                $text = $answer['textos'][$id];
                if (! is_string($text) || mb_strlen($text) > 500) {
                    self::fail('Respuesta inválida.', 'answer');
                }
                $normalize = fn (string $value): string => self::normalize($value, $exercise['config']['ignore_accents'] ?? false);
                $correct = $correct && in_array($normalize($text), array_map($normalize, $variants), true);
            }

            return $correct;
        }
        self::keys($answer, ['pares']);
        self::pairs($exercise, $answer['pares'] ?? null);
        $pairs = fn ($list) => array_map(fn ($p) => $p['origen'].':'.$p['destino'], $list);

        return self::sameKeys($pairs($answer['pares']), $pairs($exercise['solution']['pares']));
    }

    public static function itemResults(array $exercise, array $answer): array
    {
        $results = [];
        if ($exercise['type'] === 'completar') {
            foreach ($exercise['solution']['textos'] as $id => $variants) {
                $normalize = fn (string $value): string => self::normalize($value, $exercise['config']['ignore_accents'] ?? false);
                $results[$id] = in_array($normalize($answer['textos'][$id]), array_map($normalize, $variants), true);
            }
        } elseif ($exercise['type'] === 'seleccion_multiple') {
            foreach ($answer['seleccion'] as $id) {
                $results[$id] = in_array($id, $exercise['solution']['seleccion'], true);
            }
        } elseif ($exercise['type'] === 'ordenar') {
            $words = array_column($exercise['elements'], 'texto', 'id');
            foreach ($answer['orden'] as $position => $id) {
                $expected = $exercise['solution']['orden'][$position] ?? null;
                $results[$id] = $expected !== null && $words[$expected] === $words[$id];
            }
        } else {
            $expected = array_column($exercise['solution']['pares'], 'destino', 'origen');
            foreach ($answer['pares'] as $pair) {
                $results[$pair['origen']] = ($expected[$pair['origen']] ?? null) === $pair['destino'];
            }
        }

        return ['item_results' => $results];
    }

    private static function normalize(string $text, bool $ignoreAccents = false): string
    {
        $text = (new UnicodeString($text))->toString();
        if ($ignoreAccents) {
            $text = strtr($text, ['á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'Á' => 'A', 'É' => 'E', 'Í' => 'I', 'Ó' => 'O', 'Ú' => 'U']);
        }

        return mb_strtolower(trim(preg_replace('/\\s+/u', ' ', $text)));
    }
}
