<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\Evaluation;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;

class EvaluationController extends BaseResourceController
{
    protected string $modelClass = Evaluation::class;

    protected function storeRules(): array
    {
        return [
            'level_id' => ['required', 'exists:levels,id'],
            'title' => ['required', 'string', 'max:160'],
            'description' => ['nullable', 'string'],
            'passing_score' => ['sometimes', 'integer', 'between:0,100'],
            'is_published' => ['sometimes', 'boolean'],
        ];
    }

    protected function updateRules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:160'],
            'description' => ['sometimes', 'nullable', 'string'],
            'passing_score' => ['sometimes', 'integer', 'between:0,100'],
            'is_published' => ['sometimes', 'boolean'],
        ];
    }

    protected function afterValidation(array $data, ?Model $record): void
    {
        if (($data['is_published'] ?? false) && (! $record || ! $record->questions()->exists())) {
            throw ValidationException::withMessages(['is_published' => 'Añade preguntas antes de publicar la evaluación.']);
        }
    }
}
