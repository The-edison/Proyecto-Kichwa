<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SaveKichwaContentRequest;
use App\Models\Usuario;
use App\Services\ContratoEjercicio;
use App\Services\KichwaResource;
use App\Services\OrdenContenido;
use App\Services\PublicacionContenido;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class KichwaAdminController extends Controller
{
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
        if ($resource === 'levels') {
            return response()->json(PublicacionContenido::remember('admin-levels', fn () => $model::whereIn('orden_nivel', [1, 2])->select('niveles.*')->selectSub(DB::table('modulos')->selectRaw('count(*)')->whereColumn('modulos.id_nivel', 'niveles.id_nivel'), 'children_count')->orderBy('orden_nivel')->get()->map(fn ($r) => KichwaResource::present($resource, $r, true) + ['children_count' => (int) $r->children_count])->all()));
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
        if (in_array($resource, ['modules', 'units', 'contents'], true)) {
            $columns[] = 'publicado';
        }
        if ($resource === 'exercises') {
            $columns[] = 'id_tema';
        }
        $query->select($columns);
        $order = KichwaResource::FIELDS[$resource]['sort_order'] ?? (new $model)->getKeyName();
        $page = $query->orderBy($order)->orderBy((new $model)->getKeyName())->paginate($request->integer('per_page', 20));
        $page->through(fn ($record) => KichwaResource::present($resource, $record, true));

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
        abort_if($resource === 'levels', 405, 'Los niveles son de lectura.');
        $model = KichwaResource::MODELS[$resource];
        $record = $id ? $model::findOrFail($id) : null;
        $validated = $request->validated();
        $merged = array_replace($record ? KichwaResource::present($resource, $record, true) : [], $validated);
        if (in_array($resource, ['exercises', 'questions'], true)) {
            ContratoEjercicio::validate($merged);
        }
        if ($resource === 'evaluations') {
            abort_unless(($merged['type'] === 'unidad') === ! empty($merged['unit_id']), 422, 'La evaluación de unidad requiere una unidad; la diagnóstica es general.');
        }
        $data = KichwaResource::attributes($resource, $validated);
        foreach (['contenido_tema', 'descripcion_modulo', 'objetivo_unidad'] as $text) {
            if (isset($data[$text])) {
                $data[$text] = strip_tags($data[$text]);
            }
        }
        $saved = DB::transaction(function () use ($model, $record, $data, $resource): Model {
            $data = OrdenContenido::assign($resource, $data, $record);
            if ($record) {
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
        abort_if($resource === 'levels', 405, 'Los niveles son de lectura.');
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
            'modules' => ['unidades' => ['unidades', 'id_modulo']],
            'units' => ['temas' => ['temas', 'id_unidad'], 'actividades' => ['actividades', 'id_unidad'], 'evaluaciones' => ['evaluaciones', 'id_unidad'], 'progresos de estudiantes' => ['progreso', 'id_unidad']],
            'contents' => ['actividades' => ['actividades', 'id_tema']],
            'exercises' => ['respuestas de estudiantes' => ['respuestas_actividad', 'id_actividad']],
            'evaluations' => ['preguntas' => ['preguntas', 'id_evaluacion'], 'intentos de estudiantes' => ['intentos_evaluacion', 'id_evaluacion']],
            'questions' => ['respuestas de estudiantes' => ['respuestas_evaluacion', 'id_pregunta']],
            default => [],
        };
        $counts = [];
        foreach ($relations as $label => [$table,$column]) {
            $counts[$label] = DB::table($table)->where($column, $id)->count();
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

        return response()->json($query->orderBy('nombre_usuario')->orderBy('id_usuario')->paginate(20)->through(fn ($u) => $u->perfil() + ['state' => $u->estado_usuario]));
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
