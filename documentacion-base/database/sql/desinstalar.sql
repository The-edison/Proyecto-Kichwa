-- DESTRUCTIVO: sólo para una base desechable de pruebas. Elimina datos Kichwa.
BEGIN;
DROP VIEW v_progreso_niveles;
DROP VIEW v_progreso_modulos;
DROP VIEW v_progreso;
DROP VIEW v_intentos_evaluacion;
DROP VIEW v_evaluaciones;

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

DROP TABLE diccionario;

DROP TABLE respuestas_evaluacion;

DROP TABLE intentos_evaluacion;

DROP TABLE preguntas;

DROP TABLE evaluaciones;

DROP TABLE respuestas_actividad;

DROP TABLE actividades;

DROP TABLE temas;

DROP TABLE progreso;

DROP TABLE usuarios_niveles;

DROP TABLE unidades;

DROP TABLE modulos;

DROP TABLE niveles;

DROP TABLE usuarios;
COMMIT;
