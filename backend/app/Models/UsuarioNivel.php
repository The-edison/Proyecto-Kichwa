<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UsuarioNivel extends Model
{
    protected $table = 'usuarios_niveles';

    protected $primaryKey = 'id_usuario_nivel';

    public $timestamps = false;

    protected $fillable = ['id_usuario', 'id_nivel'];

    protected function casts(): array
    {
        return [];
    }
}
