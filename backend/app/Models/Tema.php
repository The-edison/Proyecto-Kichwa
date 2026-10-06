<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Tema extends Model
{
    protected $table = 'temas';

    protected $primaryKey = 'id_tema';

    public $timestamps = false;

    protected $fillable = ['publicado', 'id_unidad', 'tipo_tema', 'titulo_tema', 'contenido_tema', 'orden_tema'];

    protected function casts(): array
    {
        return ['publicado' => 'boolean'];
    }
}
