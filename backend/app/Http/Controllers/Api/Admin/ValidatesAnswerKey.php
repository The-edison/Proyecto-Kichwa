<?php

namespace App\Http\Controllers\Api\Admin;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;

trait ValidatesAnswerKey
{
    protected function validateAnswerKey(array $data, ?Model $record): void
    {
        $type = $data['type'] ?? $record?->type;
        $options = $data['options'] ?? $record?->options;
        $correct = $data['correct_answer'] ?? $record?->correct_answer;

        if ($type === 'complete') {
            if (isset($data['options']) && $data['options'] !== []) {
                throw ValidationException::withMessages(['options' => 'Completar no usa opciones.']);
            }
            return;
        }

        if (! is_array($options) || count($options) < 2 || count($options) !== count(array_unique($options))) {
            throw ValidationException::withMessages(['options' => 'Se requieren al menos dos opciones distintas.']);
        }
        if (! in_array($correct, $options, true)) {
            throw ValidationException::withMessages(['correct_answer' => 'La respuesta correcta debe estar entre las opciones.']);
        }
    }
}
