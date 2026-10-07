# Yachay · Plataforma Kichwa

Dos niveles fijos con administración por módulos, unidades y temas, cuatro tipos de ejercicios, evaluaciones, diccionario y progreso. Intermedio figura como «Próximamente» hasta publicar su contenido. Nuevos módulos, unidades y temas nacen en borrador; publica sus padres para que los estudiantes puedan acceder. React Router y TanStack Query mantienen la navegación SPA y su caché.

Backend Laravel **13.34**, PHP 8.4, Sanctum y Socialite; frontend React, TypeScript, Vite y Tailwind. Se conserva Laravel instalado en el proyecto. El MER usa 14 tablas españolas, cinco vistas y PL/pgSQL: **PostgreSQL 16+ es la única base soportada**. Las migraciones anteriores se conservan. La tabla histórica `glossary` se unifica en `diccionario`, conservando sus palabras y traducciones; el diccionario queda únicamente con `id`, `kichwa` y `español`.

## Paneles implementados

### Panel de administrador

- **Resumen (`/admin`):** indicadores de estudiantes, lecciones, ejercicios y términos del diccionario, con accesos a la gestión del campus.
- **Estudiantes (`/admin/estudiantes`):** listado paginado, búsqueda por nombre o cédula y acciones para bloquear o activar cuentas.
- **Contenidos (`/admin/contenidos`):** gestión de módulos, unidades y temas por nivel, con orden y estados de borrador o publicado. Los estudiantes acceden al contenido cuando sus padres también están publicados.
- **Actividades y evaluaciones:** editor de selección múltiple, completar, relacionar y arrastrar, con imágenes, audio, soluciones y vista previa del estudiante; gestión de evaluaciones diagnósticas y de unidad y sus preguntas.
- **Diccionario:** tabla `diccionario` con únicamente `id`, `kichwa` y `español`; gestión de términos e importación de CSV UTF-8 con las columnas `kichwa` y `español`. El `id` se genera automáticamente.

### Panel de estudiante

- **Mi aprendizaje (`/aprender`):** niveles disponibles y porcentaje de avance. El nivel intermedio muestra «Próximamente» hasta que su contenido esté disponible.
- **Recorrido de aprendizaje:** navegación por niveles, módulos, unidades y temas publicados, lectura de lecciones y resolución de ejercicios con recursos multimedia.
- **Evaluaciones (`/aprender/evaluacion/:id`):** acceso a las evaluaciones del recorrido de aprendizaje.
- **Mi progreso (`/aprender/progreso`):** consulta del avance del estudiante.
- **Diccionario (`/aprender/diccionario`):** búsqueda de vocabulario e intercambio entre kichwa y español.

Ambos paneles requieren una sesión y el rol correspondiente. El registro crea cuentas de estudiante; el administrador inicial se configura mediante las variables `KICHWA_ADMIN_*`. La cuenta inicial debe cambiar su contraseña en **Mi cuenta (`/cuenta`)** antes de acceder al panel.

El acceso del navegador es independiente por pestaña: copiar una URL en una pestaña nueva requiere iniciar sesión allí. Puedes mantener administrador y estudiante en pestañas separadas. La sesión vence tras 30 minutos sin solicitudes autenticadas; al cerrar sesión se limpia la información privada de esa pestaña. Cambiar o recuperar la contraseña revoca los accesos anteriores de esa cuenta. La actualización requiere volver a iniciar sesión en las pestañas abiertas antes de este cambio.

El catálogo se actualiza al volver a la pestaña o abrir una sección, y las publicaciones hechas desde otra pestaña del mismo navegador notifican la actualización. Las unidades publicadas aparecen aunque aún no tengan temas; los borradores siguen ocultos.

## Arranque en este equipo

La configuración privada ya está en backend/.env: PostgreSQL 5433 y bases yachay_kichwa / yachay_kichwa_test. Desde PowerShell:

```powershell
Set-Location C:\PROYECTOS\Proyecto-Kichwa
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\iniciar.ps1 -PostgreSQL -Reiniciar
```

Abre **http://127.0.0.1:5173**. El administrador inicial es **admin@yachay.test**, contraseña **YachayLocal#2026**. Debe cambiarla en «Mi cuenta» antes de administrar. El seeder no vuelve a cambiar contraseñas ni desbloquea cuentas.

## Instalación desde cero en Windows

Instala PHP 8.4, Composer, Node.js 22.12+ y PostgreSQL 16+. PHP debe tener pdo_pgsql, pgsql, mbstring, openssl, fileinfo, gd, intl, curl, zip y bcmath. php.ini del proyecto es portable; el lanzador obtiene la carpeta de extensiones del PHP de PATH.

```powershell
Set-Location C:\PROYECTOS\Proyecto-Kichwa
Copy-Item backend\.env.example backend\.env
Copy-Item backend\.env.testing.example backend\.env.testing
notepad backend\.env
notepad backend\.env.testing
```

