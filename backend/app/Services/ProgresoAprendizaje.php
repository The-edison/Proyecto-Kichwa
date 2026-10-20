<?php

namespace App\Services;

use App\Models\EvaluacionKichwa;
use App\Models\IntentoEvaluacion;
use App\Models\Modulo;
use App\Models\Nivel;
use App\Models\Unidad;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ProgresoAprendizaje
{
    public static function unitActivities(int $user): Collection
    {
        $activities = PublicacionContenido::exercises()->select('id_unidad')
            ->selectRaw("id_unidad::text || ':' || COALESCE(origen_reactivo,id_actividad::text) as lineage")->get();
        $correct = DB::table('respuestas_actividad as r')->join('actividades as a', 'a.id_actividad', '=', 'r.id_actividad')
            ->where('r.id_usuario', $user)->where('r.acierto_actividad', true)
            ->whereIn(DB::raw("a.id_unidad::text || ':' || COALESCE(a.origen_reactivo,a.id_actividad::text)"), $activities->pluck('lineage'))
            ->selectRaw("a.id_unidad::text || ':' || COALESCE(a.origen_reactivo,a.id_actividad::text) as lineage")->distinct()->pluck('lineage');

        return $activities->groupBy('id_unidad')->map(fn ($items): array => [
            'total' => $items->pluck('lineage')->unique()->count(),
            'correct' => $items->pluck('lineage')->unique()->intersect($correct)->count(),
        ]);
    }

    public static function forUser(int $user, array $completedUnits): array
    {
        $activityCounts = self::unitActivities($user);
        $levels = Nivel::where('publicado', true)->where(fn ($q) => $q->where('orden_nivel', 1)->orWhereIn('id_nivel', Modulo::where('publicado', true)->select('id_nivel')))->orderBy('orden_nivel')->get();
        $modules = Modulo::where('publicado', true)->whereIn('id_nivel', $levels->modelKeys())->orderBy('orden_modulo')->orderBy('id_modulo')->get();
        $units = Unidad::where('publicado', true)->whereIn('id_modulo', $modules->modelKeys())->orderBy('orden_unidad')->orderBy('id_unidad')->get();
        $finals = EvaluacionKichwa::where('publicado', true)->where('tipo_evaluacion', 'modulo')->whereIn('id_modulo', $modules->modelKeys())->get()->keyBy('id_modulo');
        $attempts = IntentoEvaluacion::where('id_usuario', $user)->whereIn('id_evaluacion', $finals->modelKeys())->orderByDesc('id_intento')->get()->groupBy('id_evaluacion');
        $unitFinals = EvaluacionKichwa::where('publicado', true)->where('tipo_evaluacion', 'unidad')->whereIn('id_unidad', $units->modelKeys())
            ->where(fn ($query) => $query->whereNull('id_tema')->orWhere('configuracion->final', true))->pluck('id_unidad');
        $unitReports = $units->map(function (Unidad $unit) use ($activityCounts, $completedUnits, $unitFinals): array {
            $counts = $activityCounts->get($unit->id_unidad, ['total' => 0, 'correct' => 0]);
            $practiceComplete = $counts['total'] > 0 && $counts['correct'] === $counts['total'];
            $mode = $unit->configuracion['learning_mode'] ?? 'classic';
            $completed = $mode === 'guided' ? $practiceComplete : in_array($unit->id_unidad, $completedUnits, true)
                || ($practiceComplete && $mode !== 'sequence' && ! $unitFinals->contains($unit->id_unidad));

            return ['id' => $unit->id_unidad, 'module_id' => $unit->id_modulo, 'title' => $unit->titulo_unidad,
                'completed_activities' => $counts['correct'], 'total_activities' => $counts['total'],
                'percentage' => $counts['total'] > 0 ? round(100 * $counts['correct'] / $counts['total'], 2) : 0,
                'completed' => $completed];
        });
        $moduleReports = $modules->map(function (Modulo $module) use ($unitReports, $finals, $user, $activityCounts, $attempts): array {
            $children = $unitReports->where('module_id', $module->id_modulo)->values();
            $exam = $finals->get($module->id_modulo);
            $final = $exam ? EvaluacionModulo::status($exam, $user, $activityCounts) : null;
            if ($final) {
                $history = $attempts->get($exam->id_evaluacion, collect());
                $finished = $history->where('estado_intento', 'finalizado');
                $final += ['attempt_count' => $finished->count(), 'latest_score' => $finished->first()?->resultado['score'] ?? null,
                    'in_progress' => $history->contains('estado_intento', 'en_curso')];
            }
            $completed = $children->isNotEmpty() && $children->every(fn ($unit): bool => $unit['completed']) && (! $final || $final['passed']);

            return ['id' => $module->id_modulo, 'level_id' => $module->id_nivel, 'title' => $module->nombre_modulo,
                'completed_activities' => $children->sum('completed_activities'), 'total_activities' => $children->sum('total_activities'),
                'percentage' => round($children->avg('percentage') ?? 0, 2), 'completed' => $completed,
                'completed_units' => $children->where('completed', true)->count(), 'total_units' => $children->count(),
                'units' => $children->all(), 'final_evaluation' => $final];
        });
        $levelReports = $levels->map(function (Nivel $level) use ($moduleReports): array {
            $children = $moduleReports->where('level_id', $level->id_nivel)->values();

            return ['id' => $level->id_nivel, 'title' => $level->nombre_nivel,
                'percentage' => round($children->flatMap(fn ($module) => $module['units'])->avg('percentage') ?? 0, 2),
                'completed' => $children->isNotEmpty() && $children->every(fn ($module): bool => $module['completed']),
                'modules' => $children->all()];
        });
        $next = null;
        foreach ($levelReports->flatMap(fn ($level) => $level['modules']) as $module) {
            foreach ($module['units'] as $unit) {
                if (! $unit['completed'] && $unit['total_activities'] > 0) {
                    $next = ['kind' => 'unit', 'id' => $unit['id'], 'title' => $unit['title'], 'level_id' => $module['level_id']];
                    break 2;
                }
            }
            if ($module['final_evaluation'] && ! $module['final_evaluation']['passed'] && $module['final_evaluation']['unlocked']) {
                $next = ['kind' => 'module_final', 'id' => $module['final_evaluation']['id'], 'title' => $module['final_evaluation']['title'], 'level_id' => $module['level_id']];
                break;
            }
        }
        $total = $unitReports->sum('total_activities');
        $correct = $unitReports->sum('completed_activities');
        $moduleFinals = $moduleReports->pluck('final_evaluation')->filter();

        return ['summary' => ['completed_activities' => $correct, 'total_activities' => $total, 'percentage' => $total ? round(100 * $correct / $total, 2) : 0,
            'completed_units' => $unitReports->where('completed', true)->count(), 'total_units' => $unitReports->count(),
            'completed_modules' => $moduleReports->where('completed', true)->count(), 'total_modules' => $moduleReports->count(),
            'passed_finals' => $moduleFinals->where('passed', true)->count(), 'total_finals' => $moduleFinals->count()],
            'levels' => $levelReports->all(), 'next_step' => $next];
    }
}
