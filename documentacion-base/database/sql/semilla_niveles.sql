INSERT INTO niveles (nombre_nivel,descripcion_nivel,orden_nivel) VALUES
('Básico','Fundamentos de vocabulario y gramática del kichwa de la Sierra Centro.',1),
('Intermedio','Ampliación de vocabulario y construcción de expresiones en kichwa de la Sierra Centro.',2)
ON CONFLICT (nombre_nivel) DO NOTHING;
