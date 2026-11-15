<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Grupo extends Model
{
    protected $table = 'grupos';

    protected $fillable = ['nombre', 'codigo', 'admin_id'];

    protected function casts(): array
    {
        return ['activo' => 'boolean'];
    }

    public function estudiantes(): HasMany
    {
        return $this->hasMany(Usuario::class, 'grupo_id')->where('rol_usuario', 'estudiante');
    }
}
