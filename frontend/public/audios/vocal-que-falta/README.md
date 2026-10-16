# La vocal que falta

Coloca aquí los tres archivos MP3 reales, con nombres en minúsculas:

| Botón | Palabra de la grabación | Archivo |
| --- | --- | --- |
| Audio 1 | shunku | `shunku.mp3` |
| Audio 2 | purina | `purina.mp3` |
| Audio 3 | llama | `llama.mp3` |

Ruta de la carpeta: `frontend/public/audios/vocal-que-falta/`.

Cada grabación debe pronunciar la palabra completa. Si tus archivos tienen otro formato, conviértelos a MP3; cambiar solamente su extensión no convierte el audio.

En desarrollo basta con copiarlos a esta carpeta. Para una compilación de producción, ejecuta `npm.cmd run build` desde `frontend` después de agregarlos.

Los botones reproducen desde el principio y detienen el audio anterior. Al salir del panel se detiene la reproducción. Si falta una grabación o falla su reproducción, se informa al estudiante y se permite reintentar.
