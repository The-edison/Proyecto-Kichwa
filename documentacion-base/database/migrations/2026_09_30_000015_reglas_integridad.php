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
-- Reglas entre filas que no pueden expresarse mediante CHECK.
CREATE FUNCTION kichwa_validar_estudiante() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM 1 FROM usuarios WHERE id_usuario = NEW.id_usuario AND rol_usuario = 'estudiante' FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'La participación requiere un estudiante' USING ERRCODE = '23514'; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER estudiante_nivel BEFORE INSERT OR UPDATE ON usuarios_niveles FOR EACH ROW EXECUTE FUNCTION kichwa_validar_estudiante();
CREATE TRIGGER estudiante_progreso BEFORE INSERT OR UPDATE ON progreso FOR EACH ROW EXECUTE FUNCTION kichwa_validar_estudiante();
CREATE TRIGGER estudiante_actividad BEFORE INSERT OR UPDATE ON respuestas_actividad FOR EACH ROW EXECUTE FUNCTION kichwa_validar_estudiante();
CREATE TRIGGER estudiante_intento BEFORE INSERT OR UPDATE ON intentos_evaluacion FOR EACH ROW EXECUTE FUNCTION kichwa_validar_estudiante();

CREATE FUNCTION kichwa_proteger_rol() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.rol_usuario <> OLD.rol_usuario AND (
      EXISTS (SELECT 1 FROM usuarios_niveles WHERE id_usuario=OLD.id_usuario) OR
      EXISTS (SELECT 1 FROM progreso WHERE id_usuario=OLD.id_usuario) OR
      EXISTS (SELECT 1 FROM respuestas_actividad WHERE id_usuario=OLD.id_usuario) OR
      EXISTS (SELECT 1 FROM intentos_evaluacion WHERE id_usuario=OLD.id_usuario))
    THEN RAISE EXCEPTION 'No cambie el rol de un estudiante con historial' USING ERRCODE='23514'; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER proteger_rol BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION kichwa_proteger_rol();

CREATE FUNCTION kichwa_proteger_pregunta() RETURNS trigger LANGUAGE plpgsql AS $$
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
CREATE TRIGGER proteger_pregunta BEFORE INSERT OR UPDATE OR DELETE ON preguntas FOR EACH ROW EXECUTE FUNCTION kichwa_proteger_pregunta();

CREATE FUNCTION kichwa_proteger_evaluacion() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM intentos_evaluacion WHERE id_evaluacion=OLD.id_evaluacion) THEN
      RAISE EXCEPTION 'Evaluación con historial: no se permite modificarla o eliminarla' USING ERRCODE='23514';
    END IF;
    IF TG_OP='DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER proteger_evaluacion BEFORE UPDATE OR DELETE ON evaluaciones FOR EACH ROW EXECUTE FUNCTION kichwa_proteger_evaluacion();

CREATE FUNCTION kichwa_validar_intento() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP='UPDATE' THEN
      IF OLD.estado_intento <> 'en_curso' THEN RAISE EXCEPTION 'El intento cerrado es inmutable' USING ERRCODE='23514'; END IF;
      IF (NEW.id_usuario,NEW.id_evaluacion,NEW.numero_intento,NEW.fecha_inicio_intento,NEW.id_intento)
         IS DISTINCT FROM (OLD.id_usuario,OLD.id_evaluacion,OLD.numero_intento,OLD.fecha_inicio_intento,OLD.id_intento)
      THEN RAISE EXCEPTION 'No cambie la identidad del intento' USING ERRCODE='23514'; END IF;
      IF NEW.fecha_fin_intento < (SELECT max(fecha_respuesta_evaluacion) FROM respuestas_evaluacion WHERE id_intento=OLD.id_intento)
      THEN RAISE EXCEPTION 'El cierre no puede preceder a las respuestas' USING ERRCODE='23514'; END IF;
    ELSE
      IF NEW.estado_intento <> 'en_curso' THEN RAISE EXCEPTION 'Un intento debe comenzar en curso' USING ERRCODE='23514'; END IF;
    END IF;
    PERFORM 1 FROM evaluaciones WHERE id_evaluacion=NEW.id_evaluacion FOR UPDATE;
    IF NOT EXISTS (SELECT 1 FROM preguntas WHERE id_evaluacion=NEW.id_evaluacion)
    THEN RAISE EXCEPTION 'No se puede iniciar una evaluación sin preguntas' USING ERRCODE='23514'; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER validar_intento BEFORE INSERT OR UPDATE ON intentos_evaluacion FOR EACH ROW EXECUTE FUNCTION kichwa_validar_intento();

