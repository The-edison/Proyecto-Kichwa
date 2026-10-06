<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VistaProgreso extends Model
{
    protected $table = 'v_progreso';

    protected $primaryKey = 'id_progreso';

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
