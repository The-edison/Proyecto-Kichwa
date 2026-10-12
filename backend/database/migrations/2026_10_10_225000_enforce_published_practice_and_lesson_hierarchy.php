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
ALTER TABLE evaluaciones ADD CONSTRAINT evaluacion_tema_unidad_fk FOREIGN KEY(id_tema,id_unidad) REFERENCES temas(id_tema,id_unidad) ON DELETE RESTRICT;
ALTER TABLE evaluaciones ADD CONSTRAINT evaluacion_tema_requiere_unidad CHECK(id_tema IS NULL OR id_unidad IS NOT NULL);
CREATE OR REPLACE VIEW v_progreso AS
SELECT p.*, COALESCE(a.total_actividades,0) AS total_actividades,
 COALESCE(r.actividades_completadas,0) AS actividades_completadas,
 CASE WHEN COALESCE(a.total_actividades,0)=0 THEN 0::numeric
 ELSE round(100.0*COALESCE(r.actividades_completadas,0)/a.total_actividades,2) END AS porcentaje_progreso,
 CASE WHEN COALESCE(a.total_actividades,0)>0 AND COALESCE(r.actividades_completadas,0)=a.total_actividades
 THEN 'completado' ELSE 'en_curso' END::varchar(30) AS estado_progreso
FROM progreso p
LEFT JOIN (SELECT id_unidad,count(*) AS total_actividades FROM actividades a WHERE a.publicado AND (a.id_tema IS NULL OR EXISTS (SELECT 1 FROM temas t WHERE t.id_tema=a.id_tema AND t.publicado)) GROUP BY id_unidad) a USING(id_unidad)
LEFT JOIN (SELECT r.id_usuario,a.id_unidad,count(DISTINCT r.id_actividad) AS actividades_completadas
 FROM respuestas_actividad r JOIN actividades a USING(id_actividad) WHERE r.acierto_actividad AND a.publicado AND (a.id_tema IS NULL OR EXISTS (SELECT 1 FROM temas t WHERE t.id_tema=a.id_tema AND t.publicado)) GROUP BY r.id_usuario,a.id_unidad) r
 ON r.id_usuario=p.id_usuario AND r.id_unidad=p.id_unidad;
CREATE FUNCTION kichwa_validar_seleccion_inicial() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE total integer; distintos integer; validos integer;
BEGIN
 IF NEW.preguntas_seleccionadas IS NULL THEN RETURN NEW; END IF;
 IF jsonb_typeof(NEW.preguntas_seleccionadas) <> 'array' THEN RAISE EXCEPTION 'Selección inválida' USING ERRCODE='23514'; END IF;
 SELECT count(*), count(DISTINCT value::bigint) INTO total,distintos FROM jsonb_array_elements_text(NEW.preguntas_seleccionadas);
 SELECT count(*) INTO validos FROM preguntas WHERE id_evaluacion=NEW.id_evaluacion AND id_pregunta IN (SELECT value::bigint FROM jsonb_array_elements_text(NEW.preguntas_seleccionadas));
 IF total=0 OR total<>distintos OR total<>validos THEN RAISE EXCEPTION 'Las preguntas deben ser únicas y pertenecer a la evaluación' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER validar_seleccion_inicial BEFORE INSERT ON intentos_evaluacion FOR EACH ROW EXECUTE FUNCTION kichwa_validar_seleccion_inicial();
SQL);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        throw new RuntimeException('Recuperar con una copia verificada o una migración correctiva conservando el historial.');
    }
};