CREATE FUNCTION kichwa_validar_respuesta_evaluacion() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE intento intentos_evaluacion%ROWTYPE; maximo numeric; destino bigint;
BEGIN
    IF TG_OP='DELETE' THEN destino:=OLD.id_intento; ELSE destino:=NEW.id_intento; END IF;
    SELECT * INTO intento FROM intentos_evaluacion WHERE id_intento=destino FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Intento inexistente' USING ERRCODE='23503'; END IF;
    IF intento.estado_intento <> 'en_curso' THEN RAISE EXCEPTION 'No se puede cambiar una respuesta de un intento cerrado' USING ERRCODE='23514'; END IF;
    IF TG_OP='DELETE' THEN RETURN OLD; END IF;
    IF TG_OP='UPDATE' AND (NEW.id_intento,NEW.id_pregunta,NEW.id_evaluacion,NEW.id_respuesta_evaluacion)
       IS DISTINCT FROM (OLD.id_intento,OLD.id_pregunta,OLD.id_evaluacion,OLD.id_respuesta_evaluacion)
    THEN RAISE EXCEPTION 'La identidad de la respuesta es inmutable' USING ERRCODE='23514'; END IF;
    SELECT puntaje_pregunta INTO maximo FROM preguntas WHERE id_pregunta=NEW.id_pregunta AND id_evaluacion=NEW.id_evaluacion;
    IF maximo IS NULL OR intento.id_evaluacion <> NEW.id_evaluacion THEN RAISE EXCEPTION 'La pregunta no pertenece a la evaluación del intento' USING ERRCODE='23503'; END IF;
    IF NEW.puntaje_respuesta_evaluacion > maximo THEN RAISE EXCEPTION 'Puntaje superior al máximo de la pregunta' USING ERRCODE='23514'; END IF;
    IF NEW.fecha_respuesta_evaluacion < intento.fecha_inicio_intento THEN RAISE EXCEPTION 'La respuesta no puede preceder al intento' USING ERRCODE='23514'; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER validar_respuesta_evaluacion BEFORE INSERT OR UPDATE OR DELETE ON respuestas_evaluacion FOR EACH ROW EXECUTE FUNCTION kichwa_validar_respuesta_evaluacion();

CREATE FUNCTION kichwa_proteger_actividad() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM respuestas_actividad WHERE id_actividad=OLD.id_actividad) THEN
      RAISE EXCEPTION 'Actividad con respuestas: cree una nueva versión' USING ERRCODE='23514';
    END IF;
    IF TG_OP='DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER proteger_actividad BEFORE UPDATE OR DELETE ON actividades FOR EACH ROW EXECUTE FUNCTION kichwa_proteger_actividad();

CREATE FUNCTION kichwa_registrar_practica() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE unidad bigint;
BEGIN
    IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'Las respuestas de práctica son históricas; registre otro envío' USING ERRCODE='23514'; END IF;
    SELECT id_unidad INTO unidad FROM actividades WHERE id_actividad=NEW.id_actividad FOR UPDATE;
    IF unidad IS NULL THEN RAISE EXCEPTION 'Actividad inexistente' USING ERRCODE='23503'; END IF;
    INSERT INTO progreso (id_usuario,id_unidad,fecha_inicio_progreso,fecha_actualizacion_progreso)
    VALUES (NEW.id_usuario,unidad,NEW.fecha_respuesta_actividad,NEW.fecha_respuesta_actividad)
    ON CONFLICT (id_usuario,id_unidad) DO UPDATE SET
      fecha_inicio_progreso=LEAST(progreso.fecha_inicio_progreso,EXCLUDED.fecha_inicio_progreso),
      fecha_actualizacion_progreso=GREATEST(progreso.fecha_actualizacion_progreso,EXCLUDED.fecha_actualizacion_progreso);
    RETURN NEW;
END;
$$;
CREATE TRIGGER registrar_practica BEFORE INSERT OR UPDATE OR DELETE ON respuestas_actividad FOR EACH ROW EXECUTE FUNCTION kichwa_registrar_practica();

SQL
        );
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
DROP TRIGGER estudiante_nivel ON usuarios_niveles;
DROP TRIGGER estudiante_progreso ON progreso;
DROP TRIGGER estudiante_actividad ON respuestas_actividad;
DROP TRIGGER estudiante_intento ON intentos_evaluacion;
DROP TRIGGER proteger_rol ON usuarios;
DROP TRIGGER proteger_pregunta ON preguntas;
DROP TRIGGER proteger_evaluacion ON evaluaciones;
DROP TRIGGER validar_intento ON intentos_evaluacion;
DROP TRIGGER validar_respuesta_evaluacion ON respuestas_evaluacion;
DROP TRIGGER proteger_actividad ON actividades;
DROP TRIGGER registrar_practica ON respuestas_actividad;
DROP FUNCTION kichwa_validar_estudiante();
DROP FUNCTION kichwa_proteger_rol();
DROP FUNCTION kichwa_proteger_pregunta();
DROP FUNCTION kichwa_proteger_evaluacion();
DROP FUNCTION kichwa_validar_intento();
DROP FUNCTION kichwa_validar_respuesta_evaluacion();
DROP FUNCTION kichwa_proteger_actividad();
DROP FUNCTION kichwa_registrar_practica();
SQL
        );
    }
};
