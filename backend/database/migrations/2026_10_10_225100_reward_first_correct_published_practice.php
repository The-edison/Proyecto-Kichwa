<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
ALTER TABLE actividades ADD COLUMN origen_reactivo varchar(100);
ALTER TABLE recompensas ALTER COLUMN id_intento DROP NOT NULL;
ALTER TABLE recompensas ADD COLUMN id_respuesta_actividad bigint REFERENCES respuestas_actividad(id_respuesta_actividad) ON DELETE RESTRICT;
ALTER TABLE recompensas ADD CONSTRAINT recompensa_origen_unico CHECK((id_intento IS NULL) <> (id_respuesta_actividad IS NULL));
SQL);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        throw new RuntimeException('Conservar recompensas e historial mediante una migración correctiva o recuperar una copia verificada.');
    }
};
