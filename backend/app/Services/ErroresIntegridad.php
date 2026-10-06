<?php

namespace App\Services;

use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;

class ErroresIntegridad
{
    public static function response(QueryException $exception): ?JsonResponse
    {
        $state = $exception->errorInfo[0] ?? '';
        if ($state !== '23505') {
            return null;
        }
        $detail = $exception->errorInfo[2] ?? '';
        $constraints = [
            'usuarios_correo_usuario_key' => ['email', 'Ya existe un usuario con ese correo.'],
            'usuarios_cedula_usuario_key' => ['cedula', 'Ya existe un usuario con esa cédula.'],
            'usuarios_google_id_key' => ['google_id', 'Esta cuenta de Google ya está vinculada.'],
            'modulos_id_nivel_orden_modulo_key' => ['sort_order', 'Ya existe un módulo con ese orden en este nivel.'],
            'unidades_id_modulo_orden_unidad_key' => ['sort_order', 'Ya existe una unidad con ese orden en este módulo.'],
            'temas_id_unidad_orden_tema_key' => ['sort_order', 'Ya existe un tema con ese orden en esta unidad.'],
            'actividades_id_unidad_orden_actividad_key' => ['sort_order', 'Ya existe una actividad con ese orden en esta unidad.'],
            'preguntas_id_evaluacion_orden_pregunta_key' => ['sort_order', 'Ya existe una pregunta con ese orden en esta evaluación.'],
            'diccionario_palabra_kichwa_diccionario_palabra_espanol_dicc_key' => ['kichwa', 'Esta entrada del diccionario ya existe.'],
            'usuarios_niveles_id_usuario_id_nivel_key' => ['level_id', 'El estudiante ya está inscrito en este nivel.'],
            'progreso_id_usuario_id_unidad_key' => ['unit_id', 'El progreso de esta unidad ya está registrado.'],
            'intentos_evaluacion_id_usuario_id_evaluacion_numero_intento_key' => ['attempt_id', 'El número de intento ya existe para esta evaluación.'],
            'respuestas_evaluacion_id_intento_id_pregunta_key' => ['answers', 'Esta pregunta ya tiene una respuesta en este intento.'],
        ];
        foreach ($constraints as $constraint => [$field, $message]) {
            if (str_contains($detail, $constraint)) {
                return response()->json(['message' => $message, 'errors' => [$field => [$message]]], 422);
            }
        }

        return response()->json(['message' => 'Este registro duplica una combinación única. Revisa los datos de este registro.', 'errors' => ['record' => ['Ya existe un registro con esta combinación.']]], 422);
    }
}
