<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SaveKichwaContentRequest;
use App\Models\EvaluacionKichwa;
use App\Models\Pregunta;
use App\Models\Tema;
use App\Models\Usuario;
use App\Services\ContratoEjercicio;
use App\Services\EstadoContenido;
use App\Services\KichwaResource;
use App\Services\OrdenContenido;
use App\Services\PublicacionContenido;
use App\Services\SecuenciaUnidad;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class KichwaAdminController extends Controller
{
    public function previewEvaluation(Request $request, int $id): JsonResponse
    {
        $evaluation = EvaluacionKichwa::findOrFail($id);
        $questions = Pregunta::where('id_evaluacion', $id)->orderBy('orden_pregunta')->get()->filter(function ($q): bool {
            $data = KichwaResource::present('questions', $q, true);
            $data['config']['reviewed'] = true;

            return EstadoContenido::errors($data) === [];
        });
        $count = $evaluation->configuracion['question_count'] ?? $questions->count();
        if ($request->isMethod('get')) {
            abort_unless($count > 0 && $questions->count() >= $count, 422, 'No hay suficientes preguntas completas para la vista previa.');

            return response()->json(['questions' => $questions->take($count)->map(fn ($q) => KichwaResource::present('questions', $q))->values()]);
        }
        $data = $request->validate(['answers' => ['required', 'array', 'min:1', 'max:100'], 'answers.*' => ['array:question_id,answer'], 'answers.*.question_id' => ['required', 'integer', 'distinct'], 'answers.*.answer' => ['required', 'array']]);
        abort_unless(count($data['answers']) === $count, 422, 'Responde todas las preguntas de la vista previa.');
        $maximum = 0;
        $obtained = 0;
        $results = [];
        foreach ($data['answers'] as $answer) {
            $question = $questions->firstWhere('id_pregunta', $answer['question_id']);
            abort_unless($question, 422, 'Pregunta ajena a la vista previa.');
            $correct = ContratoEjercicio::grade(KichwaResource::present('questions', $question, true), $answer['answer']);
            $maximum += (float) $question->puntaje_pregunta;
            $obtained += $correct ? (float) $question->puntaje_pregunta : 0;
            $results[] = ['question_id' => $question->id_pregunta, 'is_correct' => $correct, 'feedback' => ContratoEjercicio::feedback(KichwaResource::present('questions', $question, true), $correct)];
        }

        return response()->json(['score' => round(100 * $obtained / $maximum, 2), 'results' => $results]);
    }

    public function reviewBank(Request $request, int $id): JsonResponse
    {
        $request->validate(['confirmed' => ['required', 'accepted']]);
        $result = DB::transaction(function () use ($id): array {
            $evaluation = EvaluacionKichwa::whereKey($id)->lockForUpdate()->firstOrFail();
            abort_if(DB::table('intentos_evaluacion')->where('id_evaluacion', $id)->exists(), 409, 'Crea una nueva versión antes de revisar un banco con historial.');
            $published = 0;
            $pending = [];
            foreach (Pregunta::where('id_evaluacion', $id)->orderBy('orden_pregunta')->get() as $question) {
                $data = KichwaResource::present('questions', $question, true);
                $data['config']['managed'] = true;
                $data['config']['reviewed'] = true;
                $errors = EstadoContenido::errors($data);
                if ($errors !== []) {
                    $pending[] = ['id' => $question->id_pregunta, 'issues' => $errors];

                    continue;
                }
                $question->update(['configuracion' => $data['config'], 'publicado' => true]);
                $published++;
            }

            return ['published_count' => $published, 'pending' => $pending];
        });
        PublicacionContenido::invalidate();

        return response()->json($result);
    }

    public function synchronizeFinalBank(int $id): JsonResponse
    {
        $count = DB::transaction(function () use ($id): int {
            $evaluation = EvaluacionKichwa::whereKey($id)->lockForUpdate()->firstOrFail();
            abort_if($evaluation->configuracion['sequence_mode'] ?? false, 422, 'La prueba corta tiene un banco independiente; edita sus seis preguntas.');
            abort_unless($evaluation->configuracion['final'] ?? false, 422, 'Esta operación corresponde al desafío final.');
            abort_if(DB::table('intentos_evaluacion')->where('id_evaluacion', $id)->exists(), 409, 'Crea una versión del desafío para actualizar un banco con historial.');
            $sources = EstadoContenido::sources($evaluation);
            $eligible = $sources->flatMap(fn ($source) => EstadoContenido::eligible($source->id_evaluacion))->unique(fn ($q) => $q->origen_reactivo ?? (string) $q->id_pregunta);
            abort_unless($eligible->count() >= 10, 422, 'Publica primero al menos diez reactivos válidos de las tres lecciones.');
            $origins = [];
            foreach ($eligible as $source) {
                $origin = $source->origen_reactivo ?? (string) $source->id_pregunta;
                $origins[] = $origin;
                $question = Pregunta::where('id_evaluacion', $id)->where('origen_reactivo', $origin)->first();
                $data = KichwaResource::attributes('questions', KichwaResource::present('questions', $source, true));
                unset($data['id_evaluacion'],$data['orden_pregunta']);
                if ($question) {
                    $question->update($data);
                } else {
                    $question = new Pregunta($data + ['id_evaluacion' => $id, 'orden_pregunta' => 1 + (int) DB::table('preguntas')->where('id_evaluacion', $id)->max('orden_pregunta')]);
                    $question->origen_reactivo = $origin;
                    $question->save();
                }
            }
            Pregunta::where('id_evaluacion', $id)->where(fn ($q) => $q->whereNull('origen_reactivo')->orWhereNotIn('origen_reactivo', $origins))->update(['publicado' => false]);

            return $eligible->count();
        });
        PublicacionContenido::invalidate();

        return response()->json(['eligible_count' => $count]);
    }

    private function present(string $resource, Model $record): array
    {
        $data = KichwaResource::present($resource, $record, true);
        if (in_array($resource, ['exercises', 'questions'], true)) {
            $data['issues'] = EstadoContenido::errors($data);
            $data['status'] = $data['published'] ? 'Publicado' : ($data['issues'] === [] ? 'Listo para publicar' : 'Borrador pendiente');
        }
        if ($resource === 'evaluations') {
            $data['eligible_count'] = EstadoContenido::eligible($record->id_evaluacion)->count();
            $data['question_count'] = DB::table('preguntas')->where('id_evaluacion', $record->id_evaluacion)->count();
        }
        if ($resource === 'contents') {
            $questions = Pregunta::whereIn('id_evaluacion', DB::table('evaluaciones')->where('id_tema', $record->id_tema)->select('id_evaluacion'))->get();
            $data['question_count'] = $questions->count();
            $data['eligible_count'] = $questions->filter(fn ($q) => $q->publicado && EstadoContenido::errors(KichwaResource::present('questions', $q, true)) === [])->count();
            $data['pending_count'] = $data['question_count'] - $data['eligible_count'];
        }

        return $data;
    }

    public function preview(Request $request): JsonResponse
    {
        $data = $request->validate(['exercise' => ['required', 'array'], 'answer' => ['required', 'array']]);
        ContratoEjercicio::validate($data['exercise']);
        $correct = ContratoEjercicio::grade($data['exercise'], $data['answer']);

        return response()->json(['is_correct' => $correct, 'feedback' => ContratoEjercicio::feedback($data['exercise'], $correct)]);
    }

    public function version(Request $request, int $id): JsonResponse
    {
        $resource = $this->resource($request);
        abort_unless(in_array($resource, ['exercises', 'evaluations', 'questions'], true), 405);
        $model = KichwaResource::MODELS[$resource];
        $copy = DB::transaction(function () use ($model, $resource, $id): Model {
            $source = $model::whereKey($id)->lockForUpdate()->firstOrFail();
            if ($resource === 'questions') {
                abort_if(DB::table('intentos_evaluacion')->where('id_evaluacion', $source->id_evaluacion)->exists(), 409, 'Crea una versión de la evaluación para editar su banco sin modificar el historial.');
            }
            $copy = $source->replicate();
            $copy->publicado = false;
            if ($resource === 'questions' || $resource === 'exercises') {
                $copy->origen_reactivo = $source->origen_reactivo ?? (string) $source->getKey();
            }
            if ($resource === 'questions' || $resource === 'exercises') {
                $copy->configuracion = array_replace($source->configuracion ?? [], ['managed' => true, 'reviewed' => false]);
            }
            if ($resource === 'evaluations' && ! ($copy->configuracion['managed'] ?? false)) {
                $copy->configuracion = ['managed' => true, 'question_count' => min(100, (int) DB::table('preguntas')->where('id_evaluacion', $id)->count()), 'pass_percentage' => 80, 'final' => false];
            }
            if ($resource !== 'evaluations') {
                $attributes = OrdenContenido::assign($resource, $copy->getAttributes(), null);
                $parent = $resource === 'exercises' ? 'id_unidad' : 'id_evaluacion';
                $order = KichwaResource::FIELDS[$resource]['sort_order'];
                $copy->$order = 1 + (int) $model::where($parent, $source->$parent)->max($order);
            }
            $copy->save();
            if ($resource === 'evaluations') {
                foreach (Pregunta::where('id_evaluacion', $id)->orderBy('orden_pregunta')->get() as $question) {
                    $new = $question->replicate();
                    $new->id_evaluacion = $copy->id_evaluacion;
                    $new->origen_reactivo = $question->origen_reactivo ?? (string) $question->id_pregunta;
                    $new->publicado = false;
                    $new->configuracion = array_replace($question->configuracion ?? [], ['managed' => true, 'reviewed' => false]);
                    $new->save();
                }
            }

            return $copy;
        });
        PublicacionContenido::invalidate();

        return response()->json(KichwaResource::present($resource, $copy, true), 201);
    }

    public function overview(): JsonResponse
    {
        return response()->json(DB::selectOne("SELECT (SELECT count(*) FROM usuarios WHERE rol_usuario='estudiante') AS students, (SELECT count(*) FROM temas) AS contents, (SELECT count(*) FROM actividades) AS exercises, (SELECT count(*) FROM diccionario) AS diccionario"));
    }

    private function resource(Request $request): string
    {
        $resource = $request->route('resource');
        abort_unless(isset(KichwaResource::MODELS[$resource]), 404);

        return $resource;
    }

    public function index(Request $request): JsonResponse
    {
        $resource = $this->resource($request);
        $request->validate(['per_page' => ['sometimes', 'integer', 'between:1,200'], 'parent_id' => ['sometimes', 'integer', 'min:1']]);
        $model = KichwaResource::MODELS[$resource];
        if ($resource === 'levels' && ! $request->has('page')) {
            return response()->json(PublicacionContenido::remember('admin-levels', fn () => $model::query()->select('niveles.*')->selectSub(DB::table('modulos')->selectRaw('count(*)')->whereColumn('modulos.id_nivel', 'niveles.id_nivel'), 'children_count')->orderBy('orden_nivel')->get()->map(fn ($r) => KichwaResource::present($resource, $r, true) + ['children_count' => (int) $r->children_count])->all()));
        }
        $query = $model::query();
        if ($resource === 'evaluations' && $request->input('type') === 'diagnostica') {
            $query->where('tipo_evaluacion', 'diagnostica');
        }
        $parent = ['modules' => 'id_nivel', 'units' => 'id_modulo', 'contents' => 'id_unidad',
            'exercises' => 'id_unidad', 'evaluations' => 'id_unidad', 'questions' => 'id_evaluacion'][$resource] ?? null;
        if ($parent && $request->filled('parent_id')) {
            $query->where($parent, $request->integer('parent_id'));
        }
        if ($resource === 'exercises' && $request->filled('topic_id')) {
            $request->validate(['topic_id' => ['integer', 'exists:temas,id_tema']]);
            $query->where('id_tema', $request->integer('topic_id'));
        } elseif ($resource === 'exercises' && $request->filled('parent_id')) {
            $query->whereNull('id_tema');
        }
        $columns = array_values(array_diff(KichwaResource::FIELDS[$resource], ['contenido_tema', 'elementos_actividad', 'zonas_actividad', 'solucion_actividad', 'elementos_pregunta', 'zonas_pregunta', 'solucion_pregunta']));
        if (in_array($resource, ['levels', 'modules', 'units', 'contents', 'exercises', 'questions', 'evaluations'], true)) {
            $columns[] = 'publicado';
        }
        if ($resource === 'exercises') {
            $columns[] = 'id_tema';
        }
        if (in_array($resource, ['units', 'exercises', 'questions', 'evaluations'], true)) {
            $columns[] = 'configuracion';
        }
        if ($resource === 'evaluations') {
            $columns[] = 'id_tema';
        }
        if ($resource === 'contents') {
            $columns[] = 'clave_leccion';
        }
        if (in_array($resource, ['exercises', 'questions'], true)) {
            $columns = array_merge($columns, array_values(KichwaResource::FIELDS[$resource]));
        }
        $query->select(array_unique($columns));
        $order = KichwaResource::FIELDS[$resource]['sort_order'] ?? (new $model)->getKeyName();
        $page = $query->orderBy($order)->orderBy((new $model)->getKeyName())->paginate($request->integer('per_page', 20));
        $page->through(fn ($record) => $this->present($resource, $record));

        return response()->json($page);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $resource = $this->resource($request);
        $model = KichwaResource::MODELS[$resource];

        $query = $model::query();
        $parent = OrdenContenido::PARENTS[$resource][1] ?? ($resource === 'evaluations' ? 'id_unidad' : null);
        if ($parent && $request->filled('parent_id')) {
            $query->where($parent, $request->integer('parent_id'));
        }

        return response()->json(KichwaResource::present($resource, $query->findOrFail($id), true));
    }

    public function store(SaveKichwaContentRequest $request): JsonResponse
    {
        return $this->save($request, null);
    }

    public function update(SaveKichwaContentRequest $request, int $id): JsonResponse
    {
        return $this->save($request, $id);
    }

    private function save(SaveKichwaContentRequest $request, ?int $id): JsonResponse
    {
        $resource = $this->resource($request);

        $model = KichwaResource::MODELS[$resource];
        $record = $id ? $model::findOrFail($id) : null;
        $validated = $request->validated();
        $merged = array_replace($record ? KichwaResource::present($resource, $record, true) : [], $validated);
        if ($resource === 'evaluations' && ! empty($merged['topic_id'])) {
            $lesson = Tema::findOrFail($merged['topic_id']);
            if (str_starts_with($lesson->clave_leccion ?? '', 'basico-modulo1-unidad1-leccion')) {
                abort_unless(($merged['config']['managed'] ?? false) && ($merged['config']['question_count'] ?? 10) === 10
                    && ($merged['config']['pass_percentage'] ?? 80) === 80
                    && (bool) ($merged['config']['final'] ?? false) === str_ends_with($lesson->clave_leccion, 'leccion4'), 422, 'Las lecciones de Unidad 1 requieren diez preguntas, 80 % y su tipo original.');
            }
        }
        if (in_array($resource, ['exercises', 'questions'], true)) {
            if (($merged['config']['managed'] ?? false) && ! ($merged['published'] ?? false)) {
                foreach (array_merge($merged['elements'] ?? [], $merged['zones'] ?? []) as $element) {
                    if (! empty($element['imagen'])) {
                        ContratoEjercicio::file($element['imagen'], 'imagenes');
                    }
                }
                if (! empty($merged['resource'])) {
                    ContratoEjercicio::file($merged['resource'], 'audio');
                }
            } else {
                EstadoContenido::assertReady($merged);
            }
        }
        if ($resource === 'evaluations') {
            abort_unless(($merged['type'] === 'unidad') === ! empty($merged['unit_id']), 422, 'La evaluación de unidad requiere una unidad; la diagnóstica es general.');
        }
        if ($resource === 'evaluations' && ($merged['config']['managed'] ?? false)) {
            if (($merged['config']['final'] ?? false) && ! ($merged['config']['sequence_mode'] ?? false)) {
                abort_unless(! empty($merged['unit_id']) && ! empty($merged['topic_id']), 422, 'El desafío final requiere su unidad y lección asociadas.');
                abort_unless(($merged['config']['question_count'] ?? 10) === 10 && ($merged['config']['pass_percentage'] ?? 80) === 80, 422, 'El desafío final requiere diez preguntas y 80 %.');
            }
            if ($merged['published'] ?? false) {
                abort_unless($id && EstadoContenido::eligible($id)->count() >= ($merged['config']['question_count'] ?? 10), 422, 'Faltan preguntas publicadas, completas y revisadas.');
            }
        }
        if ($resource === 'evaluations' && ($merged['config']['sequence_mode'] ?? false) && ($merged['published'] ?? false)) {
            $candidate = clone $record;
            $candidate->configuracion = $merged['config'];
            $candidate->id_unidad = $merged['unit_id'];
            SecuenciaUnidad::assertReady($candidate);
        }
        $data = KichwaResource::attributes($resource, $validated);
        foreach (['contenido_tema', 'descripcion_modulo', 'objetivo_unidad'] as $text) {
            if (isset($data[$text])) {
                $data[$text] = strip_tags($data[$text]);
            }
        }
        if (in_array($resource, ['exercises', 'questions'], true)) {
            $suffix = $resource === 'exercises' ? 'actividad' : 'pregunta';
            if (array_key_exists('solucion_'.$suffix, $data) && $data['solucion_'.$suffix] === []) {
                $data['solucion_'.$suffix] = (object) [];
            }
            if (array_key_exists('enunciado_'.$suffix, $data) && $data['enunciado_'.$suffix] === null) {
                $data['enunciado_'.$suffix] = '';
            }
        }
        $saved = DB::transaction(function () use ($model, $record, $data, $resource, $validated): Model {
            if ($resource === 'levels' && ! $record && ! isset($data['orden_nivel'])) {
                DB::statement('LOCK TABLE niveles IN SHARE ROW EXCLUSIVE MODE');
                $data['orden_nivel'] = 1 + (int) DB::table('niveles')->max('orden_nivel');
            }
            $data = OrdenContenido::assign($resource, $data, $record);
            if ($record) {
                $record = $model::whereKey($record->getKey())->lockForUpdate()->firstOrFail();
                $current = array_replace(KichwaResource::present($resource, $record, true), $validated);
                if ($resource === 'evaluations' && ($current['config']['sequence_mode'] ?? false) && ($current['published'] ?? false)) {
                    $candidate = clone $record;
                    $candidate->configuracion = $current['config'];
                    $candidate->id_unidad = $current['unit_id'];
                    SecuenciaUnidad::assertReady($candidate);
                }
                if (in_array($resource, ['exercises', 'questions'], true) && ($current['published'] ?? false)) {
                    EstadoContenido::assertReady($current);
                }
                if ($resource === 'evaluations' && ($current['published'] ?? false) && ($current['config']['managed'] ?? false)) {
                    abort_unless(EstadoContenido::eligible($record->getKey())->count() >= ($current['config']['question_count'] ?? 10), 422, 'Faltan preguntas válidas. Revisa el banco antes de publicar.');
                }
                $record->update($data);

                return $record->refresh();
            }

            return $model::create($data)->refresh();
        });
        PublicacionContenido::invalidate();

        return response()->json(KichwaResource::present($resource, $saved, true), $record ? 200 : 201);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $resource = $this->resource($request);

        $model = KichwaResource::MODELS[$resource];
        $counts = $this->dependencyCounts($resource, $id);
        if (array_sum($counts) > 0) {
            return response()->json(['message' => 'No se puede eliminar: contiene '.implode(', ', array_map(fn ($key, $value) => $value.' '.$key, array_keys(array_filter($counts)), array_values(array_filter($counts)))).'. Conserva el registro y sus relaciones.', 'dependencies' => $counts], 409);
        }
        DB::transaction(fn () => $model::findOrFail($id)->delete());
        PublicacionContenido::invalidate();

        return response()->json(null, 204);
    }

    private function dependencyCounts(string $resource, int $id): array
    {
        $relations = match ($resource) {
            'levels' => ['módulos' => ['modulos', 'id_nivel'], 'matrículas' => ['usuarios_niveles', 'id_nivel']],
            'modules' => ['unidades' => ['unidades', 'id_modulo']],
            'units' => ['temas' => ['temas', 'id_unidad'], 'actividades' => ['actividades', 'id_unidad'], 'evaluaciones' => ['evaluaciones', 'id_unidad'], 'progresos de estudiantes' => ['progreso', 'id_unidad']],
            'contents' => ['actividades' => ['actividades', 'id_tema'], 'evaluaciones' => ['evaluaciones', 'id_tema']],
            'exercises' => ['respuestas de estudiantes' => ['respuestas_actividad', 'id_actividad']],
            'evaluations' => ['preguntas' => ['preguntas', 'id_evaluacion'], 'intentos de estudiantes' => ['intentos_evaluacion', 'id_evaluacion']],
            'questions' => ['respuestas de estudiantes' => ['respuestas_evaluacion', 'id_pregunta']],
            default => [],
        };
        $counts = [];
        foreach ($relations as $label => [$table,$column]) {
            $counts[$label] = DB::table($table)->where($column, $id)->count();
        }
        if ($resource === 'questions') {
            $evaluation = DB::table('preguntas')->where('id_pregunta', $id)->value('id_evaluacion');
            $counts['intentos que protegen el banco'] = $evaluation ? DB::table('intentos_evaluacion')->where('id_evaluacion', $evaluation)->count() : 0;
        }

        return $counts;
    }

    public function dependencies(Request $request, int $id): JsonResponse
    {
        $resource = $this->resource($request);
        $model = KichwaResource::MODELS[$resource];
        $model::findOrFail($id);

        return response()->json(['dependencies' => $this->dependencyCounts($resource, $id)]);
    }

    public function move(Request $request, int $id): JsonResponse
    {
        $resource = $this->resource($request);
        abort_unless(isset(OrdenContenido::PARENTS[$resource]), 405);
        $direction = $request->validate(['direction' => ['required', 'in:up,down']])['direction'];
        $model = KichwaResource::MODELS[$resource];
        $changed = DB::transaction(function () use ($resource, $model, $id, $direction): array {
            $record = $model::findOrFail($id);
            [, $parent, $parentModel] = OrdenContenido::PARENTS[$resource];
            $parentModel::whereKey($record->getAttribute($parent))->lockForUpdate()->firstOrFail();
            $order = KichwaResource::FIELDS[$resource]['sort_order'];
            $neighbors = $model::where($parent, $record->getAttribute($parent));
            if ($resource === 'exercises') {
                $neighbors->where('id_tema', $record->id_tema);
            }
            $neighbor = $neighbors->where($order, $direction === 'up' ? '<' : '>', $record->getAttribute($order))->orderBy($order, $direction === 'up' ? 'desc' : 'asc')->lockForUpdate()->first();
            if (! $neighbor) {
                return [KichwaResource::present($resource, $record, true)];
            }
            $position = $record->getAttribute($order);
            $other = $neighbor->getAttribute($order);
            $record->update([$order => 1 + (int) $model::where($parent, $record->getAttribute($parent))->max($order)]);
            $neighbor->update([$order => $position]);
            $record->update([$order => $other]);

            return [KichwaResource::present($resource, $record->refresh(), true), KichwaResource::present($resource, $neighbor->refresh(), true)];
        });
        PublicacionContenido::invalidate();

        return response()->json(['data' => $changed]);
    }

    public function students(Request $request): JsonResponse
    {
        $data = $request->validate(['q' => ['nullable', 'string', 'max:100'], 'page' => ['sometimes', 'integer', 'min:1']]);
        $query = Usuario::where('rol_usuario', 'estudiante');
        $search = trim($data['q'] ?? '');
        if ($search !== '') {
            $needle = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $search).'%';
            $query->where(fn ($q) => $q->where('nombre_usuario', 'ilike', $needle)->orWhere('correo_usuario', 'ilike', $needle)->orWhere('cedula_usuario', 'like', $needle));
        }

        return response()->json($query->orderBy('nombre_usuario')->orderBy('id_usuario')->paginate(10)->through(fn ($u) => $u->perfil() + ['state' => $u->estado_usuario]));
    }

    public function block(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['state' => ['required', 'in:activo,bloqueado']]);
        $user = Usuario::where('rol_usuario', 'estudiante')->findOrFail($id);
        DB::transaction(function () use ($user, $data): void {
            $user->estado_usuario = $data['state'];
            $user->remember_token = null;
            $user->save();
            if ($data['state'] === 'bloqueado') {
                $user->tokens()->delete();
                DB::table('sessions')->where('user_id', $user->id_usuario)->delete();
            }
        });

        return response()->json($user->perfil() + ['state' => $user->estado_usuario]);
    }
}