Configura DB_USERNAME, DB_PASSWORD y DB_PORT en ambos archivos. En pgAdmin o psql crea dos bases NUEVAS con estos nombres; si ya existen, utiliza otros nombres nuevos y actualiza los archivos:

```sql
CREATE DATABASE yachay_kichwa;
CREATE DATABASE yachay_kichwa_test;
```

No uses migrate:fresh sobre la base de trabajo. A continuación:

```powershell
Set-Location backend
composer install
php artisan key:generate
# Copia el APP_KEY generado desde .env a .env.testing.
notepad .env.testing
php artisan config:clear
php artisan migrate --pretend
php artisan migrate
php artisan migrate:status
php artisan db:seed
php artisan storage:link
Set-Location ..\frontend
npm.cmd ci
npm.cmd run typecheck
npm.cmd run build
Set-Location ..
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\iniciar.ps1 -PostgreSQL
```

Si Windows impide storage:link, habilita el modo de desarrollador o ejecuta ese comando con permisos para enlaces simbólicos. Usa 127.0.0.1 tanto en frontend como API; cambiar sólo uno por localhost rompe el contexto de cookies. Los logs locales están en backend/storage/logs.

## Variables y autenticación

DB_* configura PostgreSQL. KICHWA_ADMIN_NOMBRE, KICHWA_ADMIN_EMAIL y KICHWA_ADMIN_PASSWORD crean el administrador inicial. En producción configura correo real y contraseña fuerte distinta de la local **antes del primer seeding**; el seeder se niega a usar valores locales inseguros. Guarda .env fuera de Git.

El registro normaliza el correo, valida nombre y cédula opcional, exige contraseña de 12 caracteres con mayúsculas, minúsculas, números y símbolos, y un máximo de 72 bytes. Comprueba DNS y contraseñas comprometidas en desarrollo/producción; testing desactiva esas consultas externas. Los estudiantes nunca asignan su rol. El bloqueo revoca sesiones y tokens. Recuperación y verificación de correo están implementadas; MAIL_MAILER=log escribe enlaces en backend/storage/logs/laravel.log y **no envía correos**. Para enviar configura SMTP (MAIL_MAILER=smtp, MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD y remitente autorizado).

## Google Cloud paso a paso

1. En [Google Cloud Console](https://console.cloud.google.com/) crea o selecciona un proyecto.
2. Abre Google Auth Platform y configura Branding: nombre Yachay, correo de soporte y contacto.
3. En Audience elige el público apropiado. Para una aplicación externa en pruebas, agrega los correos de prueba.
4. En Data Access solicita únicamente openid, email y profile.
5. En Clients crea un cliente OAuth de tipo **Web application**.
6. Agrega el origen http://127.0.0.1:5173 y la URI de redirección **http://127.0.0.1:8000/auth/google/callback** exactamente.
7. Copia el identificador y secreto privados a GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET de backend/.env; configura GOOGLE_REDIRECT_URI con la URI anterior.
8. Ejecuta php artisan config:clear desde backend y abre «Continuar con Google» en el navegador. Si la consola rechaza 127.0.0.1 como origen JavaScript, omite ese origen: Socialite usa redirección de servidor; conserva la URI de callback permitida.
9. Para producción agrega la URI HTTPS definitiva y completa los requisitos de publicación de Google.

El flujo valida state y correo verificado. Una cuenta local existente sólo se vincula desde una sesión local autenticada con el mismo correo; no hay vinculación automática ni promoción de roles. Referencias: [OAuth para aplicaciones web](https://developers.google.com/identity/protocols/oauth2/web-server), [Socialite](https://laravel.com/docs/13.x/socialite). No se inventan credenciales de Google: en este equipo el botón indica que falta configurarlas.

## Contenido y pruebas

El administrador carga el material real y el docente experto lo valida. No se importó contenido lingüístico final del DOCX. Los registros [DEMO] de verificación y el tono de audio son datos técnicos locales. DemostracionSeeder no se ejecuta por defecto y se limita a local/testing:

```powershell
Set-Location backend
# Opcional, sólo para una base local de demostración:
php artisan db:seed --class=DemostracionSeeder
# Pruebas: requieren la base separada que termina en _test.
php artisan test
Set-Location ..\frontend
npm.cmd test # Pruebas de aislamiento de pestañas y API; requieren Node.js 24+.
npm.cmd run typecheck
npm.cmd run build
```

Las pruebas migran normalmente y revierten transacciones; no borran la base de trabajo. El arranque no cambia una contraseña inicial ya renovada.

Consulta [correcciones, mediciones y pasos de actualización](documentacion/correcciones-y-optimizacion.md), [auditoría inicial](documentacion/auditoria.md), [contratos de ejercicios](documentacion/ejercicios.md) y [referencias del MER](documentacion-base/LEEME.md). El diccionario permite intercambio de idioma y CSV UTF-8 con únicamente kichwa,español. Limitaciones: publicación de opiniones reservada; Google real y entrega SMTP necesitan credenciales externas; no hay contenido docente final ni despliegue de producción incluido.
