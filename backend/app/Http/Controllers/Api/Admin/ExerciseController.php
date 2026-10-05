<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\Exercise;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

class ExerciseController extends BaseResourceController
{
    use ValidatesAnswerKey;

    protected string $modelClass = Exercise::class;

    protected function storeRules(): array
    {
        return [
            'content_id' => ['required', 'exists:contents,id'],
            'type' => ['required', Rule::in(['multiple_choice', 'complete', 'select'])],
            'prompt' => ['required', 'string'],
            'options' => ['nullable', 'array'],
            'options.*' => ['string', 'max:500'],
            'correct_answer' => ['required', 'string', 'max:500'],
            'feedback_correct' => ['nullable', 'string'],
            'feedback_incorrect' => ['nullable', 'string'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'is_published' => ['sometimes', 'boolean'],
        ];
    }

    protected function updateRules(): array
    {
        $rules = $this->storeRules();
        unset($rules['content_id']);
        foreach ($rules as &$parts) {
            $parts = array_values(array_filter($parts, fn ($part) => $part !== 'required'));
            array_unshift($parts, 'sometimes');
        }
        unset($parts);

        return $rules;
    }

    protected function afterValidation(array $data, ?Model $record): void
    {
        $this->validateAnswerKey($data, $record);
    }
}
