<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RespuestaActividad extends Model
{
    protected $table = 'respuestas_actividad';

    protected $primaryKey = 'id_respuesta_actividad';

    public $timestamps = false;

    protected $fillable = ['id_usuario', 'id_actividad', 'respuesta_actividad', 'acierto_actividad', 'retroalimentacion_actividad', 'fecha_respuesta_actividad'];

    protected function casts(): array
    {
        return ['respuesta_actividad' => 'array', 'acierto_actividad' => 'boolean', 'fecha_respuesta_actividad' => 'datetime'];
    }
}
