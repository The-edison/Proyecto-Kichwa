<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class Usuario extends Authenticatable
{
    use HasApiTokens;

    protected $table = 'usuarios';
    protected $primaryKey = 'id_usuario';
    public $timestamps = false;
    protected $fillable = ['cedula_usuario', 'nombre_usuario', 'correo_usuario', 'contrasena_usuario'];
    protected $hidden = ['contrasena_usuario', 'remember_token'];

    protected function casts(): array
    {
        return ['contrasena_usuario' => 'hashed'];
    }

    public function getAuthPasswordName(): string
    {
        return 'contrasena_usuario';
    }

    public function getAuthPassword(): string
    {
        return (string) $this->contrasena_usuario;
    }
}
