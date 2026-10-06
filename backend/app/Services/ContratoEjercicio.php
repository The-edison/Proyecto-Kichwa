<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ContratoEjercicio
{
    public static function validate(array $data): void
    {
        Validator::make($data, [
            'type' => ['required', Rule::in(['seleccion_multiple', 'completar', 'relacionar', 'arrastrar'])],
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
        ], ['required' => 'El campo :attribute es obligatorio.', 'distinct' => 'No repitas identificadores.',
            'array' => 'La estructura de :attribute no es válida.', 'between' => 'Las coordenadas deben estar entre 0 y 1.'])->validate();
        if (! empty($data['resource'])) {
            self::file($data['resource'], 'audio');
        }
        foreach (array_merge($data['elements'], $data['zones']) as $element) {
            if (! empty($element['imagen'])) {
                self::file($element['imagen'], 'imagenes');
            }
        }
        $solution = $data['solution'];
        if ($data['type'] === 'seleccion_multiple') {
            self::keys($solution, ['seleccion']);
            self::selection($solution['seleccion'] ?? null, array_column($data['elements'], 'id'));
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
        if ($exercise['type'] === 'seleccion_multiple') {
            self::keys($answer, ['seleccion']);
            self::selection($answer['seleccion'] ?? null, array_column($exercise['elements'], 'id'));

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
                $correct = $correct && in_array(self::normalize($text), array_map(self::normalize(...), $variants), true);
            }

            return $correct;
        }
        self::keys($answer, ['pares']);
        self::pairs($exercise, $answer['pares'] ?? null);
        $pairs = fn ($list) => array_map(fn ($p) => $p['origen'].':'.$p['destino'], $list);

        return self::sameKeys($pairs($answer['pares']), $pairs($exercise['solution']['pares']));
    }

    private static function normalize(string $text): string
    {
        if (class_exists(\Normalizer::class)) {
            $text = \Normalizer::normalize($text, \Normalizer::FORM_C);
        }

        return mb_strtolower(preg_replace('/\\s+/u', ' ', trim($text)));
    }
}
