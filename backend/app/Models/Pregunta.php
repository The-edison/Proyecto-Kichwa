<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pregunta extends Model
{
    protected $table = 'preguntas';

    protected $primaryKey = 'id_pregunta';

    public $timestamps = false;

    protected $fillable = ['id_evaluacion', 'tipo_pregunta', 'enunciado_pregunta', 'elementos_pregunta', 'zonas_pregunta', 'recurso_pregunta', 'solucion_pregunta', 'puntaje_pregunta', 'orden_pregunta'];

    protected $hidden = ['solucion_pregunta'];

    protected function casts(): array
    {
        return ['elementos_pregunta' => 'array', 'zonas_pregunta' => 'array', 'solucion_pregunta' => 'array', 'puntaje_pregunta' => 'decimal:2'];
    }
}
