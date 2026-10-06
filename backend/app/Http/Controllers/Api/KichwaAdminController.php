<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Usuario;
use App\Services\ContratoEjercicio;
use App\Services\KichwaResource;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class KichwaAdminController extends Controller
{
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
            return response()->json($model::orderBy('orden_nivel')->get()->map(fn ($r) => KichwaResource::present($resource, $r, true)));
        }
        $query = $model::query();
        $parent = ['modules' => 'id_nivel', 'units' => 'id_modulo', 'contents' => 'id_unidad',
            'exercises' => 'id_unidad', 'evaluations' => 'id_unidad', 'questions' => 'id_evaluacion'][$resource] ?? null;
        if ($parent && $request->filled('parent_id')) {
            $query->where($parent, $request->integer('parent_id'));
        }
        $order = KichwaResource::FIELDS[$resource]['sort_order'] ?? (new $model)->getKeyName();
        $page = $query->orderBy($order)->orderBy((new $model)->getKeyName())->paginate($request->integer('per_page', 20));
        $page->through(fn ($record) => KichwaResource::present($resource, $record, true));

        return response()->json($page);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $resource = $this->resource($request);
        $model = KichwaResource::MODELS[$resource];

        return response()->json(KichwaResource::present($resource, $model::findOrFail($id), true));
    }

    public function store(Request $request): JsonResponse
    {
        return $this->save($request, null);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        return $this->save($request, $id);
    }

    private function save(Request $request, ?int $id): JsonResponse
    {
        $resource = $this->resource($request);
        abort_if($resource === 'levels', 405, 'Los niveles son de lectura.');
        $model = KichwaResource::MODELS[$resource];
        $record = $id ? $model::findOrFail($id) : null;
        $rules = match ($resource) {
            'modules' => ['level_id' => ['required', 'integer', 'exists:niveles,id_nivel'], 'title' => ['required', 'string', 'max:150'], 'description' => ['required', 'string', 'max:20000'], 'sort_order' => ['required', 'integer', 'min:1']],
            'units' => ['module_id' => ['required', 'integer', 'exists:modulos,id_modulo'], 'title' => ['required', 'string', 'max:180'], 'description' => ['required', 'string', 'max:20000'], 'sort_order' => ['required', 'integer', 'min:1']],
            'contents' => ['unit_id' => ['required', 'integer', 'exists:unidades,id_unidad'], 'kind' => ['required', Rule::in(['vocabulary', 'grammar', 'culture'])], 'title' => ['required', 'string', 'max:180'], 'body' => ['required', 'string', 'max:50000'], 'sort_order' => ['required', 'integer', 'min:1']],
            'exercises' => ['unit_id' => ['required', 'integer', 'exists:unidades,id_unidad'], 'type' => ['required', 'string'], 'prompt' => ['required', 'string'], 'elements' => ['required', 'array'], 'zones' => ['present', 'array'], 'solution' => ['required', 'array'], 'resource' => ['nullable', 'string', 'max:500'], 'sort_order' => ['required', 'integer', 'min:1']],
            'questions' => ['evaluation_id' => ['required', 'integer', 'exists:evaluaciones,id_evaluacion'], 'type' => ['required', 'string'], 'prompt' => ['required', 'string'], 'elements' => ['required', 'array'], 'zones' => ['present', 'array'], 'solution' => ['required', 'array'], 'resource' => ['nullable', 'string', 'max:500'], 'score' => ['required', 'numeric', 'min:0.01', 'max:999999.99'], 'sort_order' => ['required', 'integer', 'min:1']],
            'evaluations' => ['unit_id' => ['nullable', 'integer', 'exists:unidades,id_unidad'], 'type' => ['required', Rule::in(['unidad', 'diagnostica'])], 'title' => ['required', 'string', 'max:180']],
            'glossary' => ['kichwa' => ['required', 'string', 'max:200'], 'spanish' => ['required', 'string', 'max:250']],
        };
        if ($record) {
            foreach ($rules as &$parts) {
                $parts = array_values(array_filter($parts, fn ($p) => $p !== 'required' && $p !== 'present'));
                array_unshift($parts, 'sometimes');
            }
            unset($parts);
        }
        $validated = $request->validate($rules, ['required' => 'El campo :attribute es obligatorio.',
            'exists' => 'La entidad seleccionada no existe.', 'min' => 'El orden o puntaje debe ser positivo.']);
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
        $saved = DB::transaction(function () use ($model, $record, $data): Model {
            if ($record) {
                $record->update($data);

                return $record->refresh();
            }

            return $model::create($data)->refresh();
        });

        return response()->json(KichwaResource::present($resource, $saved, true), $record ? 200 : 201);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $resource = $this->resource($request);
        abort_if($resource === 'levels', 405, 'Los niveles son de lectura.');
        $model = KichwaResource::MODELS[$resource];
        DB::transaction(fn () => $model::findOrFail($id)->delete());

        return response()->json(null, 204);
    }

    public function students(Request $request): JsonResponse
    {
        $request->validate(['q' => ['sometimes', 'string', 'max:100']]);
        $query = Usuario::where('rol_usuario', 'estudiante');
        if ($request->filled('q')) {
            $needle = '%'.trim($request->input('q')).'%';
            $query->where(fn ($q) => $q->where('nombre_usuario', 'ilike', $needle)->orWhere('correo_usuario', 'ilike', $needle)->orWhere('cedula_usuario', 'like', $needle));
        }

        return response()->json($query->orderBy('nombre_usuario')->paginate(20)->through(fn ($u) => $u->perfil() + ['state' => $u->estado_usuario]));
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
