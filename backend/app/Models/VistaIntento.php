<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VistaIntento extends Model
{
    protected $table = 'v_intentos_evaluacion';

    protected $primaryKey = 'id_intento';

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
