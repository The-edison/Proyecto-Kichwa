# Selección automática de opiniones

La página de inicio consulta `GET /api/comentarios/destacados`. No existe aprobación ni selección por parte del administrador. Se usa la tabla existente `testimonials`, sin duplicar las opiniones ni cambiar sus autores.

## Funcionamiento

- Al crear o editar una opinión, se guarda texto plano sanitizado y se calculan `puntaje` (entero) y `excluido` (booleano). El cliente no puede elegir esos valores.
- Para comparar se convierten las palabras a minúsculas y sin tildes. Se cuentan coincidencias de palabras completas y frases: cada positiva suma 1; cada negativa resta 2. Las positivas precedidas por `no`, `nada` o `poco` no suman. También se reconocen conectores sencillos, como «no es muy útil» y «no me gustó».
- Las listas están en `backend/config/comentarios.php`: `positivas`, `negativas`, `negaciones`, `conectores_negacion`, `prohibidas` y `patrones_spam`. Inicialmente las palabras de puntaje están en español; pueden ampliarse para otros idiomas. Es un filtro por palabras, no un análisis semántico.
- Las groserías, las frases de spam, los enlaces y los correos del listado de patrones excluyen la opinión, aunque tenga puntaje positivo. «PRUEBA DE COMENTARIO: ME GUSTO EL SISTEMA» queda excluido mediante `prueba de comentario`. La opinión se conserva para su autor, pero no se destaca.
- Son elegibles las opiniones con puntaje mayor que cero, al menos 30 caracteres después de sanitizar, creadas durante los últimos 30 días y no excluidas. Se conserva la restricción de autores estudiantes activos y la compatibilidad con autores históricos. Editar una opinión no reinicia su fecha de creación.
- Se eligen hasta seis, ordenadas por puntaje descendente, fecha de creación descendente y, si ambos coinciden, ID descendente.
- Si no queda ninguna opinión destacada, se muestran hasta seis opiniones reales existentes, ordenadas por fecha de creación e ID descendentes. En este respaldo no se exige puntaje positivo, longitud de 30 caracteres ni antigüedad máxima de 30 días. Se siguen excluyendo textos vacíos, fechas futuras, groserías, spam, el comentario de prueba y autores bloqueados. Si hay al menos una destacada, no se mezcla con opiniones de respaldo.
- `Cache::remember` guarda los identificadores elegidos durante siete días. El respaldo tiene su propia caché semanal. Los nuevos candidatos se incorporan al renovar la selección. Cada consulta comprueba que los elegidos sigan cumpliendo las condiciones correspondientes. Si desaparecen todos los destacados, se activa el respaldo; los espacios restantes se cubren con ejemplos.
- La respuesta contiene únicamente ID, nombre abreviado, texto, idioma y fecha de creación. No serializa las cuentas ni publica correo, cédula, puntaje o estado de exclusión. React renderiza el texto sin HTML.
- Se mantienen «Ejemplo 01» a «Ejemplo 04» como relleno, con el diseño actual. Siempre hay como máximo seis tarjetas; al haber seis opiniones reales no aparece ningún ejemplo. Sin opiniones reales aparecen las cuatro muestras existentes solicitadas.
- El formulario sigue aceptando opiniones de 20 a 500 caracteres; las de 20 a 29 caracteres pueden mostrarse como respaldo, pero no como destacadas por calidad.

## Actualizar Windows 11 con XAMPP

Se necesita PHP **8.4.1 o superior compatible con `composer.lock`**. Comprueba la versión de XAMPP; si incluye una anterior, usa el ejecutable PHP compatible que ya emplea el proyecto. La base continúa siendo **PostgreSQL**, no MariaDB de XAMPP. No cambies `.env` ni regeneres `APP_KEY`.

Respalda la base antes de migrar. Desde PowerShell:

```powershell
$proyecto = 'C:\PROYECTOS\Proyecto-Kichwa'
$php = 'C:\xampp\php\php.exe'
& $php --version
# Si ese PHP es antiguo, sustituye $php por la ruta a tu PHP compatible.
$phpArgs = @('-c', "$proyecto\php.ini", '-d', ('extension_dir=' + (Join-Path (Split-Path $php) 'ext')))
Set-Location "$proyecto\backend"
& $php @phpArgs artisan config:clear --no-interaction
& $php @phpArgs artisan migrate --no-interaction
& $php @phpArgs artisan comentarios:actualizar-destacados --no-interaction
& $php @phpArgs artisan schedule:list
Set-Location "$proyecto\frontend"
npm.cmd run typecheck
npm.cmd run build
```

