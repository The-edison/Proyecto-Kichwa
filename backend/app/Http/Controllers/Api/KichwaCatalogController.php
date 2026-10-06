<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Actividad;
use App\Models\Diccionario;
use App\Models\EvaluacionKichwa;
use App\Models\Modulo;
use App\Models\Nivel;
use App\Models\Pregunta;
use App\Models\ProgresoUnidad;
use App\Models\Tema;
use App\Models\Unidad;
use App\Models\UsuarioNivel;
use App\Models\VistaIntento;
use App\Models\VistaProgresoNivel;
use App\Services\KichwaResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class KichwaCatalogController extends Controller
{
    public static function basicUnit(int $id): Unidad
    {
        $unit = Unidad::findOrFail($id);
        $module = Modulo::findOrFail($unit->id_modulo);
        abort_unless(Nivel::findOrFail($module->id_nivel)->orden_nivel === 1, 404, 'El nivel Intermedio estará disponible próximamente.');

        return $unit;
    }

    public static function basicEvaluation(EvaluacionKichwa $evaluation): void
    {
        if ($evaluation->id_unidad !== null) {
            self::basicUnit($evaluation->id_unidad);
        }
    }

    public function levels(): JsonResponse
    {
        return response()->json(Nivel::where('orden_nivel', 1)->get()->map(fn ($r) => KichwaResource::present('levels', $r)));
    }

    public function modules(Request $request, int $level): JsonResponse
    {
        abort_unless(Nivel::findOrFail($level)->orden_nivel === 1, 404);
        UsuarioNivel::firstOrCreate(['id_usuario' => $request->user()->id_usuario, 'id_nivel' => $level]);
        $progress = DB::table('v_progreso_modulos')->where('id_usuario', $request->user()->id_usuario)->pluck('porcentaje_progreso_modulo', 'id_modulo');

        return response()->json(Modulo::where('id_nivel', $level)->orderBy('orden_modulo')->get()->map(fn ($r) => KichwaResource::present('modules', $r) + ['percentage' => (float) ($progress[$r->id_modulo] ?? 0)]));
    }

    public function units(Request $request, int $module): JsonResponse
    {
        $record = Modulo::findOrFail($module);
        abort_unless(Nivel::findOrFail($record->id_nivel)->orden_nivel === 1, 404);

        $progress = DB::table('v_progreso')->where('id_usuario', $request->user()->id_usuario)->pluck('porcentaje_progreso', 'id_unidad');

        return response()->json(Unidad::where('id_modulo', $module)->orderBy('orden_unidad')->get()->map(fn ($r) => KichwaResource::present('units', $r) + ['percentage' => (float) ($progress[$r->id_unidad] ?? 0)]));
    }

    public function contents(Request $request, int $unit): JsonResponse
    {
        self::basicUnit($unit);
        ProgresoUnidad::firstOrCreate(['id_usuario' => $request->user()->id_usuario, 'id_unidad' => $unit]);

        return response()->json(Tema::where('id_unidad', $unit)->orderBy('orden_tema')->get()->map(fn ($r) => KichwaResource::present('contents', $r)));
    }

    public function exercises(int $unit): JsonResponse
    {
        self::basicUnit($unit);

        return response()->json(Actividad::where('id_unidad', $unit)->orderBy('orden_actividad')->get()->map(fn ($r) => KichwaResource::present('exercises', $r)));
    }

    public function evaluations(int $level): JsonResponse
    {
        abort_unless(Nivel::findOrFail($level)->orden_nivel === 1, 404);
        $unitIds = Unidad::whereIn('id_modulo', Modulo::where('id_nivel', $level)->select('id_modulo'))->pluck('id_unidad');

        return response()->json(EvaluacionKichwa::where(fn ($q) => $q->whereIn('id_unidad', $unitIds)->orWhere('tipo_evaluacion', 'diagnostica'))
            ->whereIn('id_evaluacion', Pregunta::select('id_evaluacion'))->orderBy('id_evaluacion')->get()
            ->map(fn ($r) => KichwaResource::present('evaluations', $r) + ['level_id' => $level]));
    }

    public function evaluation(int $evaluation): JsonResponse
    {
        $record = EvaluacionKichwa::findOrFail($evaluation);
        self::basicEvaluation($record);

        return response()->json(KichwaResource::present('evaluations', $record) + [
            'level_id' => Nivel::where('orden_nivel', 1)->firstOrFail()->id_nivel,
            'description' => $record->tipo_evaluacion === 'diagnostica' ? 'Diagnóstico general del Básico.' : 'Evaluación de unidad.',
            'questions' => Pregunta::where('id_evaluacion', $evaluation)->orderBy('orden_pregunta')->get()->map(fn ($r) => KichwaResource::present('questions', $r))]);
    }

    public function glossary(Request $request): JsonResponse
    {
        $request->validate(['q' => ['sometimes', 'string', 'max:100']]);
        $query = Diccionario::query();
        if ($request->filled('q')) {
            $needle = '%'.trim($request->input('q')).'%';
            $query->where(fn ($q) => $q->where('palabra_kichwa_diccionario', 'ilike', $needle)->orWhere('palabra_espanol_diccionario', 'ilike', $needle));
        }

        return response()->json($query->orderBy('palabra_kichwa_diccionario')->paginate(20)->through(fn ($r) => KichwaResource::present('glossary', $r)));
    }

    public function progress(Request $request): JsonResponse
    {
        $level = Nivel::where('orden_nivel', 1)->firstOrFail();
        UsuarioNivel::firstOrCreate(['id_usuario' => $request->user()->id_usuario, 'id_nivel' => $level->id_nivel]);
        $unitIds = Unidad::whereIn('id_modulo', Modulo::where('id_nivel', $level->id_nivel)->select('id_modulo'))->pluck('id_unidad');
        $activities = Actividad::whereIn('id_unidad', $unitIds)->pluck('id_actividad');
        $completed = DB::table('respuestas_actividad')->where('id_usuario', $request->user()->id_usuario)->whereIn('id_actividad', $activities)->where('acierto_actividad', true)->distinct()->count('id_actividad');
        $results = VistaIntento::where('id_usuario', $request->user()->id_usuario)->where('estado_intento', 'finalizado')
            ->selectRaw('id_evaluacion as evaluation_id, max(porcentaje_calificacion) as best_score, max(fecha_fin_intento) as completed_at')->groupBy('id_evaluacion')->get();
        $result = ['level' => ['id' => $level->id_nivel, 'name' => $level->nombre_nivel],
            'completed_activities' => $completed, 'total_activities' => count($activities),
            'percentage' => (float) (VistaProgresoNivel::where('id_usuario', $request->user()->id_usuario)->where('id_nivel', $level->id_nivel)->value('porcentaje_progreso_nivel') ?? 0),
            'evaluation_results' => $results];

        return response()->json($request->route('level') !== null ? $result : [$result]);
    }
}
