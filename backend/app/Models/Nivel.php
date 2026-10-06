<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Nivel extends Model
{
    protected $table = 'niveles';

    protected $primaryKey = 'id_nivel';

    public $timestamps = false;

    protected $fillable = ['nombre_nivel', 'descripcion_nivel', 'orden_nivel'];

    protected function casts(): array
    {
        return [];
    }
}
