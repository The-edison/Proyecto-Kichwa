<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IntentoEvaluacion extends Model
{
    protected $table = 'intentos_evaluacion';

    protected $primaryKey = 'id_intento';

    public $timestamps = false;

    protected $fillable = ['preguntas_seleccionadas', 'respuestas_borrador', 'resultado', 'id_usuario', 'id_evaluacion', 'numero_intento', 'fecha_inicio_intento', 'fecha_fin_intento', 'estado_intento'];

    protected function casts(): array
    {
        return ['preguntas_seleccionadas' => 'array', 'respuestas_borrador' => 'array', 'resultado' => 'array', 'fecha_inicio_intento' => 'datetime', 'fecha_fin_intento' => 'datetime'];
    }
}
