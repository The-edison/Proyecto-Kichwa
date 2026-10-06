<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RespuestaEvaluacion extends Model
{
    protected $table = 'respuestas_evaluacion';

    protected $primaryKey = 'id_respuesta_evaluacion';

    public $timestamps = false;

    protected $fillable = ['id_intento', 'id_pregunta', 'id_evaluacion', 'respuesta_evaluacion', 'puntaje_respuesta_evaluacion', 'fecha_respuesta_evaluacion'];

    protected function casts(): array
    {
        return ['respuesta_evaluacion' => 'array', 'puntaje_respuesta_evaluacion' => 'decimal:2', 'fecha_respuesta_evaluacion' => 'datetime'];
    }
}
