<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Evaluation;
use App\Models\Exercise;
use App\Models\Level;
use App\Models\Progress;
use App\Services\PublishedCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProgressController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(Level::where('is_published', true)->orderBy('sort_order')->get()
            ->map(fn (Level $level) => $this->summary($request->user()->id, $level)));
    }

    public function show(Request $request, Level $level): JsonResponse
    {
        PublishedCatalog::level($level);

        return response()->json($this->summary($request->user()->id, $level));
    }

    private function summary(int $userId, Level $level): array
    {
        $exerciseIds = Exercise::where('is_published', true)
            ->whereHas('content', fn ($q) => $q->where('is_published', true)
                ->whereHas('unit', fn ($q) => $q->where('is_published', true)
                    ->whereHas('module', fn ($q) => $q->where('is_published', true)
                        ->where('level_id', $level->id))))
            ->pluck('id');

        $evaluationIds = Evaluation::where('level_id', $level->id)
            ->where('is_published', true)->pluck('id');

        $completedExercises = Progress::where('user_id', $userId)
            ->whereIn('exercise_id', $exerciseIds)->count();
        $evaluations = Progress::where('user_id', $userId)
            ->whereIn('evaluation_id', $evaluationIds)
            ->get(['evaluation_id', 'best_score', 'completed_at']);

        $total = $exerciseIds->count() + $evaluationIds->count();
        $completed = $completedExercises + $evaluations->count();

        return [
            'level' => ['id' => $level->id, 'name' => $level->name],
            'completed_activities' => $completed,
            'total_activities' => $total,
            'percentage' => $total === 0 ? 0 : round($completed * 100 / $total, 2),
            'evaluation_results' => $evaluations,
        ];
    }
}
