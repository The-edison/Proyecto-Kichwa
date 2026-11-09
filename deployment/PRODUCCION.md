# Publicar Yachay en Dokploy

Destino: **https://yachay-kichwa.devs-ueb.tech**. El panel de la captura corresponde a Dokploy. Se utiliza un servicio **Docker Compose**, con `app` (Apache, PHP 8.4, Laravel y React compilado) y `db` (PostgreSQL 16). Dokploy termina HTTPS y envía las peticiones al puerto **80** del servicio `app`.

La misma dirección sirve la web, `/api`, `/sanctum`, Google y los enlaces de verificación. PostgreSQL no publica un puerto al exterior. Las imágenes y audios subidos se guardan en un volumen persistente.

## Qué se transfiere

- Todos los administradores actuales de `usuarios`, con su contraseña cifrada, correo, estado y configuración. Conservan su contraseña de acceso actual.
- Niveles, módulos, unidades, temas, actividades, evaluaciones, preguntas y el diccionario completo. Incluye contenido creado manualmente, borradores y versiones conservadas.
- Catálogo histórico de contenido y roles; las cuentas antiguas de la tabla `users` no son cuentas activas de la aplicación y se excluyen.
- Imágenes y audios del catálogo de archivos del administrador; avatares antiguos solo si pertenecen a administradores exportados. Los recursos del frontend viajan con el código.

Se excluyen estudiantes, contraseñas de estudiantes, avatares de estudiantes, inscripciones, respuestas, intentos, progreso, recompensas, opiniones de estudiantes, sesiones, tokens, solicitudes de recuperación de contraseñas, colas y cachés. Se anula `remember_token` de los administradores. La exportación solo lee la base local; no elimina estudiantes en tu computadora.

Los ZIP incluyen hashes de contraseñas de administradores: son archivos privados. `.production-transfer/` queda excluido de Git y del contexto Docker. No lo publiques como archivo descargable.

## 1. Comprobar los accesos y el dominio

Necesitas acceso al proyecto de Dokploy, capacidad para desplegar Compose y acceso al repositorio. Para transferir los datos puedes usar SSH (paso 5) o el paquete cifrado y la terminal del contenedor de Dokploy (paso 5A), sin acceso SSH al servidor.

En DNS, el registro **A** de `yachay-kichwa.devs-ueb.tech` debe apuntar a la IP pública del servidor donde se despliega Dokploy. Si existe un registro AAAA, también debe llegar a ese servidor. Comprueba desde PowerShell:

```powershell
Resolve-DnsName yachay-kichwa.devs-ueb.tech
```

Los puertos 80 y 443 del servidor deben llegar a Traefik/Dokploy para la web y el certificado. No necesitas abrir 5432. La dirección del panel `server.devs-ueb.tech` es distinta del dominio de la aplicación.

## 2. Preparar el paquete y las claves en tu computadora

