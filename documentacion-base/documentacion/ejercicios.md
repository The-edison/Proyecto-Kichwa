# Contrato de ejercicios y respuestas

Los mismos contratos se aplican a ACTIVIDADES y PREGUNTAS. En las actividades se usan las columnas terminadas en `_actividad` y en las preguntas las terminadas en `_pregunta`. La respuesta enviada se guarda en `respuesta_actividad` o `respuesta_evaluacion` como objeto JSONB.

JSONB es una decisión física de PostgreSQL para los atributos multivaluados del MER. No usar cadenas con valores separados por comas. Los elementos no son filas independientes: sus IDs son locales al ejercicio. Laravel debe comprobar estructura, unicidad y correspondencia de todas las referencias internas.

## 1. Selección múltiple

Puede aceptar una o varias opciones correctas; la selección es un conjunto sin IDs duplicados.

```json
{
  "elementos": [{"id":"a","texto":"shuk"},{"id":"b","texto":"ishkay"}],
  "zonas": [],
  "solucion": {"seleccion":["a"]},
  "respuesta": {"seleccion":["a"]}
}
```

Backend: validar que cada ID existe; ordenar los conjuntos antes de comparar. La política básica es exacta: se requiere seleccionar todas las correctas y ninguna incorrecta.

## 2. Completar

Cada espacio tiene un identificador. La solución admite variantes aprobadas por el experto; la respuesta conserva el texto original del estudiante.

```json
{
  "elementos": [{"id":"h1","texto":"dos"}],
  "zonas": [],
  "solucion": {"textos":{"h1":["ishkay"]}},
  "respuesta": {"textos":{"h1":"ishkay"}}
}
```

Backend: comprobar exactamente los espacios esperados; normalizar Unicode a NFC, espacios exteriores y mayúsculas/minúsculas según la política pedagógica. No quitar diacríticos o letras de manera indiscriminada. No inventar variantes lingüísticas aceptables.

## 3. Relacionar

```json
{
  "elementos": [
    {"id":"k1","texto":"shuk","grupo":"origen"},
    {"id":"k2","texto":"ishkay","grupo":"origen"},
    {"id":"e1","texto":"uno","grupo":"destino"},
    {"id":"e2","texto":"dos","grupo":"destino"}
  ],
  "zonas": [],
  "solucion": {"pares":[{"origen":"k1","destino":"e1"},{"origen":"k2","destino":"e2"}]},
  "respuesta": {"pares":[{"origen":"k2","destino":"e2"},{"origen":"k1","destino":"e1"}]}
}
```

Backend: validar grupos, IDs y ausencia de pares repetidos. Comparar pares como conjunto, sin depender del orden del arreglo. En esta base no se fija si un destino puede reutilizarse: el contrato del ejercicio publicado debe decidirlo.

## 4. Arrastrar

```json
{
  "elementos": [{"id":"k1","texto":"uma"}],
  "zonas": [{"id":"z1","texto":"cabeza","x":0.5,"y":0.25}],
  "solucion": {"pares":[{"origen":"k1","destino":"z1"}]},
  "respuesta": {"pares":[{"origen":"k1","destino":"z1"}]}
}
```

Las coordenadas de zonas, si se utilizan, son proporciones de 0 a 1 respecto a la imagen. La respuesta debe guardar la zona elegida, no coordenadas de píxeles que cambian con el tamaño de pantalla. Un recurso NULL permite recuadros textuales sin imagen. Si se indica una ruta de imagen, Laravel debe comprobar que el archivo existe y es seguro antes de publicar el ejercicio.

## Puntajes y retroalimentación

- Para actividades, la política inicial de `acierto_actividad` es todo correcto o incorrecto. Persistir una explicación útil en `retroalimentacion_actividad`.
- Para preguntas, el backend puede asignar todo/nada o puntaje parcial entre 0 y `puntaje_pregunta`. Esta política debe definirse de manera uniforme antes de publicar una evaluación.
- Estas reglas describen el servicio de corrección que deberá implementar Laravel; los archivos de esta entrega no incluyen dicho servicio.
- PostgreSQL comprueba que elementos/zonas sean arreglos y soluciones/respuestas objetos, y que los puntajes sean válidos. No valida por sí solo los IDs locales ni la corrección lingüística.
- Las palabras de ejemplo y semillas son demostrativas y necesitan validación del docente experto antes de usarse como material educativo.
