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
use App\Services\PublicacionContenido;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class KichwaCatalogController extends Controller
{
    public static function publishedUnit(int $id): Unidad
    {
        return Unidad::select('unidades.*', 'modulos.id_nivel', 'modulos.nombre_modulo', 'niveles.nombre_nivel')->join('modulos', 'modulos.id_modulo', '=', 'unidades.id_modulo')
            ->join('niveles', 'niveles.id_nivel', '=', 'modulos.id_nivel')->whereIn('niveles.orden_nivel', [1, 2])
            ->where('modulos.publicado', true)->where('unidades.publicado', true)->where('unidades.id_unidad', $id)->firstOrFail();
    }

    public static function publishedEvaluation(EvaluacionKichwa $evaluation): void
    {
        if ($evaluation->id_unidad !== null) {
            self::publishedUnit($evaluation->id_unidad);
        }
    }

    private function publishedLevel(int $id): Nivel
    {
        $level = Nivel::whereIn('orden_nivel', [1, 2])->findOrFail($id);
        abort_unless($level->orden_nivel === 1 || Modulo::where('id_nivel', $id)->where('publicado', true)->exists(), 404);

        return $level;
    }

    private function paginate(Request $request, string $key, callable $load): array
    {
        $request->validate(['page' => ['sometimes', 'integer', 'min:1']]);

        return PublicacionContenido::remember($key.':'.$request->integer('page', 1), fn () => $load()->paginate(20)->through(fn ($record) => $record)->toArray());
    }

    public function levels(): JsonResponse
    {
        return response()->json(PublicacionContenido::remember('student-levels', fn () => Nivel::whereIn('orden_nivel', [1, 2])->addSelect(['has_published_modules' => Modulo::selectRaw('count(*) > 0')->whereColumn('modulos.id_nivel', 'niveles.id_nivel')->where('publicado', true)])->orderBy('orden_nivel')->get()->map(fn ($r) => KichwaResource::present('levels', $r))->all()));
    }

    public function modules(Request $request, int $level): JsonResponse
    {
        $this->publishedLevel($level);
        UsuarioNivel::firstOrCreate(['id_usuario' => $request->user()->id_usuario, 'id_nivel' => $level]);
        $data = $this->paginate($request, 'modules:'.$level, fn () => Modulo::where('id_nivel', $level)->where('publicado', true)->orderBy('orden_modulo'));
        $progress = DB::table('v_progreso_modulos')->where('id_usuario', $request->user()->id_usuario)->whereIn('id_modulo', array_column($data['data'], 'id_modulo'))->pluck('porcentaje_progreso_modulo', 'id_modulo');
        $data['data'] = array_map(fn ($r) => KichwaResource::present('modules', (new Modulo)->newFromBuilder($r)) + ['percentage' => (float) ($progress[$r['id_modulo']] ?? 0)], $data['data']);

        return response()->json($data);
    }

    public function module(int $module): JsonResponse
    {
        $record = Modulo::where('publicado', true)->findOrFail($module);
        $level = $this->publishedLevel($record->id_nivel);

        return response()->json(KichwaResource::present('modules', $record) + ['level_name' => $level->nombre_nivel]);
    }

    public function units(Request $request, int $module): JsonResponse
    {
        $this->module($module);
        $data = $this->paginate($request, 'units:'.$module, fn () => Unidad::where('id_modulo', $module)->where('publicado', true)->orderBy('orden_unidad'));
        $progress = DB::table('v_progreso')->where('id_usuario', $request->user()->id_usuario)->whereIn('id_unidad', array_column($data['data'], 'id_unidad'))->pluck('porcentaje_progreso', 'id_unidad');
        $data['data'] = array_map(fn ($r) => KichwaResource::present('units', (new Unidad)->newFromBuilder($r)) + ['percentage' => (float) ($progress[$r['id_unidad']] ?? 0)], $data['data']);

        return response()->json($data);
    }

    public function moduleContents(Request $request, int $module): JsonResponse
    {
        $this->module($module);
        $request->validate(['page' => ['sometimes', 'integer', 'min:1']]);
        $data = PublicacionContenido::remember('module-contents:'.$module.':'.$request->integer('page', 1), fn () => Tema::query()
            ->join('unidades as u', 'u.id_unidad', '=', 'temas.id_unidad')
            ->where('u.id_modulo', $module)->where('u.publicado', true)->where('temas.publicado', true)
            ->select('temas.id_tema', 'temas.id_unidad', 'temas.tipo_tema', 'temas.titulo_tema', 'temas.orden_tema', 'temas.publicado', 'u.titulo_unidad as unit_title', 'u.orden_unidad as unit_order')
            ->selectSub(DB::table('actividades')->selectRaw('count(*)')->whereColumn('actividades.id_tema', 'temas.id_tema'), 'exercise_count')
            ->orderBy('u.orden_unidad')->orderBy('temas.orden_tema')->orderBy('temas.id_tema')
            ->paginate(20)->through(fn ($r) => KichwaResource::present('contents', $r) + ['unit_title' => $r->unit_title, 'unit_order' => $r->unit_order, 'exercise_count' => (int) $r->exercise_count])->toArray());

        return response()->json($this->topicProgress($request, $data));
    }

    public function unit(Request $request, int $unit): JsonResponse
    {
        $record = self::publishedUnit($unit);

        return response()->json(KichwaResource::present('units', $record) + ['level_id' => $record->id_nivel, 'level_name' => $record->nombre_nivel, 'module_name' => $record->nombre_modulo, 'percentage' => (float) (DB::table('v_progreso')->where('id_usuario', $request->user()->id_usuario)->where('id_unidad', $unit)->value('porcentaje_progreso') ?? 0)]);
    }

    public function contents(Request $request, int $unit): JsonResponse
    {
        self::publishedUnit($unit);
        ProgresoUnidad::firstOrCreate(['id_usuario' => $request->user()->id_usuario, 'id_unidad' => $unit]);
        $request->validate(['page' => ['sometimes', 'integer', 'min:1']]);

        $data = PublicacionContenido::remember('contents:'.$unit.':'.$request->integer('page', 1), fn () => Tema::where('id_unidad', $unit)->where('publicado', true)->select('id_tema', 'id_unidad', 'tipo_tema', 'titulo_tema', 'orden_tema', 'publicado')->orderBy('orden_tema')->paginate(20)->through(fn ($r) => KichwaResource::present('contents', $r))->toArray());

        return response()->json($this->topicProgress($request, $data));
    }

    private function topicProgress(Request $request, array $data): array
    {
        $progress = DB::table('actividades as a')->leftJoin('respuestas_actividad as r', function ($join) use ($request) {
            $join->on('r.id_actividad', '=', 'a.id_actividad')->where('r.id_usuario', $request->user()->id_usuario)->where('r.acierto_actividad', true);
        })->whereIn('a.id_tema', array_column($data['data'], 'id'))->groupBy('a.id_tema')->selectRaw('a.id_tema, round(100.0 * count(distinct r.id_actividad) / nullif(count(distinct a.id_actividad), 0), 2) as percentage')->pluck('percentage', 'id_tema');
        $data['data'] = array_map(fn ($topic) => $topic + ['percentage' => (float) ($progress[$topic['id']] ?? 0)], $data['data']);

        return $data;
    }

    public function topic(int $unit, int $topic): JsonResponse
    {
        self::publishedUnit($unit);

        return response()->json(KichwaResource::present('contents', Tema::where('id_unidad', $unit)->where('publicado', true)->findOrFail($topic)));
    }

    public function exercises(Request $request, int $unit): JsonResponse
    {
        self::publishedUnit($unit);
        $request->validate(['topic_id' => ['sometimes', 'integer', 'exists:temas,id_tema'], 'page' => ['sometimes', 'integer', 'min:1']]);
        $query = Actividad::where('id_unidad', $unit)->where(fn ($q) => $q->whereNull('id_tema')->orWhereIn('id_tema', Tema::where('publicado', true)->select('id_tema')));
        if ($request->filled('topic_id')) {
            $topic = Tema::where('publicado', true)->where('id_unidad', $unit)->findOrFail($request->integer('topic_id'));
            $query->where('id_tema', $topic->id_tema);
        } else {
            $query->whereNull('id_tema');
        }

        return response()->json($query->select(array_values(array_diff(KichwaResource::FIELDS['exercises'], ['solucion_actividad'])) + [])->addSelect('id_tema')->orderBy('orden_actividad')->paginate(20)->through(fn ($r) => KichwaResource::present('exercises', $r)));
    }

    public function evaluations(Request $request, int $level): JsonResponse
    {
        $record = $this->publishedLevel($level);
        $query = EvaluacionKichwa::where(function ($q) use ($level, $record) {
            $q->whereIn('id_unidad', PublicacionContenido::unitIds($level));
            if ($record->orden_nivel === 1) {
                $q->orWhere(fn ($q) => $q->whereNull('id_unidad')->where('tipo_evaluacion', 'diagnostica'));
            }
        })
            ->whereIn('id_evaluacion', Pregunta::select('id_evaluacion'));
        if ($request->input('type') === 'diagnostica') {
            $query->where('tipo_evaluacion', 'diagnostica');
        }
        if ($request->filled('unit_id')) {
            abort_unless(self::publishedUnit($request->integer('unit_id'))->id_nivel === $level, 404);
            $query->where('id_unidad', $request->integer('unit_id'));
        }

        return response()->json($query->orderBy('id_evaluacion')->paginate(20)->through(fn ($r) => KichwaResource::present('evaluations', $r) + ['level_id' => $level]));
    }

    public function evaluation(int $evaluation): JsonResponse
    {
        $record = EvaluacionKichwa::findOrFail($evaluation);
        self::publishedEvaluation($record);
        $level = $record->id_unidad !== null ? self::publishedUnit($record->id_unidad)->id_nivel : Nivel::where('orden_nivel', 1)->firstOrFail()->id_nivel;

        return response()->json(KichwaResource::present('evaluations', $record) + ['level_id' => $level, 'description' => 'Evaluación del nivel.',
            'questions' => Pregunta::where('id_evaluacion', $evaluation)->select(array_values(array_diff(KichwaResource::FIELDS['questions'], ['solucion_pregunta'])))->orderBy('orden_pregunta')->get()->map(fn ($r) => KichwaResource::present('questions', $r))]);
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
        if ($request->route('level') !== null) {
            return response()->json($this->levelProgress($request, $this->publishedLevel((int) $request->route('level'))));
        }
        $levels = Nivel::whereIn('orden_nivel', [1, 2])->where(fn ($q) => $q->where('orden_nivel', 1)->orWhereIn('id_nivel', Modulo::where('publicado', true)->select('id_nivel')))->orderBy('orden_nivel')->get();

        return response()->json($levels->map(fn ($level) => $this->levelProgress($request, $level)));
    }

    private function levelProgress(Request $request, Nivel $level): array
    {
        UsuarioNivel::firstOrCreate(['id_usuario' => $request->user()->id_usuario, 'id_nivel' => $level->id_nivel]);
        $activities = Actividad::whereIn('id_unidad', PublicacionContenido::unitIds($level->id_nivel))->where(fn ($q) => $q->whereNull('id_tema')->orWhereIn('id_tema', Tema::where('publicado', true)->select('id_tema')))->pluck('id_actividad');
        $completed = DB::table('respuestas_actividad')->where('id_usuario', $request->user()->id_usuario)->whereIn('id_actividad', $activities)->where('acierto_actividad', true)->distinct()->count('id_actividad');
        $results = VistaIntento::where('id_usuario', $request->user()->id_usuario)->where('estado_intento', 'finalizado')->whereIn('id_evaluacion', EvaluacionKichwa::where(function ($q) use ($level) {
            $q->whereIn('id_unidad', PublicacionContenido::unitIds($level->id_nivel));
            if ($level->orden_nivel === 1) {
                $q->orWhereNull('id_unidad');
            }
        })->select('id_evaluacion'))
            ->selectRaw('id_evaluacion as evaluation_id,max(porcentaje_calificacion) as best_score,max(fecha_fin_intento) as completed_at')->groupBy('id_evaluacion')->get();
        $result = ['level' => ['id' => $level->id_nivel, 'name' => $level->nombre_nivel], 'completed_activities' => $completed, 'total_activities' => count($activities),
            'percentage' => (float) (VistaProgresoNivel::where('id_usuario', $request->user()->id_usuario)->where('id_nivel', $level->id_nivel)->value('porcentaje_progreso_nivel') ?? 0), 'evaluation_results' => $results];

        return $result;
    }
}
