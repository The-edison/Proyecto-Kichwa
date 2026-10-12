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
ALTER TABLE preguntas ADD COLUMN IF NOT EXISTS origen_reactivo varchar(100);
CREATE OR REPLACE FUNCTION kichwa_proteger_pregunta() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE anterior bigint; actual bigint;
BEGIN
 IF TG_OP='UPDATE' AND (to_jsonb(NEW)-'orden_pregunta'-'publicado') IS NOT DISTINCT FROM (to_jsonb(OLD)-'orden_pregunta'-'publicado') THEN RETURN NEW; END IF;
 IF TG_OP <> 'INSERT' THEN anterior := OLD.id_evaluacion; END IF;
 IF TG_OP <> 'DELETE' THEN actual := NEW.id_evaluacion; END IF;
 PERFORM id_evaluacion FROM evaluaciones WHERE id_evaluacion IN (anterior,actual) ORDER BY id_evaluacion FOR UPDATE;
 IF EXISTS (SELECT 1 FROM intentos_evaluacion WHERE id_evaluacion IN (anterior,actual)) THEN
 RAISE EXCEPTION 'Evaluación utilizada: cree otra versión para cambiar sus preguntas' USING ERRCODE='23514'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END; $$;
CREATE OR REPLACE FUNCTION kichwa_proteger_actividad() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND (to_jsonb(NEW)-'orden_actividad'-'publicado') IS NOT DISTINCT FROM (to_jsonb(OLD)-'orden_actividad'-'publicado') THEN RETURN NEW; END IF;
 IF EXISTS (SELECT 1 FROM respuestas_actividad WHERE id_actividad=OLD.id_actividad) THEN
 RAISE EXCEPTION 'Actividad con respuestas: cree una nueva versión' USING ERRCODE='23514'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END; $$;
CREATE OR REPLACE FUNCTION kichwa_proteger_evaluacion() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND (to_jsonb(NEW)-'publicado') IS NOT DISTINCT FROM (to_jsonb(OLD)-'publicado') THEN RETURN NEW; END IF;
 IF EXISTS (SELECT 1 FROM intentos_evaluacion WHERE id_evaluacion=OLD.id_evaluacion) THEN
 RAISE EXCEPTION 'Evaluación con historial: cree una nueva versión' USING ERRCODE='23514'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END; $$;
CREATE FUNCTION kichwa_proteger_recompensa() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Las recompensas registradas son inmutables' USING ERRCODE='23514'; END; $$;
CREATE TRIGGER proteger_recompensa BEFORE UPDATE OR DELETE ON recompensas FOR EACH ROW EXECUTE FUNCTION kichwa_proteger_recompensa();
CREATE TRIGGER estudiante_recompensa BEFORE INSERT ON recompensas FOR EACH ROW EXECUTE FUNCTION kichwa_validar_estudiante();
SQL);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        throw new RuntimeException('Recuperar mediante copia verificada o migración correctiva, conservando el historial.');
    }
};
