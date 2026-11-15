<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\JoinGrupoRequest;
use App\Http\Requests\StoreGrupoRequest;
use App\Http\Requests\UpdateGrupoRequest;
use App\Models\Grupo;
use App\Models\Usuario;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class GrupoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => Grupo::where('admin_id', $request->user()->id_usuario)
            ->select(['id', 'nombre', 'codigo', 'activo'])->withCount('estudiantes')->orderByDesc('id')->get()]);
    }

    public function store(StoreGrupoRequest $request): JsonResponse
    {
        while (true) {
            $code = $this->generateCode();
            try {
                $group = DB::transaction(fn () => Grupo::create(['nombre' => $request->validated('nombre'), 'codigo' => $code, 'admin_id' => $request->user()->id_usuario]));
                break;
            } catch (UniqueConstraintViolationException $exception) {
                if (! Grupo::where('codigo', $code)->exists()) {
                    throw $exception;
                }
            }
        }

        return response()->json($group->fresh()->only(['id', 'nombre', 'codigo', 'activo']) + ['estudiantes_count' => 0], 201);
    }

    protected function generateCode(): string
    {
        $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        $code = 'KCH-';
        for ($index = 0; $index < 5; $index++) {
            $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        }

        return $code;
    }

    public function update(UpdateGrupoRequest $request, int $id): JsonResponse
    {
        $group = Grupo::where('admin_id', $request->user()->id_usuario)->findOrFail($id);
        $group->activo = $request->boolean('activo');
        $group->save();

        return response()->json($group->only(['id', 'nombre', 'codigo', 'activo']));
    }

    public function membership(Request $request): JsonResponse
    {
        $group = Grupo::find($request->user()->fresh()->grupo_id);

        return response()->json(['grupo' => $group?->only(['id', 'nombre', 'activo'])]);
    }

    public function join(JoinGrupoRequest $request): JsonResponse
    {
        $group = DB::transaction(function () use ($request): Grupo {
            $student = Usuario::whereKey($request->user()->id_usuario)->lockForUpdate()->firstOrFail();
            $group = Grupo::where('codigo', $request->validated('codigo'))->lockForUpdate()->first();
            if (! $group) {
                throw ValidationException::withMessages(['codigo' => 'No encontramos ese código. Comprueba el código con tu profesor.']);
            }
            if ($student->grupo_id === $group->id) {
                return $group;
            }
            if (! $group->activo) {
                throw ValidationException::withMessages(['codigo' => 'Este grupo está desactivado y no admite nuevos ingresos.']);
            }
            abort_if($student->grupo_id !== null, 409, 'Ya perteneces a un grupo. Sal del grupo actual antes de unirte a otro.');
            $student->grupo_id = $group->id;
            $student->save();

            return $group;
        });

        return response()->json(['message' => 'Te uniste al grupo correctamente.', 'grupo' => $group->only(['id', 'nombre', 'activo'])]);
    }

    public function leave(Request $request): JsonResponse
    {
        DB::transaction(function () use ($request): void {
            $student = Usuario::whereKey($request->user()->id_usuario)->lockForUpdate()->firstOrFail();
            $student->grupo_id = null;
            $student->save();
        });

        return response()->json(['message' => 'Saliste del grupo. Tu aprendizaje y tus resultados se conservan.', 'grupo' => null]);
    }
}
