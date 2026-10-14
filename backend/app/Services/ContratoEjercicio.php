<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

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
                    if (! empty($element['opciones']) && ! in_array($variant, $element['opciones'], true)) {
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
        if (! preg_match('#^kichwa/'.preg_quote($folder, '#').'/[a-zA-Z0-9]+\\.(?:png|jpg|jpeg|webp|mp3|wav|ogg|m4a)$#', $path)
            || ! Storage::disk('public')->exists($path)) {
            self::fail('El archivo debe subirse desde el panel.', 'resource');
        }
        $mime = Storage::disk('public')->mimeType($path);
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
                self::fail('Ordena todas las letras.', 'answer');
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

    private static function normalize(string $text, bool $ignoreAccents = false): string
    {
        if (class_exists(\Normalizer::class)) {
            $text = \Normalizer::normalize($text, \Normalizer::FORM_C);
        }
        if ($ignoreAccents) {
            $text = strtr($text, ['á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'Á' => 'A', 'É' => 'E', 'Í' => 'I', 'Ó' => 'O', 'Ú' => 'U']);
        }

        return mb_strtolower(trim(preg_replace('/\\s+/u', ' ', $text)));
    }
}
