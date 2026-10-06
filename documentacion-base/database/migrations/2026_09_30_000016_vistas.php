<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            throw new RuntimeException('Esta base requiere PostgreSQL. Configure DB_CONNECTION=pgsql.');
        }
        DB::unprepared(<<<'SQL'
CREATE VIEW v_evaluaciones AS
SELECT e.*, COALESCE(p.puntaje_maximo_evaluacion,0)::numeric(12,2) AS puntaje_maximo_evaluacion
FROM evaluaciones e LEFT JOIN (
 SELECT id_evaluacion, sum(puntaje_pregunta) AS puntaje_maximo_evaluacion FROM preguntas GROUP BY id_evaluacion
) p USING (id_evaluacion);

CREATE VIEW v_intentos_evaluacion AS
SELECT i.*, COALESCE(r.puntaje_obtenido,0)::numeric(12,2) AS puntaje_obtenido,
       e.puntaje_maximo_evaluacion,
       CASE WHEN i.estado_intento='finalizado' THEN COALESCE(r.puntaje_obtenido,0)::numeric(12,2) ELSE NULL END AS calificacion_intento,
       CASE WHEN i.estado_intento='finalizado' AND e.puntaje_maximo_evaluacion>0
         THEN round(100*COALESCE(r.puntaje_obtenido,0)/e.puntaje_maximo_evaluacion,2) ELSE NULL END AS porcentaje_calificacion
FROM intentos_evaluacion i JOIN v_evaluaciones e USING (id_evaluacion)
LEFT JOIN (SELECT id_intento,sum(puntaje_respuesta_evaluacion) AS puntaje_obtenido FROM respuestas_evaluacion GROUP BY id_intento) r USING (id_intento);

-- Decisión de implementación: avance de práctica = actividades distintas acertadas / total.
-- No es un criterio pedagógico validado ni una nota de evaluación.
CREATE VIEW v_progreso AS
SELECT p.*, COALESCE(a.total_actividades,0) AS total_actividades,
       COALESCE(r.actividades_completadas,0) AS actividades_completadas,
       CASE WHEN COALESCE(a.total_actividades,0)=0 THEN 0::numeric
         ELSE round(100.0*COALESCE(r.actividades_completadas,0)/a.total_actividades,2) END AS porcentaje_progreso,
       CASE WHEN COALESCE(a.total_actividades,0)>0 AND COALESCE(r.actividades_completadas,0)=a.total_actividades
         THEN 'completado' ELSE 'en_curso' END::varchar(30) AS estado_progreso
FROM progreso p
LEFT JOIN (SELECT id_unidad,count(*) AS total_actividades FROM actividades GROUP BY id_unidad) a USING(id_unidad)
LEFT JOIN (SELECT r.id_usuario,a.id_unidad,count(DISTINCT r.id_actividad) AS actividades_completadas
 FROM respuestas_actividad r JOIN actividades a USING(id_actividad) WHERE r.acierto_actividad GROUP BY r.id_usuario,a.id_unidad) r
 ON r.id_usuario=p.id_usuario AND r.id_unidad=p.id_unidad;

-- Incluye unidades aún no iniciadas con 0; no promedia sólo lo que el estudiante comenzó.
CREATE VIEW v_progreso_modulos AS
SELECT un.id_usuario,m.id_modulo,m.id_nivel,
 COALESCE(round(avg(COALESCE(p.porcentaje_progreso,0)),2),0) AS porcentaje_progreso_modulo
FROM usuarios_niveles un JOIN modulos m ON m.id_nivel=un.id_nivel
LEFT JOIN unidades u ON u.id_modulo=m.id_modulo
LEFT JOIN v_progreso p ON p.id_usuario=un.id_usuario AND p.id_unidad=u.id_unidad
GROUP BY un.id_usuario,m.id_modulo,m.id_nivel;

CREATE VIEW v_progreso_niveles AS
SELECT un.id_usuario,un.id_nivel,
 COALESCE(round(avg(COALESCE(p.porcentaje_progreso,0)) FILTER (WHERE u.id_unidad IS NOT NULL),2),0) AS porcentaje_progreso_nivel
FROM usuarios_niveles un LEFT JOIN modulos m ON m.id_nivel=un.id_nivel
LEFT JOIN unidades u ON u.id_modulo=m.id_modulo
LEFT JOIN v_progreso p ON p.id_usuario=un.id_usuario AND p.id_unidad=u.id_unidad
GROUP BY un.id_usuario,un.id_nivel;

SQL
        );
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
DROP VIEW v_progreso_niveles;
DROP VIEW v_progreso_modulos;
DROP VIEW v_progreso;
DROP VIEW v_intentos_evaluacion;
DROP VIEW v_evaluaciones;
SQL
        );
    }
};
