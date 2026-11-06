<?php

namespace App\Services;

use App\Models\EvaluacionKichwa;
use Illuminate\Database\Eloquent\Builder;

class VersionesEvaluacion
{
    public static function related(EvaluacionKichwa $evaluation): Builder
    {
        $query = EvaluacionKichwa::where('tipo_evaluacion', $evaluation->tipo_evaluacion)
            ->where('id_modulo', $evaluation->id_modulo)
            ->where('id_unidad', $evaluation->id_unidad)
            ->where('id_tema', $evaluation->id_tema)
            ->whereRaw("COALESCE((configuracion->>'final')::boolean, false) = ?", [(bool) ($evaluation->configuracion['final'] ?? false)])
            ->whereRaw("COALESCE((configuracion->>'sequence_mode')::boolean, false) = ?", [(bool) ($evaluation->configuracion['sequence_mode'] ?? false)]);
        if ($evaluation->id_modulo === null && $evaluation->id_unidad === null && $evaluation->id_tema === null) {
            $query->whereKey($evaluation->id_evaluacion);
        }

        return $query;
    }
}
