<?php

namespace App\Models;

use Illuminate\Auth\MustVerifyEmail;
use Illuminate\Contracts\Auth\MustVerifyEmail as MustVerifyEmailContract;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class Usuario extends Authenticatable implements MustVerifyEmailContract
{
    use HasApiTokens, \Illuminate\Database\Eloquent\Factories\HasFactory, MustVerifyEmail, Notifiable;

    protected $table = 'usuarios';

    protected $primaryKey = 'id_usuario';

    public $timestamps = false;

    protected $fillable = ['cedula_usuario', 'nombre_usuario', 'correo_usuario', 'contrasena_usuario'];

    protected $hidden = ['contrasena_usuario', 'remember_token', 'google_id'];

    protected function casts(): array
    {
        return ['contrasena_usuario' => 'hashed', 'email_verified_at' => 'datetime', 'debe_cambiar_contrasena' => 'boolean'];
    }

    public function getAuthPasswordName(): string
    {
        return 'contrasena_usuario';
    }

    public function getAuthPassword(): string
    {
        return (string) $this->contrasena_usuario;
    }

    public function getEmailForPasswordReset(): string
    {
        return $this->correo_usuario;
    }

    public function getEmailForVerification(): string
    {
        return $this->correo_usuario;
    }

    public function routeNotificationForMail(): string
    {
        return $this->correo_usuario;
    }

    public function perfil(): array
    {
        return ['id' => $this->id_usuario, 'name' => $this->nombre_usuario,
            'email' => $this->correo_usuario, 'cedula' => $this->cedula_usuario,
            'google_connected' => $this->google_id !== null, 'email_verified' => $this->hasVerifiedEmail(),
            'debe_cambiar_contrasena' => $this->debe_cambiar_contrasena,
            'role' => ['code' => $this->rol_usuario === 'administrador' ? 'admin' : 'student']];
    }
}
