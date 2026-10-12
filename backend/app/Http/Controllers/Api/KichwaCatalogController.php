<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Actividad;
use App\Models\Diccionario;
use App\Models\EvaluacionKichwa;
use App\Models\IntentoEvaluacion;
use App\Models\Modulo;
use App\Models\Nivel;
use App\Models\Pregunta;
use App\Models\ProgresoUnidad;
use App\Models\Tema;
use App\Models\Unidad;
use App\Models\UsuarioNivel;
use App\Models\VistaIntento;
use App\Models\VistaProgresoNivel;
use App\Services\DominioLecciones;
use App\Services\EstadoContenido;
use App\Services\KichwaResource;
use App\Services\PublicacionContenido;
use App\Services\SecuenciaUnidad;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class KichwaCatalogController extends Controller
{
    public static function publishedUnit(int $id): Unidad
    {
        return Unidad::select('unidades.*', 'modulos.id_nivel', 'modulos.nombre_modulo', 'niveles.nombre_nivel')->join('modulos', 'modulos.id_modulo', '=', 'unidades.id_modulo')
            ->join('niveles', 'niveles.id_nivel', '=', 'modulos.id_nivel')->where('niveles.publicado', true)
            ->where('modulos.publicado', true)->where('unidades.publicado', true)->where('unidades.id_unidad', $id)->firstOrFail();
    }

    public static function publishedEvaluation(EvaluacionKichwa $evaluation): void
    {
        abort_unless($evaluation->publicado, 404);
        if ($evaluation->id_tema !== null) {
            abort_unless(Tema::whereKey($evaluation->id_tema)->where('publicado', true)->exists(), 404);
        }
        if ($evaluation->id_unidad !== null) {
            self::publishedUnit($evaluation->id_unidad);
        }
    }

    private function publishedLevel(int $id): Nivel
    {
        $level = Nivel::where('publicado', true)->findOrFail($id);
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
        return response()->json(PublicacionContenido::remember('student-levels', fn () => Nivel::where('publicado', true)->addSelect(['has_published_modules' => Modulo::selectRaw('count(*) > 0')->whereColumn('modulos.id_nivel', 'niveles.id_nivel')->where('publicado', true)])->orderBy('orden_nivel')->get()->map(fn ($r) => KichwaResource::present('levels', $r))->all()));
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
        $data['data'] = array_map(fn ($r) => KichwaResource::present('units', (new Unidad)->newFromBuilder(array_replace($r, ['configuracion' => json_encode($r['configuracion'] ?? [])]))) + ['percentage' => (float) ($progress[$r['id_unidad']] ?? 0)], $data['data']);

        return response()->json($data);
    }

    public function moduleContents(Request $request, int $module): JsonResponse
    {
        $this->module($module);
        $request->validate(['page' => ['sometimes', 'integer', 'min:1']]);
        $data = PublicacionContenido::remember('module-contents:v2:'.$module.':'.$request->integer('page', 1), fn () => Tema::query()
            ->join('unidades as u', 'u.id_unidad', '=', 'temas.id_unidad')
            ->where('u.id_modulo', $module)->where('u.publicado', true)->where('temas.publicado', true)
            ->select('temas.id_tema', 'temas.id_unidad', 'temas.tipo_tema', 'temas.titulo_tema', 'temas.orden_tema', 'temas.publicado', 'temas.clave_leccion', 'u.titulo_unidad as unit_title', 'u.objetivo_unidad as unit_objective', 'u.orden_unidad as unit_order')
            ->orderBy('u.orden_unidad')->orderBy('temas.orden_tema')->orderBy('temas.id_tema')
            ->paginate(20)->through(fn ($r) => KichwaResource::present('contents', $r) + ['unit_title' => $r->unit_title, 'unit_objective' => $r->unit_objective, 'unit_order' => $r->unit_order])->toArray());

        return response()->json($this->topicProgress($request, $data));
    }

    public function unit(Request $request, int $unit): JsonResponse
    {
        $record = self::publishedUnit($unit);

        return response()->json(KichwaResource::present('units', $record) + ['level_id' => $record->id_nivel, 'level_name' => $record->nombre_nivel, 'module_name' => $record->nombre_modulo, 'percentage' => (float) (DB::table('v_progreso')->where('id_usuario', $request->user()->id_usuario)->where('id_unidad', $unit)->value('porcentaje_progreso') ?? 0)]);
    }

    public function sequence(Request $request, int $unit): JsonResponse
    {
        $record = self::publishedUnit($unit);
        abort_unless(($record->configuracion['learning_mode'] ?? '') === 'sequence', 404);

        return response()->json(SecuenciaUnidad::present($record, $request->user()->id_usuario));
    }

    public function contents(Request $request, int $unit): JsonResponse
    {
        self::publishedUnit($unit);
        ProgresoUnidad::firstOrCreate(['id_usuario' => $request->user()->id_usuario, 'id_unidad' => $unit]);
        $request->validate(['page' => ['sometimes', 'integer', 'min:1']]);

        $data = PublicacionContenido::remember('contents:'.$unit.':'.$request->integer('page', 1), fn () => Tema::where('id_unidad', $unit)->where('publicado', true)->select('id_tema', 'id_unidad', 'tipo_tema', 'titulo_tema', 'orden_tema', 'publicado', 'clave_leccion')->orderBy('orden_tema')->paginate(20)->through(fn ($r) => KichwaResource::present('contents', $r))->toArray());

        return response()->json($this->topicProgress($request, $data));
    }

    private function topicProgress(Request $request, array $data): array
    {
        $progress = DB::table('actividades as a')->leftJoin('respuestas_actividad as r', function ($join) use ($request) {
            $join->whereRaw('r.id_actividad IN (SELECT h.id_actividad FROM actividades h WHERE h.id_unidad=a.id_unidad AND COALESCE(h.origen_reactivo,h.id_actividad::text)=COALESCE(a.origen_reactivo,a.id_actividad::text))')->where('r.id_usuario', $request->user()->id_usuario)->where('r.acierto_actividad', true);
        })->where('a.publicado', true)->whereIn('a.id_tema', array_column($data['data'], 'id'))->groupBy('a.id_tema')->selectRaw('a.id_tema, count(distinct COALESCE(a.origen_reactivo,a.id_actividad::text)) as exercise_count, round(100.0 * count(distinct CASE WHEN r.id_actividad IS NOT NULL THEN COALESCE(a.origen_reactivo,a.id_actividad::text) END) / nullif(count(distinct COALESCE(a.origen_reactivo,a.id_actividad::text)), 0), 2) as percentage')->get()->keyBy('id_tema');
        $masteryData = DominioLecciones::progress($request->user()->id_usuario);
        $mastery = collect($masteryData['lessons'])->keyBy('topic_id');
        $evaluations = EvaluacionKichwa::whereIn('id_unidad', array_unique(array_column($data['data'], 'unit_id')))->where('configuracion->managed', true)->orderByDesc('id_evaluacion')->get();
        $published = $evaluations->where('publicado', true)->unique('id_tema')->keyBy('id_tema');
        $data['data'] = array_map(function ($topic) use ($progress, $mastery, $masteryData, $evaluations, $published, $request): array {
            $evaluation = $published[$topic['id']] ?? null;
            if ($evaluation?->configuracion['sequence_mode'] ?? false) {
                $sequence = SecuenciaUnidad::present(Unidad::findOrFail($topic['unit_id']), $request->user()->id_usuario);

                return array_replace($topic, ['percentage' => round(100 * $sequence['completed_count'] / 7, 2), 'exercise_count' => count($sequence['exercises']),
                    'mastery' => $mastery[$topic['id']] ?? null, 'evaluation_id' => $evaluation->id_evaluacion, 'evaluation_question_count' => 6,
                    'evaluation_final' => true, 'sequence_mode' => true, 'evaluation_locked' => ! $sequence['unlocked']]);
            }
            $final = (bool) ($evaluation?->configuracion['final'] ?? false);
            $prerequisites = $evaluations->where('id_unidad', $topic['unit_id'])->filter(fn ($record) => $record->id_tema !== $topic['id'] && ! ($record->configuracion['final'] ?? false))->pluck('id_tema')->unique();

            return array_replace($topic, ['percentage' => (float) ($progress[$topic['id']]->percentage ?? 0), 'exercise_count' => (int) ($progress[$topic['id']]->exercise_count ?? 0), 'mastery' => $mastery[$topic['id']] ?? null,
                'evaluation_id' => $evaluation?->id_evaluacion, 'evaluation_question_count' => $evaluation ? (int) ($evaluation->configuracion['question_count'] ?? 10) : 0,
                'evaluation_final' => $final, 'evaluation_locked' => $final && ($prerequisites->isEmpty() || $prerequisites->diff($masteryData['mastered_topics'])->isNotEmpty())]);
        }, $data['data']);

        return $data;
    }

    public function topic(int $unit, int $topic): JsonResponse
    {
        self::publishedUnit($unit);

        return response()->json(KichwaResource::present('contents', Tema::where('id_unidad', $unit)->where('publicado', true)->findOrFail($topic)));
    }

    public function exercises(Request $request, int $unit): JsonResponse
    {
        $unitRecord = self::publishedUnit($unit);
        $request->validate(['topic_id' => ['sometimes', 'integer', 'exists:temas,id_tema'], 'page' => ['sometimes', 'integer', 'min:1']]);
        $query = Actividad::where('publicado', true)->where('id_unidad', $unit)->where(fn ($q) => $q->whereNull('id_tema')->orWhereIn('id_tema', Tema::where('publicado', true)->select('id_tema')))
            ->whereRaw('id_actividad = (SELECT max(a2.id_actividad) FROM actividades a2 WHERE a2.id_unidad=actividades.id_unidad AND a2.publicado AND COALESCE(a2.origen_reactivo,a2.id_actividad::text)=COALESCE(actividades.origen_reactivo,actividades.id_actividad::text) AND (a2.id_tema IS NULL OR EXISTS(SELECT 1 FROM temas t2 WHERE t2.id_tema=a2.id_tema AND t2.publicado)))');
        if (($unitRecord->configuracion['learning_mode'] ?? '') === 'sequence') {
            $evaluation = SecuenciaUnidad::evaluation($unit);
            $query->whereIn('id_actividad', $evaluation ? SecuenciaUnidad::practices($evaluation)->pluck('id_actividad') : []);
        }
        if ($request->filled('topic_id')) {
            $topic = Tema::where('publicado', true)->where('id_unidad', $unit)->findOrFail($request->integer('topic_id'));
            $query->where('id_tema', $topic->id_tema);
        } else {
            $query->whereNull('id_tema');
        }

        return response()->json($query->select(array_values(array_diff(KichwaResource::FIELDS['exercises'], ['solucion_actividad'])) + [])->addSelect('id_tema', 'configuracion', 'publicado')->orderBy('orden_actividad')->paginate(20)->through(fn ($r) => KichwaResource::present('exercises', $r)));
    }

    public function evaluations(Request $request, int $level): JsonResponse
    {
        $record = $this->publishedLevel($level);
        $query = EvaluacionKichwa::where('publicado', true)->where(fn ($q) => $q->whereNull('id_tema')->orWhereIn('id_tema', Tema::where('publicado', true)->select('id_tema')))->where(function ($q) use ($level, $record) {
            $q->whereIn('id_unidad', PublicacionContenido::unitIds($level));
            if ($record->orden_nivel === 1) {
                $q->orWhere(fn ($q) => $q->whereNull('id_unidad')->where('tipo_evaluacion', 'diagnostica'));
            }
        })
            ->whereIn('id_evaluacion', Pregunta::select('id_evaluacion'))
            ->where(fn ($q) => $q->whereNull('id_tema')->orWhereRaw('id_evaluacion = (SELECT max(e2.id_evaluacion) FROM evaluaciones e2 WHERE e2.id_tema=evaluaciones.id_tema AND e2.publicado)'));
        if ($request->input('type') === 'diagnostica') {
            $query->where('tipo_evaluacion', 'diagnostica');
        }
        if ($request->filled('unit_id')) {
            abort_unless(self::publishedUnit($request->integer('unit_id'))->id_nivel === $level, 404);
            $query->where('id_unidad', $request->integer('unit_id'));
        }

        return response()->json($query->orderBy('id_evaluacion')->paginate(20)->through(fn ($r) => KichwaResource::present('evaluations', $r) + ['level_id' => $level, 'prerequisite_topic_ids' => ($r->configuracion['final'] ?? false) ? DominioLecciones::prerequisites($r)->all() : []]));
    }

    public function evaluation(Request $request, int $evaluation): JsonResponse
    {
        $record = EvaluacionKichwa::findOrFail($evaluation);
        $ownsAttempt = IntentoEvaluacion::where('id_evaluacion', $evaluation)->where('id_usuario', $request->user()->id_usuario)->exists();
        if (! $ownsAttempt) {
            self::publishedEvaluation($record);
        }
        $level = $record->id_unidad !== null ? self::publishedUnit($record->id_unidad)->id_nivel : Nivel::where('orden_nivel', 1)->firstOrFail()->id_nivel;

        return response()->json(KichwaResource::present('evaluations', $record) + ['level_id' => $level, 'description' => 'Evaluación del nivel.',
            'history' => IntentoEvaluacion::where('id_usuario', $request->user()->id_usuario)->where('id_evaluacion', $evaluation)->orderByDesc('numero_intento')->limit(10)->get()->map(fn ($attempt) => [
                'id' => $attempt->id_intento, 'number' => $attempt->numero_intento, 'state' => $attempt->estado_intento, 'result' => DominioLecciones::result($attempt)]),
            'questions' => ($record->configuracion['managed'] ?? false) ? [] : EstadoContenido::eligible($evaluation)->map(fn ($r) => KichwaResource::present('questions', $r))]);
    }

    public function diccionario(Request $request): JsonResponse
    {
        $request->validate(['q' => ['sometimes', 'string', 'max:100']]);
        $query = Diccionario::query();
        if ($request->filled('q')) {
            $needle = '%'.trim($request->input('q')).'%';
            $query->where(fn ($q) => $q->where('kichwa', 'ilike', $needle)->orWhere('español', 'ilike', $needle));
        }

        return response()->json($query->orderBy('kichwa')->paginate(20)->through(fn ($r) => KichwaResource::present('diccionario', $r)));
    }

    public function progress(Request $request): JsonResponse
    {
        if ($request->route('level') !== null) {
            return response()->json($this->levelProgress($request, $this->publishedLevel((int) $request->route('level'))));
        }
        $levels = Nivel::where('publicado', true)->where(fn ($q) => $q->where('orden_nivel', 1)->orWhereIn('id_nivel', Modulo::where('publicado', true)->select('id_nivel')))->orderBy('orden_nivel')->get();

        return response()->json($levels->map(fn ($level) => $this->levelProgress($request, $level)));
    }

    private function levelProgress(Request $request, Nivel $level): array
    {
        UsuarioNivel::firstOrCreate(['id_usuario' => $request->user()->id_usuario, 'id_nivel' => $level->id_nivel]);
        $activities = Actividad::where('publicado', true)->whereIn('id_unidad', PublicacionContenido::unitIds($level->id_nivel))->where(fn ($q) => $q->whereNull('id_tema')->orWhereIn('id_tema', Tema::where('publicado', true)->select('id_tema')));
        $total = (clone $activities)->selectRaw('COALESCE(origen_reactivo,id_actividad::text) as lineage')->get()->unique('lineage')->count();
        $visibleLineages = (clone $activities)->selectRaw('COALESCE(origen_reactivo,id_actividad::text) as lineage')->get()->pluck('lineage');
        $completed = DB::table('respuestas_actividad as r')->join('actividades as a', 'a.id_actividad', '=', 'r.id_actividad')
            ->where('r.id_usuario', $request->user()->id_usuario)->where('r.acierto_actividad', true)->whereIn('a.id_unidad', PublicacionContenido::unitIds($level->id_nivel))
            ->whereIn(DB::raw('COALESCE(a.origen_reactivo,a.id_actividad::text)'), $visibleLineages)->selectRaw('COALESCE(a.origen_reactivo,a.id_actividad::text) as lineage')->get()->unique('lineage')->count();
        $results = VistaIntento::where('id_usuario', $request->user()->id_usuario)->where('estado_intento', 'finalizado')->whereIn('id_evaluacion', EvaluacionKichwa::where(function ($q) use ($level) {
            $q->whereIn('id_unidad', PublicacionContenido::unitIds($level->id_nivel));
            if ($level->orden_nivel === 1) {
                $q->orWhereNull('id_unidad');
            }
        })->select('id_evaluacion'))
            ->selectRaw('id_evaluacion as evaluation_id,max(porcentaje_calificacion) as best_score,max(fecha_fin_intento) as completed_at')->groupBy('id_evaluacion')->get();
        $mastery = DominioLecciones::progress($request->user()->id_usuario);
        $result = ['mastery' => $mastery, 'level' => ['id' => $level->id_nivel, 'name' => $level->nombre_nivel], 'completed_activities' => $completed, 'total_activities' => $total,
            'percentage' => (float) (VistaProgresoNivel::where('id_usuario', $request->user()->id_usuario)->where('id_nivel', $level->id_nivel)->value('porcentaje_progreso_nivel') ?? 0), 'evaluation_results' => $results];

        return $result;
    }
}
