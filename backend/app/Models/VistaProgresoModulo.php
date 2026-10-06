<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VistaProgresoModulo extends Model
{
    protected $table = 'v_progreso_modulos';

    protected $primaryKey = 'id_modulo';

    public $timestamps = false;

    protected $fillable = [];

    protected function casts(): array
    {
        return [];
    }

    protected static function booted(): void
    {
        static::saving(fn () => throw new \LogicException('Las vistas son de solo lectura.'));
        static::deleting(fn () => throw new \LogicException('Las vistas son de solo lectura.'));
    }
}
