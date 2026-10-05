<?php

namespace App\Services;

use App\Models\Evaluation;
use App\Models\Exercise;
use App\Models\Level;
use App\Models\Progress;
use App\Models\User;

class IntermediateCompletion
{
    public function isComplete(User $user): bool
    {
        $level = Level::where('code', 'intermediate')->where('is_published', true)->first();

        if (! $level) {
            return false;
        }

        $exerciseIds = Exercise::where('is_published', true)
            ->whereHas('content', fn ($query) => $query->where('is_published', true)
                ->whereHas('unit', fn ($query) => $query->where('is_published', true)
                    ->whereHas('module', fn ($query) => $query->where('is_published', true)
                        ->where('level_id', $level->id))))
            ->pluck('id');

        $evaluations = Evaluation::where('level_id', $level->id)
            ->where('is_published', true)
            ->get(['id', 'passing_score']);

        if ($exerciseIds->isEmpty() && $evaluations->isEmpty()) {
            return false;
        }

        $completedExercises = Progress::where('user_id', $user->id)
            ->where('level_id', $level->id)
            ->whereIn('exercise_id', $exerciseIds)
            ->count();

        if ($completedExercises !== $exerciseIds->count()) {
            return false;
        }

        $bestScores = Progress::where('user_id', $user->id)
            ->where('level_id', $level->id)
            ->whereIn('evaluation_id', $evaluations->pluck('id'))
            ->pluck('best_score', 'evaluation_id');

        foreach ($evaluations as $evaluation) {
            if (! isset($bestScores[$evaluation->id]) || (float) $bestScores[$evaluation->id] < $evaluation->passing_score) {
                return false;
            }
        }

        return true;
    }
}
