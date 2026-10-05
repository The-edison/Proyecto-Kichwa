<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Evaluation;
use App\Models\EvaluationAttempt;
use App\Models\EvaluationAttemptAnswer;
use App\Services\AnswerChecker;
use App\Services\PublishedCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class EvaluationSubmissionController extends Controller
{
    public function store(Request $request, Evaluation $evaluation): JsonResponse
    {
        PublishedCatalog::evaluation($evaluation);
        $data = $request->validate([
            'answers' => ['required', 'array', 'min:1'],
            'answers.*.question_id' => ['required', 'integer'],
            'answers.*.answer' => ['required', 'string', 'max:500'],
        ]);

        $questions = $evaluation->questions()->orderBy('sort_order')->get()->keyBy('id');
        $submitted = collect($data['answers'])->keyBy('question_id');

        if ($questions->isEmpty() || $submitted->count() !== count($data['answers']) ||
            $submitted->count() !== $questions->count() ||
            $submitted->keys()->diff($questions->keys())->isNotEmpty()) {
            throw ValidationException::withMessages(['answers' => 'Envía una respuesta para cada pregunta de esta evaluación.']);
        }

        $results = [];
        $correctCount = 0;
        foreach ($questions as $question) {
            $answer = $submitted[$question->id]['answer'];
            if ($question->type !== 'complete' && ! in_array($answer, $question->options ?? [], true)) {
                throw ValidationException::withMessages(['answers' => 'Una respuesta no pertenece a las opciones de su pregunta.']);
            }

            $correct = AnswerChecker::matches($answer, $question->correct_answer);
            $correctCount += (int) $correct;
            $results[] = [
                'question_id' => $question->id,
                'submitted_answer' => $answer,
                'is_correct' => $correct,
                'correct_answer' => $question->correct_answer,
                'feedback' => $correct
                    ? ($question->feedback_correct ?: 'Respuesta correcta.')
                    : ($question->feedback_incorrect ?: 'Revisa la respuesta correcta.'),
            ];
        }

        $score = round($correctCount * 100 / $questions->count(), 2);
        $attempt = DB::transaction(function () use ($request, $evaluation, $results, $score, $correctCount, $questions) {
            $attempt = EvaluationAttempt::create([
                'user_id' => $request->user()->id,
                'evaluation_id' => $evaluation->id,
                'score' => $score,
                'correct_count' => $correctCount,
                'total_questions' => $questions->count(),
            ]);

            foreach ($results as $result) {
                EvaluationAttemptAnswer::create([
                    'evaluation_attempt_id' => $attempt->id,
                    'evaluation_question_id' => $result['question_id'],
                    'submitted_answer' => $result['submitted_answer'],
                    'is_correct' => $result['is_correct'],
                ]);
            }

            DB::table('progress')->insertOrIgnore([
                'user_id' => $request->user()->id,
                'level_id' => $evaluation->level_id,
                'exercise_id' => null,
                'evaluation_id' => $evaluation->id,
                'best_score' => $score,
                'completed_at' => now(),
            ]);
            DB::table('progress')->where('user_id', $request->user()->id)
                ->where('evaluation_id', $evaluation->id)
                ->where('best_score', '<', $score)
                ->update(['best_score' => $score]);

            return $attempt;
        });

        return response()->json([
            'attempt_id' => $attempt->id,
            'score' => $score,
            'passed' => $score >= $evaluation->passing_score,
            'correct_count' => $correctCount,
            'total_questions' => $questions->count(),
            'results' => $results,
        ]);
    }
}
