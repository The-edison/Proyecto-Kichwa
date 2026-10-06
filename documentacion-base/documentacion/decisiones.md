# Correspondencia con el MER y decisiones de implementación

## Fuente y cambios físicos

Se sigue el MER v3, que contiene INTENTOS_EVALUACION y expresa el avance mediante la relación USUARIOS–avanza–UNIDADES. No se restauró la agregación de una versión anterior ni se agregó AVANCE_UNIDAD.

| Elemento conceptual | Implementación |
|---|---|
| 12 entidades del MER | 12 tablas con nombres en minúsculas. |
| USUARIOS N:M NIVELES, inicia | `usuarios_niveles`, pareja única usuario/nivel. |
| USUARIOS N:M UNIDADES, avanza | `progreso`, pareja única usuario/unidad. |
| Identidad de tablas asociativas | Se añaden `id_usuario_nivel` e `id_progreso` como PK simples compatibles con Eloquent. |
| Porcentaje de progreso | Calculado en `v_progreso`. |
| Estado de progreso | Derivado de la misma fórmula, en `v_progreso`; evita un estado completado incoherente con el porcentaje. |
| Calificación del intento | Calculada en `v_intentos_evaluacion`; NULL mientras no finaliza. |
| Puntaje máximo de evaluación | Suma de sus preguntas en `v_evaluaciones`; no se almacena duplicado. |
| Elementos, zonas, solución y respuesta | JSONB con contrato documentado; conserva el contenido compuesto sin agregar entidades conceptuales. |
| Pregunta y respuesta del mismo intento | `respuestas_evaluacion.id_evaluacion` es una redundancia técnica controlada por dos FK compuestas. |
| Diagnóstico general | `evaluaciones.id_unidad` NULL únicamente si tipo = diagnostica. La evaluación de unidad exige una unidad. |
| Compatibilidad Laravel | `remember_token` opcional; modelo Usuario con tabla, PK, password y timestamps personalizados. |

Las FK repiten el nombre de la clave referenciada porque cumplen esa función. La condición previa de nombres únicos de atributos en el MER no significa que deba renombrarse cada aparición de una FK en el modelo relacional.

## Progreso

Regla técnica elegida para esta entrega: una actividad se completa cuando el estudiante obtiene al menos una respuesta correcta. Avance de unidad = actividades distintas completadas / total de actividades de la unidad × 100. No se cuenta cada reintento. Unidad sin actividades = 0, en_curso. Una respuesta incorrecta posterior no borra un acierto previo.

Una respuesta de actividad crea/actualiza automáticamente la fila de progreso. Al abrir una unidad sin responder todavía, Laravel puede insertar la asociación con `insertOrIgnore` y consultar la vista. No se exige una respuesta para iniciar progreso.

Módulos y niveles se calculan considerando también las unidades no iniciadas con cero. Cada unidad pesa lo mismo; en niveles no se promedian promedios de módulos de distinto tamaño. Se consideran los niveles asociados en usuarios_niveles: el backend debe crear esa asociación cuando el estudiante selecciona su nivel. El progreso individual de unidad sigue existiendo aunque no haya asociación de nivel.

Esta regla mide **práctica completada**, no aprobación académica: no incluye lectura de temas ni aprobación de evaluaciones. Debe validarse con la tutora/docente. Añadir actividades a una unidad cambia el denominador y puede disminuir su porcentaje; esta versión mide avance contra el contenido vigente, no cohortes o currículos versionados.

## Intentos y calificación

- Un estudiante puede repetir una evaluación; `numero_intento` es único dentro de su par usuario/evaluación.
- Sólo se permite un intento abierto para ese par. El backend debe reutilizarlo o cerrarlo antes de abrir otro.
- El nuevo intento comienza en_curso, con fin NULL; debe existir al menos una pregunta.
- Hay una respuesta por pregunta e intento. Puede actualizarse mientras el intento siga abierto.
- Al finalizar o abandonar se exige fecha de fin válida. No se permite reabrir ni modificar un intento cerrado.
- Calificación final = suma de puntuaciones obtenidas. Preguntas no respondidas aportan cero. No se exige contestar todas para finalizar; si se requiere, añadir esa validación de negocio al flujo.
- Cada puntaje debe estar entre 0 y el máximo de su pregunta. PostgreSQL valida ese rango, pero no calcula si el contenido enviado es correcto: esa corrección pertenece al backend.
- Las preguntas y evaluaciones quedan congeladas al aparecer el primer intento. Para editar el contenido se crea otra evaluación. Así las notas históricas no cambian por una edición posterior.
- Una actividad con respuestas queda congelada; las respuestas de práctica son históricas, se añade un nuevo envío en lugar de sobreescribir.
- Todas las FK usan RESTRICT al eliminar: no se borra contenido con historial mediante cascadas. La gestión administrativa debe comunicar el bloqueo y permitir conservar la versión anterior; un futuro archivado requeriría una migración explícita.

Para asignar el siguiente número de intento, use una transacción y bloquee una fila estable, por ejemplo la de `usuarios` con `lockForUpdate()`, antes de consultar MAX(numero_intento)+1 e insertar. Todas las rutas de creación deben usar el mismo protocolo. Las restricciones únicas son la última defensa; gestione un conflicto como 409, no como un error interno sin explicación. No se probó concurrencia multisesión en esta entrega.

## Recomendación diagnóstica

La base conserva el diagnóstico y su calificación porcentual. No se fijó un umbral inventado para recomendar Básico o Intermedio: falta aprobación del docente experto. La API debe aplicar el criterio aprobado y devolver la recomendación. La selección efectiva se registra en usuarios_niveles. Esta relación permite varios niveles y no identifica un único nivel activo ni conserva una recomendación histórica independiente.

## Validaciones y seguridad de la futura API

1. Obtener id_usuario del usuario autenticado; no confiar en el ID del cuerpo de la solicitud.
2. Restringir contenido/ejercicios/usuarios/reportes al Administrador. Los triggers de estudiante no reemplazan autorización de acceso.
3. Comprobar estado_usuario activo en todas las peticiones autenticadas pertinentes.
4. Normalizar correo a minúsculas sin espacios; conservar cédula como cadena. Validar su formato según los requisitos de registro.
5. Validar el contrato JSON completo, tamaño, identificadores únicos, referencias internas y correspondencia con tipo de ejercicio. Los CHECK comprueban objeto/arreglo, no todo el contrato pedagógico.
6. Comparar contra la solución en el servidor, asignar acierto/puntaje/retroalimentación y persistir en una transacción. No aceptar esos resultados calculados por el cliente.
7. No exponer solucion_actividad/solucion_pregunta al listar ejercicios para responder. En las evaluaciones no se añadió un atributo de retroalimentación: puede generarse al finalizar desde la solución congelada. Si debe conservarse un comentario individual, requerirá una migración posterior.
8. Usar recursos relativos y validados, sanear contenido enriquecido, limitar intentos de login y aplicar CSRF cuando corresponda.
9. Usar consultas parametrizadas/Eloquent. Los SQL incrustados de estas migraciones y semillas son constantes; no interpolar entradas del usuario.
10. Mapear restricciones de unicidad, FK y reglas de negocio a respuestas de API comprensibles. No devolver errores SQL crudos al estudiante.

## Diferencias respecto al material de homologación

No se trasladaron tablas de carreras, trámites, coordinadores o resoluciones, porque no pertenecen al sistema Kichwa. Se preservaron los siete tipos de archivo y se reescribió su contenido. Se corrigió el patrón de múltiples `return new class` concatenados: cada migración es un PHP independiente. El TXT es sólo una recopilación legible.
