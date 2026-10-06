<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Modulo extends Model
{
    protected $table = 'modulos';

    protected $primaryKey = 'id_modulo';

    public $timestamps = false;

    protected $fillable = ['id_nivel', 'nombre_modulo', 'descripcion_modulo', 'orden_modulo'];

    protected function casts(): array
    {
        return [];
    }
}
