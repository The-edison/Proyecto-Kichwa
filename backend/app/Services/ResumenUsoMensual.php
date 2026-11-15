<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class ResumenUsoMensual
{
    public function data(int|string|null $groupId = null): array
    {
        $timezone = 'America/Guayaquil';
        $now = now($timezone)->toImmutable();
        $current = $now->startOfMonth();
        $start = $current->subMonths(5)->toIso8601String();
        $end = $now->toIso8601String();
        $exercises = DB::table('respuestas_actividad')
            ->selectRaw("id_usuario, fecha_respuesta_actividad as occurred_at, 'exercise' as kind")
            ->where('fecha_respuesta_actividad', '>=', $start)
            ->where('fecha_respuesta_actividad', '<=', $end);
        $evaluations = DB::table('intentos_evaluacion')
            ->selectRaw("id_usuario, fecha_fin_intento as occurred_at, 'evaluation' as kind")
            ->where('estado_intento', 'finalizado')
            ->where('fecha_fin_intento', '>=', $start)
            ->where('fecha_fin_intento', '<=', $end);
        $activity = DB::query()->fromSub($exercises->unionAll($evaluations), 'activity')
            ->join('usuarios', 'usuarios.id_usuario', '=', 'activity.id_usuario')
            ->where('usuarios.rol_usuario', 'estudiante');
        if ($groupId === 'sin_grupo') {
            $activity->whereNull('usuarios.grupo_id');
        } elseif ($groupId !== null) {
            $activity->where('usuarios.grupo_id', $groupId);
        }
        $totals = $activity
            ->selectRaw("to_char(occurred_at AT TIME ZONE ?, 'YYYY-MM') as month", [$timezone])
            ->selectRaw('count(distinct activity.id_usuario) as active_students')
            ->selectRaw("count(case when kind = 'exercise' then 1 end) as exercise_answers")
            ->selectRaw("count(case when kind = 'evaluation' then 1 end) as completed_tests")
            ->selectRaw('count(distinct (occurred_at AT TIME ZONE ?)::date) as active_days', [$timezone])
            ->groupByRaw('1')->get()->keyBy('month');

        $months = [];
        for ($offset = 5; $offset >= 0; $offset--) {
            $month = $current->subMonths($offset)->format('Y-m');
            $totalsForMonth = $totals->get($month);
            $months[] = [
                'month' => $month,
                'active_students' => (int) ($totalsForMonth->active_students ?? 0),
                'exercise_answers' => (int) ($totalsForMonth->exercise_answers ?? 0),
                'completed_tests' => (int) ($totalsForMonth->completed_tests ?? 0),
                'active_days' => (int) ($totalsForMonth->active_days ?? 0),
            ];
        }

        return ['current_month' => $current->format('Y-m'), 'timezone' => $timezone, 'months' => $months];
    }
}
