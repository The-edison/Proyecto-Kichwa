<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SaveKichwaContentRequest;
use App\Models\Usuario;
use App\Services\ContratoEjercicio;
use App\Services\KichwaResource;
use App\Services\OrdenContenido;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