Detente si un comando devuelve un error. No hace falta ejecutar `db:seed`: `comentarios:actualizar-destacados` recalcula todas las opiniones existentes en lotes y regenera exclusivamente la caché de destacados. Puede repetirse sin duplicar datos ni cambiar `created_at` o `updated_at`. Evita sobrescribir una edición concurrente comparando también el texto original al actualizar.

Si se modifican las listas, vuelve a ejecutar `config:clear` y `comentarios:actualizar-destacados`. Si producción usa `config:cache`, vuelve a generarla antes del comando. Reinicia los procesos de aplicación persistentes cuando actualices código o configuración.

## Programación automática

`backend/routes/console.php` programa `comentarios:actualizar-destacados` **cada lunes a las 03:00, hora de Ecuador (`America/Guayaquil`)**, con protección contra solapamientos. El comando recalcula los puntajes con las listas vigentes, limpia las claves `comentarios:destacados:v2` y `comentarios:destacados:respaldo:v2` y regenera la selección. No requiere que un administrador abra el panel.

En Windows, configura una tarea en el **Programador de tareas** que se repita cada minuto indefinidamente:

- Programa: la ruta absoluta al PHP compatible, por ejemplo `C:\xampp\php\php.exe` si cumple los requisitos.
- Argumentos: `-c "C:\PROYECTOS\Proyecto-Kichwa\php.ini" -d "extension_dir=C:\xampp\php\ext" "C:\PROYECTOS\Proyecto-Kichwa\backend\artisan" schedule:run --no-interaction` (ajusta `extension_dir` si usas otro PHP).
- Iniciar en: `C:\PROYECTOS\Proyecto-Kichwa\backend`.
- Ejecutar aunque el usuario no haya iniciado sesión. La cuenta de ejecución debe tener acceso a PostgreSQL y escritura en `backend/storage` y `backend/bootstrap/cache`.

Comprueba también `& $php --ini` y `& $php -m`: el `php.ini` predeterminado de ese ejecutable debe habilitar las extensiones del proyecto, en especial `pdo_pgsql`, `pgsql` y `mbstring`. El scheduler inicia el comando semanal en otro proceso PHP; ese proceso usa la configuración predeterminada y no hereda las opciones `-c` y `-d` de la llamada inicial.

Para desarrollo puedes mantener abierta una terminal con `& $php @phpArgs artisan schedule:work` desde `backend`. No ejecutes simultáneamente este proceso y una tarea del sistema para el mismo entorno.

El despliegue incluido en `compose.production.yml` ya incorpora un servicio `scheduler` que ejecuta `schedule:work`, comparte la caché con la API y espera al arranque saludable de la aplicación. El entrypoint de `app` recalcula las opiniones y prepara la selección al desplegar. Si utilizas ese Compose en Dokploy, no necesitas configurar un cron adicional.

En producción Linux **sin el Compose del proyecto**, se necesita una entrada cron que invoque `schedule:run` **cada minuto** con el PHP y la ruta reales del servidor:

```cron
* * * * * cd /ruta/Proyecto-Kichwa/backend && /usr/bin/php artisan schedule:run >> /ruta/Proyecto-Kichwa/backend/storage/logs/scheduler.log 2>&1
```

En producción usa caché persistente (`file`, `database` o `redis`), compartida entre el scheduler y la API; `array` y `null` no conservan la selección entre solicitudes. El TTL también permite renovar al consultar después de siete días, pero no sustituye la tarea semanal para recalcular todas las opiniones.

La programación sigue el [scheduler de Laravel](https://laravel.com/framework/docs/13.x/scheduling) y la duración usa [la caché de Laravel](https://laravel.com/framework/docs/13.x/cache).

## Verificación

Desde `backend`, usando las variables PHP anteriores:

```powershell
& $php @phpArgs artisan test --compact tests/Feature/ComentariosDestacadosTest.php tests/Feature/TestimonialApiTest.php
& $php @phpArgs artisan route:list --path=api/comentarios/destacados
```

Las pruebas requieren la base separada de `.env.testing`, con nombre terminado en `_test`. Desde `frontend`: `npm.cmd test`.
