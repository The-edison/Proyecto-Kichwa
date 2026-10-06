<?php

namespace App\Services;

use App\Models\Actividad;
use App\Models\Diccionario;
use App\Models\EvaluacionKichwa;
use App\Models\Modulo;
use App\Models\Nivel;
use App\Models\Pregunta;
use App\Models\Tema;
use App\Models\Unidad;
use Illuminate\Database\Eloquent\Model;

class KichwaResource
{
    public const MODELS = ['levels' => Nivel::class, 'modules' => Modulo::class, 'units' => Unidad::class,
        'contents' => Tema::class, 'exercises' => Actividad::class, 'evaluations' => EvaluacionKichwa::class,
        'questions' => Pregunta::class, 'glossary' => Diccionario::class];

    public const FIELDS = [
        'levels' => ['id' => 'id_nivel', 'name' => 'nombre_nivel', 'description' => 'descripcion_nivel', 'sort_order' => 'orden_nivel'],
        'modules' => ['id' => 'id_modulo', 'level_id' => 'id_nivel', 'title' => 'nombre_modulo', 'description' => 'descripcion_modulo', 'sort_order' => 'orden_modulo'],
        'units' => ['id' => 'id_unidad', 'module_id' => 'id_modulo', 'title' => 'titulo_unidad', 'description' => 'objetivo_unidad', 'sort_order' => 'orden_unidad'],
        'contents' => ['id' => 'id_tema', 'unit_id' => 'id_unidad', 'kind' => 'tipo_tema', 'title' => 'titulo_tema', 'body' => 'contenido_tema', 'sort_order' => 'orden_tema'],
        'exercises' => ['id' => 'id_actividad', 'unit_id' => 'id_unidad', 'type' => 'tipo_actividad', 'prompt' => 'enunciado_actividad',
            'elements' => 'elementos_actividad', 'zones' => 'zonas_actividad', 'resource' => 'recurso_actividad', 'solution' => 'solucion_actividad', 'sort_order' => 'orden_actividad'],
        'evaluations' => ['id' => 'id_evaluacion', 'unit_id' => 'id_unidad', 'title' => 'titulo_evaluacion', 'type' => 'tipo_evaluacion'],
        'questions' => ['id' => 'id_pregunta', 'evaluation_id' => 'id_evaluacion', 'type' => 'tipo_pregunta', 'prompt' => 'enunciado_pregunta',
            'elements' => 'elementos_pregunta', 'zones' => 'zonas_pregunta', 'resource' => 'recurso_pregunta', 'solution' => 'solucion_pregunta', 'score' => 'puntaje_pregunta', 'sort_order' => 'orden_pregunta'],
        'glossary' => ['id' => 'id_diccionario', 'kichwa' => 'palabra_kichwa_diccionario', 'spanish' => 'palabra_espanol_diccionario'],
    ];

    public static function present(string $resource, Model $record, bool $admin = false): array
    {
        $result = [];
        foreach (self::FIELDS[$resource] as $key => $column) {
            if ($key === 'solution' && ! $admin) {
                continue;
            }
            $result[$key] = $record->getAttribute($column);
        }
        if ($resource === 'levels') {
            $result['code'] = $record->orden_nivel === 1 ? 'basic' : 'intermediate';
            $result['available'] = $record->orden_nivel === 1;
        }
        if ($resource === 'contents') {
            $result['kind'] = ['vocabulario' => 'vocabulary', 'gramatica' => 'grammar', 'cultura' => 'culture'][$result['kind']];
        }
        if ($resource === 'glossary') {
            $result += ['meaning' => $result['spanish'], 'example_spanish' => null, 'example_kichwa' => null];
        }

        return $result;
    }

    public static function attributes(string $resource, array $data): array
    {
        if (isset($data['kind'])) {
            $data['kind'] = ['vocabulary' => 'vocabulario', 'grammar' => 'gramatica', 'culture' => 'cultura'][$data['kind']] ?? $data['kind'];
        }
        $result = [];
        foreach (self::FIELDS[$resource] as $key => $column) {
            if ($key !== 'id' && array_key_exists($key, $data)) {
                $result[$column] = $data[$key];
            }
        }

        return $result;
    }
}
