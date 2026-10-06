<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProgresoUnidad extends Model
{
    protected $table = 'progreso';

    protected $primaryKey = 'id_progreso';

    public $timestamps = false;

    protected $fillable = ['id_usuario', 'id_unidad', 'fecha_inicio_progreso', 'fecha_actualizacion_progreso'];

    protected function casts(): array
    {
        return ['fecha_inicio_progreso' => 'datetime', 'fecha_actualizacion_progreso' => 'datetime'];
    }
}
