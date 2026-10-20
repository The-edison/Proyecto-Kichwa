<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
ALTER TABLE evaluaciones ADD COLUMN id_modulo bigint REFERENCES modulos(id_modulo) ON DELETE RESTRICT;
ALTER TABLE evaluaciones DROP CONSTRAINT evaluaciones_tipo_evaluacion_check;
ALTER TABLE evaluaciones DROP CONSTRAINT evaluaciones_check;
ALTER TABLE evaluaciones ADD CONSTRAINT evaluaciones_tipo_evaluacion_check CHECK (tipo_evaluacion IN ('unidad','diagnostica','modulo'));
ALTER TABLE evaluaciones ADD CONSTRAINT evaluaciones_check CHECK (
 (tipo_evaluacion='unidad' AND id_unidad IS NOT NULL AND id_modulo IS NULL) OR
 (tipo_evaluacion='diagnostica' AND id_unidad IS NULL AND id_modulo IS NULL) OR
 (tipo_evaluacion='modulo' AND id_modulo IS NOT NULL AND id_unidad IS NULL AND id_tema IS NULL)
);
CREATE UNIQUE INDEX evaluacion_modulo_publicada ON evaluaciones(id_modulo) WHERE tipo_evaluacion='modulo' AND publicado;
SQL);
    }

    public function down(): void
    {
        if (DB::table('evaluaciones')->where('tipo_evaluacion', 'modulo')->exists()) {
            throw new RuntimeException('La prueba del módulo y sus intentos deben conservarse. Utiliza una migración correctiva.');
        }
        DB::unprepared(<<<'SQL'
DROP INDEX evaluacion_modulo_publicada;
ALTER TABLE evaluaciones DROP CONSTRAINT evaluaciones_check;
ALTER TABLE evaluaciones DROP CONSTRAINT evaluaciones_tipo_evaluacion_check;
ALTER TABLE evaluaciones DROP COLUMN id_modulo;
ALTER TABLE evaluaciones ADD CONSTRAINT evaluaciones_tipo_evaluacion_check CHECK (tipo_evaluacion IN ('unidad','diagnostica'));
ALTER TABLE evaluaciones ADD CONSTRAINT evaluaciones_check CHECK ((tipo_evaluacion='unidad' AND id_unidad IS NOT NULL) OR (tipo_evaluacion='diagnostica' AND id_unidad IS NULL));
SQL);
    }
};
