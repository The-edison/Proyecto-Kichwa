<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Actividad extends Model
{
    protected $table = 'actividades';

    protected $primaryKey = 'id_actividad';

    public $timestamps = false;

    protected $fillable = ['id_unidad', 'tipo_actividad', 'enunciado_actividad', 'elementos_actividad', 'zonas_actividad', 'recurso_actividad', 'solucion_actividad', 'orden_actividad'];

    protected $hidden = ['solucion_actividad'];

    protected function casts(): array
    {
        return ['elementos_actividad' => 'array', 'zonas_actividad' => 'array', 'solucion_actividad' => 'array'];
    }
}
