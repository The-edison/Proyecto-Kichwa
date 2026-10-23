# Audios · Módulo 2, unidad 2: partes del cuerpo

Coloca 17 grabaciones MP3 en las carpetas indicadas. Cada tarjeta de la lección ya tiene conectado su archivo.

## Partes del cuerpo

Carpeta: `frontend/public/audios/modulo-2/unidad-2/partes/`

Graba únicamente la palabra en kichwa, sin decir la traducción. Usa los nombres exactos de los archivos, en minúsculas, sin espacios ni tildes. La ñ de ñawi se escribe como n solamente en el nombre del archivo.

| Archivo | Palabra que se escucha | Significado |
| --- | --- | --- |
| uma.mp3 | uma | cabeza |
| nawi.mp3 | ñawi | cara |
| rinri.mp3 | rinri | oreja |
| shimi.mp3 | shimi | boca |
| kiru.mp3 | kiru | diente |
| hallu.mp3 | hallu | lengua |
| kunka.mp3 | kunka | cuello |
| rikra.mp3 | rikra | brazo |
| maki.mp3 | maki | mano |
| ruka.mp3 | ruka | dedo |
| sillu.mp3 | sillu | uña |
| wiksa.mp3 | wiksa | barriga |
| washa.mp3 | washa | espalda |
| kunkuri.mp3 | kunkuri | rodilla |
| chaki.mp3 | chaki | pie / pies |
| chaki-washa.mp3 | chaki washa | talón |

## Frase de ejemplo

Carpeta: `frontend/public/audios/modulo-2/unidad-2/ejemplos/`

Archivo: `me-duele-el-pie.mp3`

Graba la frase completa: **Chakitami nanan.** (Me duele el pie).

No hace falta modificar código ni ejecutar semillas para añadir los audios. En desarrollo, vuelve a pulsar Escuchar después de colocar el archivo. Para una versión publicada, ejecuta `npm run build` dentro de `frontend` y publica la compilación actualizada.

La grabación solo comienza al pulsar una tarjeta. Se detiene el audio anterior al escuchar otra tarjeta y al salir de la lección. Si falta un archivo, se muestra un aviso y puedes reintentarlo.

## Ejercicios del cuerpo humano

Hay seis actividades en cuatro paneles: 01 sola; 02 y 03 juntas; 04 y 05 juntas; 07 sola. Se omite la actividad 06 de la referencia. Un único botón comprueba cada panel, con corrección de cada fila y bloqueo de las actividades ya acertadas.

La actividad 04 «Escucha y escribe» reutiliza estas grabaciones de `frontend/public/audios/modulo-2/unidad-2/partes/`, en este orden:

| Audio | Archivo | Graba solo la palabra |
| --- | --- | --- |
| 1 | rinri.mp3 | rinri |
| 2 | maki.mp3 | maki |
| 3 | chaki-washa.mp3 | chaki washa |

La actividad 05 «Comprende las oraciones» necesita tres grabaciones nuevas en `frontend/public/audios/modulo-2/unidad-2/oraciones/`:

| Audio | Archivo | Graba la oración completa | Significado |
| --- | --- | --- | --- |
| 1 | me-duele-la-cabeza.mp3 | Ñukatami umata nanan | A mí me duele la cabeza. |
| 2 | mi-papa-tiene-mucha-barriga.mp3 | Ñuka yayaka wiksa sapami | Mi papá tiene mucha barriga. |
| 4 | me-duele-la-garganta.mp3 | Kunkatami nanan | Me duele la garganta. |

El audio 3 reutiliza `frontend/public/audios/modulo-2/unidad-2/ejemplos/me-duele-el-pie.mp3`: **Chakitami nanan**. No dupliques ese archivo en `oraciones/`.

Son 20 grabaciones para la lección y los ejercicios en total: las 17 anteriores y las tres oraciones nuevas. Graba únicamente en kichwa, sin decir la traducción. Los botones ya tienen sus rutas configuradas.
