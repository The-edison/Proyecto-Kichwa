<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IntentoEvaluacion extends Model
{
    protected $table = 'intentos_evaluacion';

    protected $primaryKey = 'id_intento';

    public $timestamps = false;

    protected $fillable = ['id_usuario', 'id_evaluacion', 'numero_intento', 'fecha_inicio_intento', 'fecha_fin_intento', 'estado_intento'];

    protected function casts(): array
    {
        return ['fecha_inicio_intento' => 'datetime', 'fecha_fin_intento' => 'datetime'];
    }
}
