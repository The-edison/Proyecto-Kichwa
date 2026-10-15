<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('respuestas_actividad', function (Blueprint $table) {
            $table->uuid('id_sesion_practica')->nullable()->index();
            $table->uuid('clave_envio')->nullable();
            $table->unique(['id_usuario', 'clave_envio'], 'respuesta_envio_usuario_unico');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        throw new RuntimeException('Conservar las sesiones y sus recompensas mediante una migración correctiva.');
    }
};
