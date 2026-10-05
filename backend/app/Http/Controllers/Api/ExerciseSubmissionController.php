<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Exercise;
use App\Models\ExerciseAttempt;
use App\Services\AnswerChecker;
use App\Services\PublishedCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ExerciseSubmissionController extends Controller
{
    public function store(Request $request, Exercise $exercise): JsonResponse
    {
        $data = $request->validate(['answer' => ['required', 'string', 'max:500']]);
        PublishedCatalog::exercise($exercise);

        if ($exercise->type !== 'complete' && ! in_array($data['answer'], $exercise->options ?? [], true)) {
            throw ValidationException::withMessages(['answer' => 'Selecciona una opción válida.']);
        }

        $correct = AnswerChecker::matches($data['answer'], $exercise->correct_answer);
        $levelId = $exercise->content->unit->module->level_id;

        DB::transaction(function () use ($request, $exercise, $data, $correct, $levelId) {
            ExerciseAttempt::create([
                'user_id' => $request->user()->id,
                'exercise_id' => $exercise->id,
                'submitted_answer' => $data['answer'],
                'is_correct' => $correct,
            ]);

            if ($correct) {
                DB::table('progress')->insertOrIgnore([
                    'user_id' => $request->user()->id,
                    'level_id' => $levelId,
                    'exercise_id' => $exercise->id,
                    'evaluation_id' => null,
                    'best_score' => null,
                    'completed_at' => now(),
                ]);
            }
        });

        return response()->json([
            'is_correct' => $correct,
            'submitted_answer' => $data['answer'],
            'correct_answer' => $exercise->correct_answer,
            'feedback' => $correct
                ? ($exercise->feedback_correct ?: 'Respuesta correcta.')
                : ($exercise->feedback_incorrect ?: 'Revisa la respuesta correcta y vuelve a intentarlo.'),
        ]);
    }
}
