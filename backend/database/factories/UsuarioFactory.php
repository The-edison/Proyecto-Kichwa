<?php

namespace Database\Factories;

use App\Models\Usuario;
use Illuminate\Database\Eloquent\Factories\Factory;

class UsuarioFactory extends Factory
{
    protected $model = Usuario::class;

    public function definition(): array
    {
        return ['nombre_usuario' => fake()->name(), 'correo_usuario' => fake()->unique()->safeEmail(),
            'contrasena_usuario' => 'PruebaSegura#2026', 'rol_usuario' => 'estudiante', 'estado_usuario' => 'activo',
            'email_verified_at' => now(), 'debe_cambiar_contrasena' => false];
    }

    public function administrador(): static
    {
        return $this->state(['rol_usuario' => 'administrador']);
    }
}
