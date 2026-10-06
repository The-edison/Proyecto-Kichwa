<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EvaluacionKichwa extends Model
{
    protected $table = 'evaluaciones';

    protected $primaryKey = 'id_evaluacion';

    public $timestamps = false;

    protected $fillable = ['id_unidad', 'titulo_evaluacion', 'tipo_evaluacion'];

    protected function casts(): array
    {
        return [];
    }
}
