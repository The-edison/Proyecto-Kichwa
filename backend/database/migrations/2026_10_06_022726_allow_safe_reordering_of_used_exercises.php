<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
CREATE OR REPLACE FUNCTION kichwa_proteger_pregunta() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE anterior bigint; actual bigint;
BEGIN
    IF TG_OP='UPDATE' AND (to_jsonb(NEW)-'orden_pregunta') IS NOT DISTINCT FROM (to_jsonb(OLD)-'orden_pregunta') THEN RETURN NEW; END IF;
    IF TG_OP <> 'INSERT' THEN anterior := OLD.id_evaluacion; END IF;
    IF TG_OP <> 'DELETE' THEN actual := NEW.id_evaluacion; END IF;
    PERFORM id_evaluacion FROM evaluaciones WHERE id_evaluacion IN (anterior, actual) ORDER BY id_evaluacion FOR UPDATE;
    IF EXISTS (SELECT 1 FROM intentos_evaluacion WHERE id_evaluacion IN (anterior, actual)) THEN
      RAISE EXCEPTION 'Evaluación utilizada: cree otra versión antes de cambiar sus preguntas' USING ERRCODE='23514';
    END IF;
    IF TG_OP='DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;
CREATE OR REPLACE FUNCTION kichwa_proteger_actividad() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP='UPDATE' AND (to_jsonb(NEW)-'orden_actividad') IS NOT DISTINCT FROM (to_jsonb(OLD)-'orden_actividad') THEN RETURN NEW; END IF;
    IF EXISTS (SELECT 1 FROM respuestas_actividad WHERE id_actividad=OLD.id_actividad) THEN
      RAISE EXCEPTION 'Actividad con respuestas: cree una nueva versión' USING ERRCODE='23514';
    END IF;
    IF TG_OP='DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;
SQL
        );
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
CREATE OR REPLACE FUNCTION kichwa_proteger_pregunta() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE anterior bigint; actual bigint;
BEGIN
    IF TG_OP <> 'INSERT' THEN anterior := OLD.id_evaluacion; END IF;
    IF TG_OP <> 'DELETE' THEN actual := NEW.id_evaluacion; END IF;
    PERFORM id_evaluacion FROM evaluaciones WHERE id_evaluacion IN (anterior, actual) ORDER BY id_evaluacion FOR UPDATE;
    IF EXISTS (SELECT 1 FROM intentos_evaluacion WHERE id_evaluacion IN (anterior, actual)) THEN
      RAISE EXCEPTION 'Evaluación utilizada: cree otra versión antes de cambiar sus preguntas' USING ERRCODE='23514';
    END IF;
    IF TG_OP='DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;
CREATE OR REPLACE FUNCTION kichwa_proteger_actividad() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM respuestas_actividad WHERE id_actividad=OLD.id_actividad) THEN
      RAISE EXCEPTION 'Actividad con respuestas: cree una nueva versión' USING ERRCODE='23514';
    END IF;
    IF TG_OP='DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;
SQL
        );
    }
};
