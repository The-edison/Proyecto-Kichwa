# Audios · Módulo 2, unidad 1: animales y colores

Coloca 32 grabaciones MP3 en las siguientes carpetas, usando los nombres exactos. Graba solo la palabra en kichwa, salvo el ejemplo, que lleva la frase completa. Hay 10 animales domésticos, 10 animales salvajes y 11 colores.

## Animales

Carpeta: `frontend/public/audios/modulo-2/unidad-1/animales/`

| Archivo | Palabra que se escucha | Significado |
| --- | --- | --- |
| allku.mp3 | allku | perro |
| misi.mp3 | misi | gato |
| kuy.mp3 | kuy | cuy |
| llama.mp3 | llama | oveja |
| wakra.mp3 | wakra | ganado |
| kuchi.mp3 | kuchi | cerdo |
| atalpa.mp3 | atalpa | gallina |
| kunu.mp3 | kunu | conejo |
| apiw.mp3 | apiw | caballo |
| chantasu.mp3 | chantasu | burro |
| taruka.mp3 | taruka | venado |
| ukucha.mp3 | ukucha | ratón |
| urpi.mp3 | urpi | tórtola |
| hampatu.mp3 | hampatu | rana |
| pilpintu.mp3 | pilpintu | mariposa |
| kinti.mp3 | kinti | colibrí |
| atuk.mp3 | atuk | lobo |
| anas.mp3 | añas | zorro |
| yutu.mp3 | yutu | perdiz |
| uturunku.mp3 | uturunku | oso |

## Colores

Carpeta: `frontend/public/audios/modulo-2/unidad-1/colores/`

| Archivo | Palabra que se escucha | Significado |
| --- | --- | --- |
| yurak.mp3 | yurak | blanco |
| yana.mp3 | yana | negro |
| puka.mp3 | puka | rojo |
| killu.mp3 | killu | amarillo |
| ankas.mp3 | ankas | azul |
| waylla.mp3 | waylla | verde |
| paku.mp3 | paku | marrón |
| maywa.mp3 | maywa | morado |
| kishpu.mp3 | kishpu | naranja |
| waminsi.mp3 | waminsi | rosado |
| suku.mp3 | suku | gris |

## Ejemplo

Carpeta: `frontend/public/audios/modulo-2/unidad-1/ejemplos/`

Archivo: `mi-gato-es-negro.mp3`

Grabación: **Ñuka misika yanami kan.** (Mi gato es negro).

La ñ de añas se escribe como n solamente en el nombre `anas.mp3`. El ejemplo anterior del sombrero ya no se utiliza en esta lección.

## Audios de los ejercicios de animales

Hay cuatro paneles de animales domésticos y cuatro de animales salvajes. El tercero de domésticos une la comprensión y la palabra que falta en una sola actividad: tres escenas, dos respuestas por escena y un único botón para comprobar.

Los cuatro audios de animales domésticos reutilizan, en este orden, `animales/kuchi.mp3`, `animales/kunu.mp3`, `animales/apiw.mp3` y `animales/chantasu.mp3`.

Los tres audios de animales salvajes reutilizan `animales/pilpintu.mp3`, `animales/hampatu.mp3` y `animales/kinti.mp3`.

Añade estas tres grabaciones para el panel «Escucha, comprende y completa», en la carpeta `frontend/public/audios/modulo-2/unidad-1/oraciones/`:

| Archivo | Frase completa que se escucha | Significado |
| --- | --- | --- |
| mi-mama-tiene-un-perro.mp3 | Ñuka mamaka shuk allkutami charin | Mi mamá tiene un perro. |
| me-compre-un-hermoso-gato.mp3 | Ñukami shuk sumak misita rantirkani | Yo me compré un hermoso gato. |
| jose-compro-una-oveja.mp3 | Joseka shuk llamatami rantirka | José compró una oveja. |

Son 35 grabaciones para la lección y los ejercicios en total: las 32 anteriores y estas 3 oraciones. Los archivos de animales se comparten entre las tarjetas de la lección y los ejercicios.

Cada botón ya apunta a su archivo. Usa nombres en minúsculas, sin espacios, con extensión `.mp3`. No hace falta cambiar código ni ejecutar semillas. En desarrollo, vuelve a pulsar Escuchar después de añadir el archivo. Para publicar los audios, ejecuta `npm run build` dentro de `frontend` y publica la compilación actualizada.

Solo se reproduce un audio a la vez y se detiene al salir de la lección. Si falta un archivo, se muestra un aviso y se puede reintentar.

## Ejercicios de colores

Se añaden siete actividades en cinco paneles después de los ocho ejercicios de animales. Se omite «Identifica en contexto» (actividad 02 de la imagen). Se agrupan 01 con 03 y 06 con 07; las actividades 04, 05 y 08 tienen su propio panel. Cada panel tiene un único botón para comprobar y señala qué filas necesitan corrección.

«Escucha el color» reutiliza, en orden, estos archivos de `frontend/public/audios/modulo-2/unidad-1/colores/`:

| Archivo | Graba solo esta palabra | Color |
| --- | --- | --- |
| waylla.mp3 | waylla | Verde |
| waminsi.mp3 | waminsi | Rosado |
| paku.mp3 | paku | Marrón |

Para «Comprende lo que escuchas» e «Interpreta y colorea», añade cinco grabaciones a `frontend/public/audios/modulo-2/unidad-1/oraciones/`:

| Archivo | Graba la oración completa | Significado |
| --- | --- | --- |
| mi-sombrero-es-blanco.mp3 | Ñuka muchikuka yurakmi kan | Mi sombrero es blanco. |
| su-pantalon-es-negro.mp3 | Paypak waraka yanami kan | Su pantalón es negro. |
| su-reboso-es-rojo.mp3 | Paypak llikllaka pukami kan | Su reboso es rojo. |
| su-collar-es-amarillo.mp3 | Paypak wallkaka killumi kan | Su collar es amarillo. |
| sus-zapatos-son-azules.mp3 | Paypak ushukunaka ankasmi kan | Sus zapatos son azules. |

La sexta oración reutiliza `frontend/public/audios/modulo-2/unidad-1/ejemplos/mi-gato-es-negro.mp3`: **Ñuka misika yanami kan**. No dupliques esa grabación en `oraciones/`.

El audio de comprensión se reproduce en el orden pantalón, sombrero y gato. El ejercicio para colorear sigue el orden sombrero, gato, pantalón, reboso, collar y zapatos.

En total hay 40 archivos para la lección, los ejercicios de animales y los de colores: los 35 anteriores y las cinco oraciones nuevas. Graba únicamente en kichwa, sin pronunciar la traducción. Todos los botones ya están conectados.