Desde la raíz del proyecto, en PowerShell:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File deployment/preparar-produccion.ps1
```

Este comando crea un ZIP con fecha y su SHA-256 en `.production-transfer/`. También crea `.production-transfer/dokploy.env` con una **APP_KEY nueva para producción** y una contraseña aleatoria para PostgreSQL. Si ese archivo ya existe conserva sus claves. Usa el ZIP más reciente, generado después del último cambio de contenido local. El paquete `yachay-production.zip` creado durante la preparación inicial también sirve mientras no cambie el contenido.

Guarda `dokploy.env` en un lugar privado. **No regeneres APP_KEY ni cambies DB_PASSWORD después del primer despliegue**: una nueva clave invalida sesiones y datos cifrados; cambiar solo la variable de PostgreSQL no cambia la contraseña de una base ya inicializada.

Revisa que tus administradores tengan contraseñas propias fuertes y correos reales antes de abrir el servicio al público. Si cambias la contraseña o el contenido local, vuelve a exportar. La transferencia conserva los administradores existentes y no ejecuta el seeder de credenciales.

## 3. Subir los archivos de código al repositorio

Dokploy debe recibir también los archivos nuevos preparados en esta tarea. Revisa los cambios:

```powershell
git status --short
git diff
```

Si todo corresponde a esta preparación, registra los archivos indicados y súbelos:

```powershell
git add .gitignore .gitattributes .dockerignore Dockerfile compose.production.yml deployment README.md backend/composer.lock backend/config/trustedproxy.php backend/app/Services/ProductionTransfer.php backend/app/Console/Commands/ExportProduction.php backend/app/Console/Commands/EncryptProduction.php backend/app/Console/Commands/ImportProduction.php backend/tests/Feature/ProductionTransferTest.php
git commit -m "Prepara despliegue en Dokploy y transferencia sin estudiantes"
git push origin main
```

No agregues los ZIP, `.env`, `dokploy.env`, `vendor`, `node_modules`, bases completas ni logs. `deployment/initial-content.enc` es el paquete cifrado con la clave de producción: puede acompañar al código, sin incluir la clave. El Dockerfile instala dependencias con los lockfiles, compila React y coloca ese archivo cifrado fuera del directorio público. No hay que subir `frontend/dist`.

## 4. Crear el servicio en el panel de la captura

1. Abre tu proyecto **Punina-Aucatoma**, entorno **production**.
2. Pulsa **Create Service** y elige **Docker Compose / Compose**. Nombre sugerido: `yachay-kichwa`.
3. En el proveedor de código, conecta GitHub o el proveedor Git disponible. Usa `https://github.com/The-edison/Proyecto-Kichwa.git`, rama `main`. Para un repositorio privado debes autorizar su lectura en Dokploy.
4. Establece **Compose Path** en `./compose.production.yml`, con la raíz del repositorio como contexto. No elijas un servicio Application/Nixpacks para este procedimiento.
5. En **Environment**, pega el contenido de tu archivo privado `.production-transfer/dokploy.env` y guarda.
6. En **Domains → Add Domain**, selecciona servicio **`app`**, host **`yachay-kichwa.devs-ueb.tech`**, puerto del contenedor **`80`**, ruta **`/`**. Activa **HTTPS / Let's Encrypt**. No agregues `/api` al dominio ni publiques un dominio para `db`.
7. Guarda y pulsa **Deploy**. Los dominios de Compose requieren volver a desplegar después de cambiarlos. Dokploy añade las etiquetas de Traefik y la conexión de red al servicio seleccionado; no añadas puertos públicos manualmente.

