# Audios de las vocales

Coloca aquí las grabaciones de pronunciación:

| Vocal | Archivo |
| --- | --- |
| a | `a.mp3` |
| i | `i.mp3` |
| u | `u.mp3` |

Usa nombres en minúsculas y archivos en formato MP3 real. Si tus grabaciones son WAV, OGG o M4A, conviértelas a MP3; cambiar solamente la extensión no convierte el audio.

Vite sirve esta carpeta como `/audios/vocales/` y copia sus archivos a la compilación. No es necesario modificar el código ni cargar los audios desde el panel de administración. Si ya generaste una compilación, vuelve a ejecutar `npm.cmd run build` desde `frontend` después de agregar los archivos.

Cada clic reproduce la grabación desde el principio y detiene la vocal anterior. Al salir de la lección se detiene la reproducción. Si falta un archivo o no se puede reproducir, se muestra un mensaje y se permite reintentar.
