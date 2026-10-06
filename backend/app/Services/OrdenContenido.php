<?php

namespace App\Services;

use App\Models\EvaluacionKichwa;
use App\Models\Modulo;
use App\Models\Nivel;
use App\Models\Unidad;
use Illuminate\Database\Eloquent\Model;

class OrdenContenido
{
    public const PARENTS = [
        'modules' => ['level_id', 'id_nivel', Nivel::class],
        'units' => ['module_id', 'id_modulo', Modulo::class],
        'contents' => ['unit_id', 'id_unidad', Unidad::class],
        'exercises' => ['unit_id', 'id_unidad', Unidad::class],
        'questions' => ['evaluation_id', 'id_evaluacion', EvaluacionKichwa::class],
    ];

    public static function assign(string $resource, array $data, ?Model $record): array
    {
        if (! isset(self::PARENTS[$resource])) {
            return $data;
        }
        [, $parentColumn, $parentModel] = self::PARENTS[$resource];
        $parentId = $data[$parentColumn] ?? $record?->getAttribute($parentColumn);
        $parentModel::whereKey($parentId)->lockForUpdate()->firstOrFail();
        $order = KichwaResource::FIELDS[$resource]['sort_order'];
        if (! isset($data[$order]) && (! $record || $record->getAttribute($parentColumn) !== (int) $parentId)) {
            $model = KichwaResource::MODELS[$resource];
            $data[$order] = 1 + (int) $model::where($parentColumn, $parentId)->max($order);
        }

        return $data;
    }
}
