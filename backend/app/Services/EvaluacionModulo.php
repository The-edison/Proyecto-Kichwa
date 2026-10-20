<?php

namespace App\Services;

use App\Models\EvaluacionKichwa;
use App\Models\IntentoEvaluacion;
use App\Models\Unidad;
use Illuminate\Support\Collection;

class EvaluacionModulo
{
    public static function status(EvaluacionKichwa $evaluation, int $user, ?Collection $activityCounts = null): array
    {
        $units = Unidad::where('id_modulo', $evaluation->id_modulo)->orderBy('orden_unidad')->get();
        $expected = collect($evaluation->configuracion['prerequisite_units'] ?? []);
        $visible = $units->where('publicado', true);
        $coverage = $expected->isNotEmpty() && $expected->diff($visible->modelKeys())->isEmpty();
        $activityCounts ??= ProgresoAprendizaje::unitActivities($user);
        $requirements = $visible->map(function (Unidad $unit) use ($activityCounts): array {
            $counts = $activityCounts->get($unit->id_unidad, ['total' => 0, 'correct' => 0]);

            return ['id' => $unit->id_unidad, 'title' => $unit->titulo_unidad, 'total' => $counts['total'],
                'correct' => $counts['correct'], 'completed' => $counts['total'] > 0 && $counts['correct'] === $counts['total']];
        })->values();
        $results = IntentoEvaluacion::where('id_evaluacion', $evaluation->id_evaluacion)->where('id_usuario', $user)
            ->where('estado_intento', 'finalizado')->get(['resultado']);

        return ['id' => $evaluation->id_evaluacion, 'title' => $evaluation->titulo_evaluacion,
            'question_count' => $evaluation->configuracion['question_count'] ?? 15, 'pass_percentage' => $evaluation->configuracion['pass_percentage'] ?? 80,
            'unlocked' => $coverage && $requirements->isNotEmpty() && $requirements->every(fn (array $unit): bool => $unit['completed']),
            'completed_units' => $requirements->where('completed', true)->count(), 'total_units' => $requirements->count(),
            'units' => $requirements->all(), 'best_score' => $results->max('resultado.score'), 'passed' => $results->contains(fn ($attempt): bool => (bool) ($attempt->resultado['passed'] ?? false))];
    }

    public static function assertUnlocked(EvaluacionKichwa $evaluation, int $user): void
    {
        abort_unless(self::status($evaluation, $user)['unlocked'], 403, 'Completa correctamente todas las actividades de las cinco unidades del módulo 1 para habilitar la prueba final.');
    }
}
