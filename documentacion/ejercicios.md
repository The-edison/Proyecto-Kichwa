# Contrato de ejercicios

Se aplica por igual a actividades y preguntas. El HTTP proyecta `elements`, `zones`, `resource` y `solution` a las columnas españolas del MER. `solution` sólo se entrega al administrador. El estudiante envía `answer` como objeto; el servidor calcula el resultado. Política inicial: todo correcto o cero puntos, sin umbrales de aprobación inventados.

## Elementos y medios

Cada elemento tiene `id` local único (letras, números, guion o guion bajo), `texto` como etiqueta accesible y, opcionalmente, `imagen`: ruta devuelta por POST /api/admin/uploads. En completar puede tener `opciones` (arreglo de palabras para escoger); vacío permite escribir. En relacionar se exige `grupo: origen|destino`. Máximo 50 elementos y 50 zonas.

`resource` contiene el audio principal de `recurso_actividad/recurso_pregunta`. Imágenes de opciones en `elementos_*`. Imagen del cuerpo humano en `zonas_*[0].imagen` (el editor la replica en las demás zonas). Cada zona tiene id, texto, x e y relativos entre 0 y 1. Las respuestas guardan IDs de zona, nunca coordenadas de pantalla. Las etiquetas y la imagen requieren revisión docente.

Las rutas admitidas son `kichwa/imagenes/<nombre aleatorio>.png` y `kichwa/audio/<nombre aleatorio>.<extensión permitida>`. No aceptar enlaces externos ni archivos no subidos. Imágenes PNG/JPEG/WEBP de hasta 5 MB y 6000×6000 se recodifican a PNG. Audio MP3/WAV/OGG/M4A hasta 10 MB. Se valida MIME real y extensión. SVG, HTML, scripts y ejecutables se rechazan. Los archivos quedan en storage/app/public; GET /api/media/... sirve MIME real y nosniff, sin ejecución. El servidor de producción debe bloquear ejecución en /storage.

## Selección múltiple

```json
{"elements":[{"id":"a","texto":"[DEMO] A"},{"id":"b","texto":"[DEMO] B"}],"zones":[],"solution":{"seleccion":["a"]},"answer":{"seleccion":["a"]}}
```

Comparación como conjunto exacto: sin duplicados, IDs existentes, todas las correctas y ninguna incorrecta. El orden de selección no importa.

## Completar

```json
{"elements":[{"id":"h1","texto":"[DEMO] espacio"}],"zones":[],"solution":{"textos":{"h1":["variante aprobada"]}},"answer":{"textos":{"h1":"variante aprobada"}}}
```

Una o más variantes explícitas por espacio, hasta 20. Se normalizan Unicode NFC, mayúsculas/minúsculas y espacios. Se conservan diacríticos. Si hay opciones, todas las variantes correctas deben aparecer entre ellas. Se responde cada espacio exactamente una vez.

## Relacionar palabras o imágenes

```json
{"elements":[{"id":"k1","texto":"[DEMO] origen","grupo":"origen"},{"id":"d1","texto":"[DEMO] destino","grupo":"destino"}],"zones":[],"solution":{"pares":[{"origen":"k1","destino":"d1"}]},"answer":{"pares":[{"origen":"k1","destino":"d1"}]}}
```

La imagen opcional se añade al elemento origen o destino. Un par por origen y sin reutilizar destinos. No importa el orden del arreglo.

## Arrastrar

```json
{"elements":[{"id":"k1","texto":"[DEMO] etiqueta"}],"zones":[{"id":"z1","texto":"[DEMO] zona","x":0.5,"y":0.25}],"solution":{"pares":[{"origen":"k1","destino":"z1"}]},"answer":{"pares":[{"origen":"k1","destino":"z1"}]}}
```

La imagen subida se referencia en imagen de las zonas. Arrastrar con ratón, tocar etiqueta y zona, o elegir en selectores accesibles por teclado. Las tres interacciones generan el mismo contrato.

## Evaluaciones e historial

POST /api/evaluations/{id}/attempts crea o retoma un intento abierto. Devuelve attempt_id y numero_intento. POST /api/evaluations/{id}/submit recibe attempt_id y answers: [{question_id,answer}]. Se exige una respuesta por pregunta. DELETE /api/attempts/{id} abandona un intento propio.

La asignación de número bloquea la fila de usuario dentro de transacción; un índice único impide dos intentos abiertos. Calificación desde v_intentos_evaluacion. FK compuestas y triggers verifican pertenencia, puntaje máximo, fechas e inmutabilidad. No editar una actividad con respuestas ni una evaluación/pregunta con intentos: crear nueva versión.

Las palabras del paquete siguen siendo [DEMO]; el contenido real debe cargarlo el administrador y validarlo el docente.

