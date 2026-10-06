<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Unidad extends Model
{
    protected $table = 'unidades';

    protected $primaryKey = 'id_unidad';

    public $timestamps = false;

    protected $fillable = ['publicado', 'id_modulo', 'titulo_unidad', 'objetivo_unidad', 'orden_unidad'];

    protected function casts(): array
    {
        return ['publicado' => 'boolean'];
    }
}
