<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

abstract class BaseResourceController extends Controller
{
    protected string $modelClass;

    abstract protected function storeRules(): array;

    abstract protected function updateRules(): array;

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate(['per_page' => ['sometimes', 'integer', 'min:1', 'max:50']]);
        $model = $this->modelClass;

        return response()->json($model::query()->orderByDesc('id')->paginate($data['per_page'] ?? 20));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->storeRules());
        $this->afterValidation($data, null);
        $model = $this->modelClass;

        return response()->json($model::create($data), 201);
    }

    public function show(int $id): JsonResponse
    {
        $model = $this->modelClass;

        return response()->json($model::findOrFail($id));
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $model = $this->modelClass;
        $record = $model::findOrFail($id);
        $data = $request->validate($this->updateRules());
        $this->afterValidation($data, $record);
        $record->update($data);

        return response()->json($record->refresh());
    }

    public function destroy(int $id): JsonResponse
    {
        $model = $this->modelClass;
        $record = $model::findOrFail($id);
        $this->beforeDelete($record);
        $record->delete();

        return response()->json(null, 204);
    }

    protected function afterValidation(array $data, ?Model $record): void {}

    protected function beforeDelete(Model $record): void {}
}
