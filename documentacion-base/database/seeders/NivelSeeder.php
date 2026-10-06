<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class NivelSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            // Serializa ejecuciones simultáneas de los seeders de este paquete.
            DB::select('SELECT pg_advisory_xact_lock(20260930)');
            DB::unprepared(<<<'SQL'
INSERT INTO niveles (nombre_nivel,descripcion_nivel,orden_nivel) VALUES
('Básico','Fundamentos de vocabulario y gramática del kichwa de la Sierra Centro.',1),
('Intermedio','Ampliación de vocabulario y construcción de expresiones en kichwa de la Sierra Centro.',2)
ON CONFLICT (nombre_nivel) DO NOTHING;

SQL
            );
        });
    }
}
