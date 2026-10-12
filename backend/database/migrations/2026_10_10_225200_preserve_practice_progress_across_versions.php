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
CREATE INDEX actividades_version_publicada ON actividades(id_unidad,(COALESCE(origen_reactivo,id_actividad::text)),id_actividad DESC) WHERE publicado;
CREATE OR REPLACE VIEW v_progreso AS
SELECT p.*, COALESCE(a.total_actividades,0) AS total_actividades,
 COALESCE(r.actividades_completadas,0) AS actividades_completadas,
 CASE WHEN COALESCE(a.total_actividades,0)=0 THEN 0::numeric
 ELSE round(100.0*COALESCE(r.actividades_completadas,0)/a.total_actividades,2) END AS porcentaje_progreso,
 CASE WHEN COALESCE(a.total_actividades,0)>0 AND COALESCE(r.actividades_completadas,0)=a.total_actividades
 THEN 'completado' ELSE 'en_curso' END::varchar(30) AS estado_progreso
FROM progreso p
LEFT JOIN (SELECT id_unidad,count(DISTINCT COALESCE(a.origen_reactivo,a.id_actividad::text)) AS total_actividades FROM actividades a WHERE a.publicado AND (a.id_tema IS NULL OR EXISTS(SELECT 1 FROM temas t WHERE t.id_tema=a.id_tema AND t.publicado)) GROUP BY id_unidad) a USING(id_unidad)
LEFT JOIN (
 SELECT r.id_usuario,a.id_unidad,count(DISTINCT COALESCE(a.origen_reactivo,a.id_actividad::text)) AS actividades_completadas
 FROM respuestas_actividad r JOIN actividades a USING(id_actividad)
 WHERE r.acierto_actividad AND EXISTS (
  SELECT 1 FROM actividades v WHERE v.id_unidad=a.id_unidad AND v.publicado
  AND COALESCE(v.origen_reactivo,v.id_actividad::text)=COALESCE(a.origen_reactivo,a.id_actividad::text)
  AND (v.id_tema IS NULL OR EXISTS(SELECT 1 FROM temas t WHERE t.id_tema=v.id_tema AND t.publicado)))
 GROUP BY r.id_usuario,a.id_unidad) r ON r.id_usuario=p.id_usuario AND r.id_unidad=p.id_unidad;
CREATE FUNCTION kichwa_validar_origen_recompensa() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.id_intento IS NOT NULL THEN
  IF NOT EXISTS(SELECT 1 FROM intentos_evaluacion WHERE id_intento=NEW.id_intento AND id_usuario=NEW.id_usuario) THEN
   RAISE EXCEPTION 'La recompensa debe pertenecer al estudiante del intento' USING ERRCODE='23514'; END IF;
 ELSE
  IF NOT EXISTS(SELECT 1 FROM respuestas_actividad WHERE id_respuesta_actividad=NEW.id_respuesta_actividad AND id_usuario=NEW.id_usuario AND acierto_actividad) THEN
   RAISE EXCEPTION 'La recompensa requiere un acierto del mismo estudiante' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER validar_origen_recompensa BEFORE INSERT ON recompensas FOR EACH ROW EXECUTE FUNCTION kichwa_validar_origen_recompensa();
SQL);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        throw new RuntimeException('Recuperar con copia verificada o migración correctiva; preservar historial y recompensas.');
    }
};