Consulta oficial: [dominios de Docker Compose en Dokploy](https://docs.dokploy.com/docs/core/docker-compose/domains).

La primera compilación descarga PHP, Node, Composer, PostgreSQL y dependencias; puede tardar varios minutos. El arranque espera que PostgreSQL esté disponible, aplica las migraciones y prepara cachés. **No ejecuta `db:seed`**: la fuente del contenido será el ZIP de tu base real.

Comprueba que ambos contenedores estén activos y que `/up` responda. Antes de importar es normal que falten contenido y usuarios. Haz la importación antes de permitir registros públicos. Si alguien registra una cuenta antes, el importador rechazará la base para protegerla.

## 5. Copiar el ZIP privado e importar una sola vez

Sustituye `USUARIO_SSH`, `IP_SERVIDOR` y el nombre del ZIP por los valores reales. Desde **tu computadora**:

```powershell
scp .production-transfer/yachay-production.zip USUARIO_SSH@IP_SERVIDOR:~/yachay-production.zip
ssh USUARIO_SSH@IP_SERVIDOR
```

Si usas un paquete con fecha, cambia también su nombre en `scp`. Para un puerto SSH distinto usa `scp -P PUERTO` y `ssh -p PUERTO`.

Los siguientes comandos se ejecutan **en el servidor Linux**, no en PowerShell local:

```bash
sudo docker ps --format 'table {{.ID}}\t{{.Names}}\t{{.Image}}'
```

Identifica el contenedor **app de este servicio** por el nombre de Dokploy. Copia su ID en la siguiente variable; no selecciones el contenedor de PostgreSQL ni el de otro proyecto:

```bash
YACHAY_APP=ID_REAL_DEL_CONTENEDOR_APP
chmod 600 "$HOME/yachay-production.zip"
sudo docker exec "$YACHAY_APP" php artisan down --retry=60
sudo docker cp "$HOME/yachay-production.zip" "$YACHAY_APP":/tmp/yachay-production.zip
sudo docker exec "$YACHAY_APP" chown www-data:www-data /tmp/yachay-production.zip
sudo docker exec --user www-data "$YACHAY_APP" php artisan yachay:import-production /tmp/yachay-production.zip --confirm-new-database --no-interaction
```

La importación comprueba que coincidan las migraciones y que no existan usuarios, estudiantes ni contenido previo. Conserva los IDs, ajusta las secuencias y copia los multimedia al volumen persistente. Se ejecuta como `www-data` para que el panel pueda seguir subiendo archivos después del traslado. Las tablas se importan en una transacción, con sus restricciones activas. Si hay un error de base de datos revierte las filas; un fallo de archivos puede dejar copias multimedia, y permite reintentar tras corregir el almacenamiento.

Si termina correctamente, compara las cantidades mostradas con las de la exportación y ejecuta:

```bash
sudo docker exec "$YACHAY_APP" php artisan up
sudo docker exec "$YACHAY_APP" rm -f /tmp/yachay-production.zip
rm -f "$HOME/yachay-production.zip"
```

Si falla, revisa el error y los logs del contenedor; no uses `migrate:fresh`, `db:wipe` ni elimines volúmenes. Para una primera importación fallida se puede corregir la causa y reintentar cuando la base continúe vacía. No vuelvas a importar sobre una aplicación que ya está en uso.

## 5A. Importar sin SSH, usando el paquete cifrado

Esta alternativa sirve cuando solo dispones de la terminal del contenedor en Dokploy. El paquete `deployment/initial-content.enc` se preparó con el cifrado autenticado de Laravel y la APP_KEY de `.production-transfer/dokploy.env`. El código y la imagen solo contienen el paquete cifrado; la clave permanece en el archivo privado y en Environment de Dokploy. No agregues esa clave a Git ni al Dockerfile.

El comando usado para prepararlo en tu computadora, desde `backend`, es:

```powershell
php artisan yachay:encrypt-production ../.production-transfer/yachay-production.zip ../deployment/initial-content.enc ../.production-transfer/dokploy.env --no-interaction
```

El comando rechaza sobrescribir un destino existente. Ya está ejecutado para el paquete inicial; no es necesario repetirlo. Para un traslado posterior con otro contenido, conserva una copia del archivo cifrado anterior antes de crear su reemplazo. Nunca uses este proceso para sobrescribir una instalación en uso.

Sube el paquete cifrado y los cambios de código con Git y vuelve a desplegar el mismo servicio. Mantén **la misma APP_KEY** que pegaste anteriormente en Dokploy; de lo contrario no se podrá abrir el paquete.

Cuando `app` esté saludable, abre **Containers → fila app → … → Terminal**. En esa terminal Linux, ejecuta:

```bash
cd /var/www/backend
php artisan down --retry=60
php artisan yachay:import-production /var/www/production-transfer/initial-content.enc --encrypted --confirm-new-database --no-interaction
```

Comprueba que la importación terminó correctamente y mostró las cantidades esperadas. El ZIP descifrado se crea temporalmente en el almacenamiento privado y se elimina al terminar, también si la importación falla. Una clave incorrecta o un paquete alterado se rechazan antes de importar datos.

**Solo si la importación terminó correctamente**, ejecuta:

```bash
chown -R www-data:www-data storage/app/public storage/app/private
php artisan up
```

El ajuste de permisos permite que Apache siga subiendo y administrando multimedia cuando la terminal utiliza `root`. Si la terminal indica permisos insuficientes, pide al administrador del panel que ejecute el ajuste; no cambies los permisos a `777`. Si falla la importación, conserva la web en mantenimiento y revisa el error antes de continuar. No ejecutes además la importación por SSH: ambas alternativas cargan el mismo contenido y se realiza solo una.

## 6. Configurar correo y Google

La plantilla usa `MAIL_MAILER=log`: permite arrancar, pero **no entrega correos**. Para recuperación de contraseñas y verificación real, cambia en Environment:

```dotenv
MAIL_MAILER=smtp
MAIL_SCHEME=smtp
MAIL_HOST=HOST_DEL_PROVEEDOR
MAIL_PORT=587
MAIL_USERNAME=USUARIO_DEL_PROVEEDOR
MAIL_PASSWORD=CLAVE_DEL_PROVEEDOR
MAIL_FROM_ADDRESS=CORREO_REMITENTE_AUTORIZADO
```

Usa los valores del proveedor. Si exige TLS implícito, normalmente será `MAIL_SCHEME=smtps` y puerto `465`. Guarda y vuelve a desplegar. Configura SPF/DKIM según ese proveedor y comprueba la recepción de un correo real; un contenedor sano no demuestra entrega de correo.

Para Google, configura `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en Environment. En Google Cloud, registra como origen JavaScript `https://yachay-kichwa.devs-ueb.tech` y como URI de redirección exacta:

```text
https://yachay-kichwa.devs-ueb.tech/auth/google/callback
```

Comprueba también la publicación o usuarios de prueba de la pantalla de consentimiento. Las claves de Google y SMTP van en Dokploy, nunca en variables `VITE_*`. Completa las variables `YACHAY_PRIVACY_*` con los datos reales del responsable que se muestran en la política de privacidad.

## 7. Comprobar antes de compartir el enlace

1. Abre `https://yachay-kichwa.devs-ueb.tech/up`: debe responder sin errores.
2. Abre el inicio y recarga una ruta interna, por ejemplo `/iniciar-sesion`: no debe devolver 404.
3. Inicia sesión con un administrador importado y su contraseña actual. Comprueba diccionario, módulos, unidades y evaluaciones. Antes de registrar usuarios, la lista de estudiantes debe estar vacía.
4. Reproduce audios y abre imágenes de las lecciones; prueba también un archivo cargado desde el administrador.
5. Registra una cuenta nueva de prueba y completa una actividad, una evaluación y un cierre de sesión. Verifica que se guardan los resultados y que las cookies funcionan por HTTPS.
6. Comprueba recuperación de contraseña, verificación y Google si están habilitados.
7. Vuelve a desplegar y confirma que se conservan usuarios nuevos, diccionario y multimedia. Los tres volúmenes deben permanecer asociados al mismo servicio Compose.

## 8. Actualizaciones y copias de seguridad

Para actualizaciones del código, sube los commits a la misma rama y pulsa **Deploy** en el mismo servicio. El arranque aplica migraciones pendientes. Conserva las variables y los volúmenes. **No vuelvas a cargar el ZIP inicial ni ejecutes seeders para actualizar contenido administrado en producción.**

Los volúmenes son `postgres_data` (base), `media` (multimedia) y `app_private` (almacenamiento privado). Dokploy añade su prefijo de proyecto: conserva el mismo servicio, nombre de proyecto y montajes. No uses `docker compose down -v`. Los archivos de código y cachés se reconstruyen al desplegar.

Programa copias periódicas de PostgreSQL y del volumen multimedia, guarda una copia privada de APP_KEY y prueba la restauración. Para una copia manual de PostgreSQL, identifica el contenedor `db` de este servicio con `docker ps` y ejecuta en el servidor:

```bash
YACHAY_DB=ID_REAL_DEL_CONTENEDOR_DB
sudo docker exec "$YACHAY_DB" sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > yachay-backup.dump
```

Una copia posterior a la publicación sí contendrá a los estudiantes nuevos: es privada. El exportador sin estudiantes sirve para el traslado inicial de contenido, no sustituye un respaldo completo de producción. Antes de actualizar, respalda también los multimedia y las variables privadas.

## Alcance de la preparación

Se prueban la exportación/importación con PostgreSQL, exclusión de estudiantes, contraseña del administrador, secuencias, multimedia, reversión ante errores y protección de una base existente. La configuración Compose y la compilación para el dominio se validan localmente. Se aplicaron cuatro parches Symfony compatibles; las auditorías de dependencias de producción de Composer y npm no reportaron vulnerabilidades conocidas en la preparación. La construcción y el arranque completos del contenedor requieren Docker activo; el equipo de preparación no tenía el motor Docker disponible. DNS, certificado, recursos del servidor, SMTP y OAuth se verifican al desplegar con tus accesos reales.

Referencia de configuración: [despliegue Laravel](https://laravel.com/framework/docs/deployment) y [proxies de confianza](https://laravel.com/framework/docs/requests#configuring-trusted-proxies).
