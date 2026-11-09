# Yachay · Plataforma de aprendizaje de Kichwa

Aplicación con paneles de estudiante y administrador, diccionario Kichwa–español, actividades, evaluaciones, progreso, XP e insignias. Interfaz adaptable a computadora, tablet y móvil, con temas claro y oscuro y preferencia guardada por navegador.

Esta guía permite **clonar y ejecutar el sistema en otra computadora sin copiar las credenciales ni la base de datos del equipo original**. Backend y frontend se ejecutan como servicios separados.

## Índice

- [Requisitos](#requisitos)
- [Clonar](#1-clonar-y-preparar-los-archivos)
- [PostgreSQL](#2-crear-las-bases-de-postgresql)
- [Configuración](#3-configurar-las-variables)
- [Backend](#4-instalar-el-backend)
- [Frontend](#5-instalar-el-frontend)
- [Arranque](#6-ejecutar-el-sistema)
- [Comprobación inicial](#7-comprobar-que-funciona)
- [Contenido y roles](#contenido-inicial-y-roles)
- [Correo y Google](#correo-y-google)
- [Pruebas](#pruebas)
- [Actualizaciones](#actualizar-una-instalación-existente)
- [Problemas frecuentes](#solución-de-problemas)
- [Estructura y producción](#estructura-y-producción)

## Requisitos

| Herramienta | Requisito | Comprobación |
| --- | --- | --- |
| Git | Disponible en la terminal | `git --version` |
| PHP | **8.4.1 o superior compatible con el lockfile**; verificado con PHP 8.4 | `php --version` |
| Composer | Composer 2 | `composer --version` |
| Node.js y npm | **Node.js 24** para ejecutar también las pruebas del frontend | `node --version`, `npm --version` |
| PostgreSQL | **16 o superior**, activo, bases UTF-8 | `psql --version` |
| Navegador | Actualizado, JavaScript, cookies y almacenamiento habilitados | Chrome, Firefox o Edge |

PHP necesita `pdo_pgsql`, `pgsql`, `mbstring`, `openssl`, `fileinfo`, `curl`, `intl` y **GD con soporte PNG/WebP**. Composer/PHPUnit también requieren extensiones estándar como DOM/XML/XMLWriter, tokenizer y ctype. ZIP facilita instalar dependencias. El lockfile determina los requisitos completos; compruébalos con `composer check-platform-reqs` después de instalar.

```shell
php --ini
php -m
php -r "echo function_exists('imagewebp') ? 'WebP disponible' : 'Falta GD/WebP';"
```

En Windows agrega los ejecutables al `PATH` y abre una terminal nueva. `psql` y `pg_dump` están en la carpeta `bin` de PostgreSQL si no aparecen en el `PATH`; también puedes usar pgAdmin. Habilita las extensiones en el `php.ini` mostrado por `php --ini` para que **Composer y los comandos manuales usen el mismo PHP**.

El `php.ini` de la raíz configura el lanzador local de Windows; no reemplaza automáticamente el del sistema. El lanzador busca las DLL en la carpeta `ext` junto a `php.exe`. En Linux/macOS configura las extensiones de tu distribución; no uses DLL ni el lanzador de Windows.

Necesitas Internet para clonar e instalar dependencias. DNS, comprobación de contraseñas comprometidas, SMTP y Google pueden requerir conectividad adicional. Con las plantillas locales no necesitas Redis ni un trabajador de colas: se utiliza caché de archivos y cola síncrona.

## 1. Clonar y preparar los archivos

Desde la carpeta donde quieras trabajar:

```shell
git clone https://github.com/The-edison/Proyecto-Kichwa.git
cd Proyecto-Kichwa
```

El repositorio incluye `composer.lock` y `package-lock.json`. Instala con `composer install` y `npm ci`; no necesitas actualizar dependencias para arrancar.

Desde la raíz, en **PowerShell**:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item backend/.env.testing.example backend/.env.testing
Copy-Item frontend/.env.example frontend/.env
```

En **Linux/macOS**:

```bash
cp backend/.env.example backend/.env
cp backend/.env.testing.example backend/.env.testing
cp frontend/.env.example frontend/.env
```

Copia las plantillas solo en una instalación nueva. Los `.env` son privados, están excluidos de Git y no deben sobrescribirse en una instalación existente.

## 2. Crear las bases de PostgreSQL

Inicia PostgreSQL y confirma el puerto. Normalmente es `5432`; **las plantillas usan `5433`**, así que ajústalas a tu equipo.

Conéctate como administrador desde pgAdmin o `psql`; ejemplo para el puerto `5432`:

```shell
psql -h 127.0.0.1 -p 5432 -U postgres -d postgres
```

Sustituye la contraseña del ejemplo y ejecuta cada instrucción SQL fuera de una transacción:

```sql
CREATE ROLE yachay_app WITH LOGIN PASSWORD 'REEMPLAZAR_POR_UNA_CLAVE_PROPIA';
CREATE DATABASE yachay_kichwa OWNER yachay_app ENCODING 'UTF8';
CREATE DATABASE yachay_kichwa_test OWNER yachay_app ENCODING 'UTF8';
```

Si ya existen, utiliza tus bases preparadas o elige otros nombres y cambia la configuración. La base exclusiva de pruebas debe terminar en **`_test`**. El usuario de migraciones debe poder crear tablas, funciones, triggers, vistas e índices en sus bases. Las migraciones instalan `pg_trgm`; si tu servidor lo restringe, conecta como administrador a **cada base** y ejecuta:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

**No importes** `backend/database/schema/postgresql.sql` ni los SQL de `documentacion-base`: son referencias históricas. Las migraciones Laravel construyen el esquema vigente. SQLite y MySQL no están soportados.

## 3. Configurar las variables

Edita `backend/.env`. Con el usuario y puerto del ejemplo:

```dotenv
APP_NAME=Yachay
APP_ENV=local
APP_KEY=
APP_DEBUG=false
APP_URL=http://127.0.0.1:8000
FRONTEND_URL=http://127.0.0.1:5173
SANCTUM_STATEFUL_DOMAINS=127.0.0.1:5173
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=yachay_kichwa
DB_USERNAME=yachay_app
DB_PASSWORD="REEMPLAZAR_POR_UNA_CLAVE_PROPIA"
KICHWA_ADMIN_NOMBRE="Administrador Yachay"
KICHWA_ADMIN_EMAIL=admin@yachay.test
KICHWA_ADMIN_PASSWORD="REEMPLAZAR_POR_UNA_CLAVE_INICIAL_PROPIA"
```

El administrador inicial necesita una contraseña de al menos 12 caracteres y máximo 72 bytes. Utiliza mayúsculas, minúsculas, números y símbolos para cumplir también el formulario de cambio. Si dejas `KICHWA_ADMIN_PASSWORD` vacío, **solo en local/testing** se usa `YachayLocal#2026`; configura una propia antes de cargar los datos. En producción se rechazan esa clave local y correos terminados en `.test`.

Mantén las demás variables de la plantilla:

| Variable | Uso |
| --- | --- |
| `APP_KEY` | Clave propia generada por Artisan; no se copia del autor ni se regenera en una instalación en uso. |
| `APP_URL` / `FRONTEND_URL` | URLs exactas de API y frontend, enlaces y CORS. |
| `SANCTUM_STATEFUL_DOMAINS` | Host y puerto del frontend, sin `http://`. |
| `SESSION_DRIVER=database` | Sesiones almacenadas en PostgreSQL. |
| `SESSION_LIFETIME=30` | Duración de sesión; el frontend también cierra por inactividad. |
| `SESSION_SECURE_COOKIE=false` | HTTP local; utiliza `true` con HTTPS en producción. |
| `CACHE_STORE=file` / `QUEUE_CONNECTION=sync` | Caché y cola locales, sin servicios adicionales. |
| `MAIL_MAILER=log` | Mensajes en logs; no envía correo real. |
| `KICHWA_CHECK_EMAIL_DNS` | Comprueba el dominio del correo durante el registro. |
| `KICHWA_CHECK_BREACHED_PASSWORDS` | Comprueba contraseñas comprometidas. |
| `KICHWA_PUBLIC_STORAGE_ROOT` | Opcional: ruta absoluta de almacenamiento público persistente. Sin definir usa `backend/storage/app/public`. |

Edita `backend/.env.testing`: mismo host, puerto, usuario y contraseña, pero **`DB_DATABASE=yachay_kichwa_test` y `APP_ENV=testing`**. Conserva caché, sesiones y correo de esa plantilla. Su `APP_KEY` se completa después.

Edita `frontend/.env`:

```dotenv
VITE_API_URL=http://127.0.0.1:8000
```

Las variables `VITE_*` llegan al navegador: nunca coloques allí contraseñas de PostgreSQL o secretos de Google. Usa **`127.0.0.1` en ambos servicios**. Si cambias host/puertos, ajusta URLs, CORS, Sanctum, callback de Google y arranque juntos. Reinicia Vite al cambiar su `.env`.

## 4. Instalar el backend

Desde la raíz:

```shell
cd backend
composer install
composer check-platform-reqs
php artisan key:generate
php artisan config:clear
php artisan migrate --no-interaction
php artisan migrate:status
php artisan db:seed --no-interaction
php artisan storage:link
```

Antes de las pruebas, copia **solo el valor de `APP_KEY`** generado en `.env` al campo `APP_KEY` de `.env.testing`. No copies el archivo entero: apuntaría las pruebas a la base de trabajo.

`db:seed` crea Básico e Intermedio, el administrador y la **Unidad 1 «Conociendo el Kichwa»**, con ilustraciones, siete actividades y una prueba de seis preguntas. Requiere GD/WebP y escritura en almacenamiento. Repetirlo no duplica ese material ni cambia la contraseña de un administrador existente.

`backend/storage` y `backend/bootstrap/cache` deben permitir escritura al usuario de PHP. `storage:link` enlaza los archivos públicos. Las tres ilustraciones fuente se incluyen en Git y el seeder genera sus copias WebP. En Windows, si falla el enlace, habilita el modo de desarrollador o ejecuta únicamente ese comando con permisos de enlaces simbólicos.

No uses `migrate:fresh`, `db:wipe` ni SQL de desinstalación sobre la base de trabajo: borrarían cuentas y resultados. Para instalar o actualizar basta con `migrate`.

## 5. Instalar el frontend

Desde `backend`:

```shell
cd ../frontend
npm ci
npm run typecheck
npm run build
cd ..
```

En PowerShell usa `npm.cmd` si se bloquea `npm.ps1`. La compilación genera `frontend/dist`; para desarrollo se usa Vite como se indica a continuación.

## 6. Ejecutar el sistema

PostgreSQL debe permanecer activo. Elige una de estas formas; no inicies dos copias en los mismos puertos.

### Windows: lanzador incluido

Desde la raíz, en PowerShell:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./iniciar.ps1
```

El lanzador usa PHP del `PATH` con el `php.ini` de la raíz, limpia configuración, aplica migraciones, ejecuta la semilla y comprueba el enlace de almacenamiento. Arranca backend y Vite en segundo plano y guarda logs en `backend/storage/logs`. **No instala ni inicia PostgreSQL ni crea sus bases**.

Para reiniciar los procesos locales de este proyecto:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./iniciar.ps1 -Reiniciar
```

Solo detiene procesos PHP/Node de este proyecto en los puertos previstos. El parámetro histórico `-PostgreSQL` se acepta, pero no arranca ni modifica ese servicio.

### Inicio manual: Windows, Linux y macOS

Abre dos terminales en la raíz, con el PHP del sistema correctamente configurado.

Terminal 1:

```shell
cd backend
php artisan serve --host=127.0.0.1 --port=8000
```

Terminal 2:

```shell
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Mantén las terminales abiertas; `Ctrl+C` detiene cada servidor manual. Abre **http://127.0.0.1:5173**. La API escucha en **http://127.0.0.1:8000** y no sirve React desde su raíz. No abras `frontend/index.html` directamente como archivo.

## 7. Comprobar que funciona

1. Abre el inicio y cambia el tema. Debe persistir al recargar; la primera visita usa la preferencia del sistema.
2. Accede con los valores `KICHWA_ADMIN_EMAIL` y `KICHWA_ADMIN_PASSWORD` que configuraste; el correo de plantilla es `admin@yachay.test`.
3. Completa el cambio obligatorio de contraseña inicial en **Mi cuenta**. El seeder no vuelve a restablecerla.
4. En **Contenidos y actividades**, abre Básico → Primeros contactos con el Kichwa → Conociendo el Kichwa. Debe haber siete actividades, imágenes y una prueba de seis preguntas.
5. Registra un estudiante con correo válido y contraseña de al menos 12 caracteres que cumpla los requisitos. El registro siempre asigna el rol estudiante.
6. Completa las siete actividades de la Unidad 1 como estudiante. La prueba se habilita al acertarlas; requiere cinco aciertos para aprobar.
7. Como administrador, busca esa cuenta en **Estudiantes** y abre **Ver progreso** para consultar XP, logros y resultados.

La sesión es **independiente por pestaña**. Abrir/copiar una URL en una pestaña nueva requiere autenticarse allí; duplicar una pestaña tampoco comparte la autenticación. Puedes mantener una pestaña de administrador y otra de estudiante. Cambiar/recuperar una contraseña revoca accesos anteriores y exige volver a entrar en las demás pestañas.

## Contenido inicial y roles

| Rol | Opciones |
| --- | --- |
| Administrador | Resumen, niveles/módulos/unidades/temas, actividades, evaluaciones/preguntas, diccionario/CSV, estudiantes/resultados, bloqueo/activación, Mi cuenta. |
| Estudiante | Mi aprendizaje, recorridos publicados, actividades/evaluaciones, Mi progreso, diccionario y Mi cuenta. |

Una instalación nueva incluye **la Unidad 1 del seeder**, no toda la base local del autor. No incluye estudiantes, resultados personales, los tres módulos DEMO eliminados ni todo el contenido creado manualmente en otro equipo. Los IDs pueden variar; navega por títulos.

El diccionario puede empezar vacío. Desde administración carga términos o importa **CSV UTF-8** con encabezados `kichwa,español`; el ID es automático. No se incluye un volcado privado de usuarios ni diccionario.

Los módulos, unidades y temas nuevos nacen en borrador. Publica sus padres y revisa recursos y soluciones para habilitar el recorrido. Intermedio se ofrece cuando tiene contenido publicado; mientras tanto aparece como próximo. Para cambiar contenido protegido por historial usa **Crear nueva versión**.

Los editores admiten selección múltiple, completar, relacionar, arrastrar y ordenar según el contrato del ejercicio, con imágenes/audio cuando corresponde. La Unidad 1 usa secuencia guiada y banco final independiente. El material adicional y las equivalencias en revisión necesitan validación docente.

`DemostracionSeeder` es opcional para una base técnica aislada local/testing; **no se ejecuta por defecto ni es necesario para instalar**. Tampoco ejecutes por separado los seeders antiguos o de verificación de la Unidad 1: `DatabaseSeeder` carga la versión definitiva.

## Correo y Google

### Recuperación y verificación de correo

Con `MAIL_MAILER=log`, los mensajes y enlaces aparecen en `backend/storage/logs/laravel.log`; no llegan al buzón. Puedes usarlos en desarrollo, pero no publiques esos logs o enlaces.

Para correo real configura el proveedor SMTP en `backend/.env`:

```dotenv
MAIL_MAILER=smtp
MAIL_HOST=smtp.tu-proveedor.com
MAIL_PORT=587
MAIL_SCHEME=smtp
MAIL_TIMEOUT=15
MAIL_USERNAME="TU_USUARIO_SMTP"
MAIL_PASSWORD="TU_SECRETO_SMTP"
MAIL_FROM_ADDRESS="administracion@tu-dominio.com"
MAIL_FROM_NAME="Yachay"
```

El puerto y `MAIL_SCHEME` deben coincidir con el proveedor; utiliza un remitente autorizado. Ejecuta `php artisan config:clear` en `backend` y reinicia el servidor. Las URLs de backend/frontend deben ser correctas para los enlaces.

En **Iniciar sesión → Recuperar contraseña**, escribe el correo registrado. El mensaje se envía en español y enlaza al frontend; vence a los 60 minutos y se puede usar una sola vez. La contraseña nueva debe cumplir los mismos requisitos del registro. Al cambiarla se revocan las sesiones y tokens anteriores. Una cuenta bloqueada no puede recuperar acceso mediante este flujo. La respuesta inicial no revela si un correo está registrado.

Para Gmail, habilita la verificación en dos pasos y genera una **contraseña de aplicación** para Yachay, si tu cuenta permite esta opción. Usa `MAIL_HOST=smtp.gmail.com`, `MAIL_PORT=465`, `MAIL_SCHEME=smtps`, tu dirección completa en `MAIL_USERNAME` y `MAIL_FROM_ADDRESS`, y la contraseña de aplicación en `MAIL_PASSWORD`. No uses la contraseña habitual de Gmail. Si tu organización impide contraseñas de aplicación, utiliza su proveedor SMTP autorizado. Referencias: [contraseñas de aplicación](https://support.google.com/accounts/answer/185833?hl=es), [SMTP de Google](https://knowledge.workspace.google.com/admin/gmail/send-email-from-a-printer-scanner-or-app).

### Google, opcional

La autenticación local funciona sin Google. Para habilitarlo necesitas un proyecto propio en Google Cloud, consentimiento y un cliente OAuth de tipo **aplicación web**.

1. Configura el consentimiento y los usuarios de prueba si el proyecto está en pruebas.
2. Solicita los permisos de identidad `openid`, `email` y `profile`.
3. Autoriza exactamente el callback local `http://127.0.0.1:8000/auth/google/callback`.
4. Configura tus credenciales en `backend/.env`:

```dotenv
GOOGLE_CLIENT_ID="TU_CLIENT_ID"
GOOGLE_CLIENT_SECRET="TU_CLIENT_SECRET"
GOOGLE_REDIRECT_URI=http://127.0.0.1:8000/auth/google/callback
```

5. Limpia configuración, reinicia el backend y prueba el acceso.

En Google Cloud, configura **Google Auth Platform → Branding** con nombre Yachay y correo de soporte; en **Audience** selecciona el público adecuado y añade las cuentas de prueba si estás en modo Testing. En **Clients**, crea un cliente de tipo Web application y registra el callback anterior en **Authorized redirect URIs**, sin cambiar puerto, ruta ni host. Los únicos permisos de identidad que usa el sistema son `openid`, `email` y `profile`; no necesita acceso a Gmail ni a Drive. Guarda el ID y el secreto únicamente en `backend/.env`.

Socialite usa redirección de servidor. Si configuras orígenes JavaScript, el frontend es `http://127.0.0.1:5173`; los orígenes autorizados y el callback son ajustes distintos. En un despliegue utiliza las URLs HTTPS de ese entorno.

La cuenta local existente se vincula desde **Mi cuenta**, con sesión activa y el mismo correo verificado. No se vincula automáticamente ni se promueven roles. Sin credenciales, Google queda deshabilitado. Referencia: [OAuth para aplicaciones web de Google](https://developers.google.com/identity/protocols/oauth2/web-server).

Si PHP en Windows devuelve `cURL error 60` al conectarse con Google, configura un archivo PEM de autoridades de confianza. Puedes descargar [el paquete de Mozilla publicado por curl](https://curl.se/docs/caextract.html), verificar su SHA256 y guardarlo en `backend/storage/app/private/cacert.pem`. Define `GOOGLE_CA_BUNDLE` en `.env` con la ruta absoluta al archivo y limpia la configuración. El archivo local no se incluye en Git. En producción, deja esta variable vacía si el servidor ya dispone de un almacén de certificados válido; no copies la ruta de Windows. La verificación HTTPS permanece activa.

### Comprobación con tus servicios reales

1. Mantén `APP_URL=http://127.0.0.1:8000`, `FRONTEND_URL=http://127.0.0.1:5173` y `SANCTUM_STATEFUL_DOMAINS=127.0.0.1:5173` en local. Abre el frontend usando ese mismo host, sin alternarlo con `localhost`.
2. Después de configurar credenciales y correo, ejecuta `php artisan config:clear` desde `backend`, reinicia el backend y recarga el frontend. El botón Google se habilita cuando están configurados el ID y el secreto.
3. Prueba Google con una cuenta de prueba nueva: debe entrar al panel del estudiante. Cierra sesión y vuelve a entrar: no debe duplicar la cuenta. Prueba también cancelar el consentimiento. Si el correo ya tenía cuenta local, vincúlalo primero desde Mi cuenta.
4. Solicita recuperación para una cuenta tuya, comprueba la recepción real del mensaje, abre el enlace y cambia la contraseña. Verifica que entra la nueva, falla la anterior y el enlace usado no vuelve a funcionar.
5. En producción cambia las URLs y el callback a los dominios HTTPS reales, configura las cookies seguras y el remitente autorizado, y ajusta el público/estado de publicación en Google. Los enlaces locales solo funcionan en la computadora donde se ejecuta el proyecto.

Las pruebas automáticas simulan Google y el correo: no sustituyen la comprobación con tus credenciales y una bandeja real. No se puede garantizar la ausencia de fallos de un proveedor externo, pero los errores de autorización, enlaces vencidos y fallos de envío se manejan en la interfaz.

## Pruebas

Confirma que `.env.testing` usa la base exclusiva terminada en `_test`, sus credenciales y `APP_KEY`. Limpia configuración para no usar una conexión cacheada de trabajo.

```shell
cd backend
php artisan config:clear
php artisan migrate --env=testing --no-interaction
php artisan test --compact
cd ../frontend
npm run typecheck
npm test
npm run build
cd ..
```

Las pruebas PHP usan PostgreSQL, migraciones y transacciones y rechazan nombres sin sufijo `_test`; esa base es descartable y no debe contener datos reales. Las del frontend necesitan Node.js 24 e incluyen aislamiento de pestañas, API, búsqueda/paginación, editores, ejercicios y contraste de temas.

Para formatear PHP modificado, desde `backend`:

```shell
php vendor/bin/pint --dirty --format agent
```

## Actualizar una instalación existente

Respalda primero PostgreSQL y almacenamiento. Git no guarda usuarios, resultados ni archivos subidos. Ejemplo con tu puerto/usuario reales, guardando el archivo en una carpeta privada existente fuera del repositorio:

```shell
pg_dump -h 127.0.0.1 -p 5432 -U yachay_app -Fc -f /ruta/privada/yachay-before-update.dump yachay_kichwa
```

En Windows sustituye la ruta por una de tu equipo. Copia también `backend/storage/app/public` o `KICHWA_PUBLIC_STORAGE_ROOT`; guarda de forma privada la configuración necesaria para restaurar. No subas `.env`, logs ni respaldos a GitHub.

Con tus cambios locales guardados, desde la raíz:

```shell
git pull --ff-only
cd backend
composer install
php artisan config:clear
php artisan migrate --no-interaction
php artisan db:seed --no-interaction
cd ../frontend
npm ci
npm run typecheck
npm run build
cd ..
```

Reinicia servidores y recarga el navegador. Al aplicarse por primera vez, la semilla definitiva sustituye la publicación anterior de la Unidad 1 por la secuencia actual conservando historial. Consulta [la entrega de Unidad 1](documentacion/entrega-unidad-1.md) antes de actualizar una base con contenido previo. No regeneres `APP_KEY`, sobrescribas `.env` ni reinicies destructivamente la base.

## Solución de problemas

| Síntoma | Qué revisar |
| --- | --- |
| Ejecutable no reconocido | Instalación, `PATH` y terminal nueva; para PostgreSQL usa su carpeta `bin` o pgAdmin. |
| PowerShell bloquea npm | Usa `npm.cmd` en lugar de `npm`. |
| Composer informa requisitos incompatibles | Revisa PHP, `php --ini`, `php -m` y `composer check-platform-reqs`; no ocultes el problema con `--ignore-platform-reqs`. |
| `could not find driver` | Habilita `pdo_pgsql` en el PHP usado. |
| PostgreSQL no conecta | Servicio, puerto 5432/5433, usuario, contraseña, base y conexión con `psql`; limpia configuración. |
| No puede crear extensión | Instala `pg_trgm` como administrador en esa base y verifica permisos del esquema. |
| Falta clave de aplicación | En instalación nueva ejecuta `key:generate`; conserva la clave de una instalación ya usada. |
| No existe `imagewebp` / `imagecreatefrompng` | Habilita GD con WebP/PNG y vuelve a ejecutar la semilla. |
| Imágenes no cargan | Revisa fuentes en `resources/images/unidad1`, URLs, permisos, `storage:link` y almacenamiento persistente. |
| Puertos ocupados | Detén tu servidor anterior o cambia puertos y todas las URLs relacionadas. El lanzador usa 8000/5173. |
| CORS, 419, login o red | Mismo host, URLs, Sanctum, cookies y `VITE_API_URL`; limpia configuración y reinicia ambos servidores. |
| Nueva pestaña solicita acceso | Es el aislamiento previsto; inicia sesión allí. |
| Faltan unidades del equipo original | Solo la Unidad 1 se prepara con la semilla; administra el contenido adicional y publica sus padres. |
| Registro falla con correo de prueba o sin Internet | Usa un dominio válido. Solo en local sin red puedes desactivar `KICHWA_CHECK_EMAIL_DNS` y `KICHWA_CHECK_BREACHED_PASSWORDS`; limpia configuración. Mantén comprobaciones en producción. |
| No llega correo | `MAIL_MAILER=log` no envía; consulta logs o configura SMTP. |
| Google: `redirect_uri_mismatch` | Callback y `GOOGLE_REDIRECT_URI` deben coincidir exactamente en host, protocolo, puerto y ruta. |
| Pruebas rechazan la base | Corrige `.env.testing`, sufijo `_test` y caché; no elimines la protección ni uses la base real. |
| Cambios visuales no aparecen | Confirma la carpeta servida por Vite; para archivos compilados reconstruye/publica `dist` y recarga. |

Logs: `backend/storage/logs/laravel.log`; el lanzador añade `local-server.log`, `local-server-errors.log`, `vite.log` y `vite-errors.log`. Para React revisa consola y red del navegador. Puedes habilitar temporalmente `APP_DEBUG=true` **solo en local** y limpiar configuración para investigar.

## Estructura y producción

```text
Proyecto-Kichwa/
├── backend/                 API Laravel, modelos, servicios y pruebas PHP
│   ├── database/migrations/ Esquema vigente de PostgreSQL
│   ├── database/seeders/    Niveles, administrador y Unidad 1
│   ├── resources/images/   Ilustraciones fuente
│   ├── public/             Raíz web del backend
│   └── storage/            Archivos, logs y caché locales excluidos de Git
├── frontend/                React, TypeScript, Vite y estilos de tema
│   ├── src/                Componentes y páginas de ambos roles
│   └── tests/              Pruebas del frontend
├── documentacion/           Contratos, decisiones y entregas
├── documentacion-base/      Referencias históricas del modelo
├── iniciar.ps1              Lanzador local de Windows
└── php.ini                  Configuración PHP del lanzador
```

El lanzador, `artisan serve` y Vite de desarrollo son para uso local. En producción sirve Laravel desde **`backend/public`** y el frontend compilado desde **`frontend/dist`**, con fallback a `index.html` para rutas React Router. Compila con el `VITE_API_URL` definitivo. Configura HTTPS, `APP_ENV=production`, `APP_DEBUG=false`, URLs/CORS/cookies, administrador propio, SMTP/Google del entorno y almacenamiento persistente con respaldos. No expongas `.env`, `vendor`, logs ni respaldos como archivos públicos.

Documentación adicional:

- [Entrega y comportamiento de Unidad 1](documentacion/entrega-unidad-1.md)
- [Rediseño, modo oscuro y contrastes](documentacion/rediseno-interfaz.md)
- [Contratos y edición de ejercicios](documentacion/ejercicios.md)
- [Correcciones y optimización](documentacion/correcciones-y-optimizacion.md)
- [API](backend/README.md)
- [Modelo de datos histórico](documentacion-base/LEEME.md)

SMTP y Google requieren credenciales externas propias. Un clon nuevo puede ejecutar el recorrido inicial con PostgreSQL y acceso local. Para reproducir datos adicionales de otra instalación se necesita una exportación autorizada de su base y archivos, transferida de forma privada.
