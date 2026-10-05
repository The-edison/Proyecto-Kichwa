<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\EvaluationQuestion;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class QuestionController extends BaseResourceController
{
    use ValidatesAnswerKey;

    protected string $modelClass = EvaluationQuestion::class;

    protected function storeRules(): array
    {
        return [
            'evaluation_id' => ['required', 'exists:evaluations,id'],
            'type' => ['required', Rule::in(['multiple_choice', 'complete', 'select'])],
            'prompt' => ['required', 'string'],
            'options' => ['nullable', 'array'],
            'options.*' => ['string', 'max:500'],
            'correct_answer' => ['required', 'string', 'max:500'],
            'feedback_correct' => ['nullable', 'string'],
            'feedback_incorrect' => ['nullable', 'string'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ];
    }

    protected function updateRules(): array
    {
        $rules = $this->storeRules();
        unset($rules['evaluation_id']);
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

    protected function beforeDelete(Model $record): void
    {
        abort_if(
            $record->evaluation->is_published && $record->evaluation->questions()->count() === 1,
            409,
            'Despublica la evaluación antes de eliminar su ?última pregunta.'
        );
        abort_if(
            DB::table('evaluation_attempt_answers')->where('evaluation_question_id', $record->id)->exists(),
            409,
            'Esta pregunta tiene respuestas históricas; despublica la evaluación.'
        );
    }
}
