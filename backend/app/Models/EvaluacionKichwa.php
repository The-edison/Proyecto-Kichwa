<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EvaluacionKichwa extends Model
{
    protected $table = 'evaluaciones';

    protected $primaryKey = 'id_evaluacion';

    public $timestamps = false;

    protected $fillable = ['publicado', 'configuracion', 'id_tema', 'id_unidad', 'id_modulo', 'titulo_evaluacion', 'tipo_evaluacion'];

    protected function casts(): array
    {
        return ['publicado' => 'boolean', 'configuracion' => 'array'];
    }
}
