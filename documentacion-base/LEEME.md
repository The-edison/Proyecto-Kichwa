# base_kichwa

Paquete de base de datos de la Plataforma web interactiva para el aprendizaje del kichwa de la Sierra Centro, niveles básico e intermedio. Fuente: `MER_plataforma_kichwa_v3.drawio` revisado el 30/09/2026.

## Qué contiene

Se adaptaron los **siete archivos** del RAR original, conservando sus nombres, incluso `comados_seeders.txt` y `comandos_migraciones.txt.txt`. Los archivos ya no describen el sistema de homologación.

| Archivo original conservado | Contenido adaptado |
|---|---|
| `comados_seeders.txt` | Comandos para niveles, administrador y demostración. |
| `comandos_migraciones.txt.txt` | Comandos y orden de migraciones. |
| `Diagrama Relacional.png` | Un único modelo relacional con las 14 tablas y todos sus campos. |
| `Diccionario.md` | Tipos, nulabilidad, claves, reglas y vistas calculadas. |
| `Migraciones.txt` | Copia de referencia de las migraciones completas, separadas por archivo. |
| `modelo_relacional.txt` | Tablas con atributos y marcas PK/FK. |
| `seeders.txt` | Copia de referencia de los cuatro seeders completos. |

Además: PHP ejecutable en `database/migrations` y `database/seeders`, SQL equivalente, modelo `Usuario`, configuración de administrador, diagrama editable y documentación de integración y pruebas.

**Es una base de datos para integrar en Laravel, no una aplicación React/Laravel completa.** No contiene endpoints, pantallas, servicios de calificación ni contenido educativo final. No se instalan paquetes PHP desde este ZIP.

## Requisitos y alcance

- Objetivo: Laravel 12, PHP 8.2 o superior compatible con su instalación, Composer y extensión `pdo_pgsql`; `mbstring` para el seeder de administrador.
- PostgreSQL 16 o superior, base UTF-8. Las reglas usan JSONB, vistas y PL/pgSQL: no son compatibles con SQLite/MySQL sin adaptación.
- React/Vite consume la API de Laravel; nunca se conecta directamente a PostgreSQL.
- Sanctum debe estar instalado si se usa el modelo `Usuario` incluido.
- No se incorporan audio ni pronunciación.

## Instalación recomendada con Laravel

Trabaje sobre una base **nueva y vacía**. Este paquete no migra datos existentes de homologación ni de versiones anteriores de Kichwa.

1. Cree una base `base_kichwa` en PostgreSQL con un usuario propietario para ejecutar las migraciones. No incluya credenciales reales en Git.
2. Copie los 16 PHP de `database/migrations` al directorio del mismo nombre de Laravel. **No copie Migraciones.txt como un único PHP** y no ejecute `make:migration` si ya copió los archivos.
3. Copie `NivelSeeder.php`, `DemostracionSeeder.php` y `AdministradorSeeder.php` a `database/seeders`. Si ya existe `DatabaseSeeder.php`, integre `$this->call(NivelSeeder::class);` en su método `run`; no duplique la clase ni elimine llamadas propias.
4. Copie `config/kichwa.php`. Incorpore las variables de `.env.kichwa.example` a su `.env` existente, completando las credenciales. No sustituya el APP_KEY ni el resto de su configuración.
5. Ejecute desde la raíz del proyecto:

```bash
php artisan config:clear
php artisan migrate --pretend
php artisan migrate
php artisan db:seed --class=NivelSeeder
php artisan migrate:status
```

Las migraciones vienen ordenadas y tienen `down()` inverso. `migrate --pretend` muestra el SQL pero no lo valida contra el motor. No use `migrate:fresh` en una base con datos: los elimina.

Los usuarios del dominio están en `usuarios`, no en `users`. Las migraciones por defecto de Laravel pueden crear tablas técnicas adicionales: no interfieren con estas 14 tablas, pero configure correctamente el proveedor de autenticación. No borre migraciones ya ejecutadas en un proyecto existente. En un proyecto nuevo puede decidir conservar las tablas técnicas o retirar antes de migrar únicamente los archivos predeterminados que no vaya a utilizar.

## Usuario y Sanctum

Si Sanctum no está instalado, use el flujo oficial de instalación de API del proyecto (`php artisan install:api` en Laravel 12), revise sus cambios y ejecute las migraciones añadidas. Sanctum proporciona su propia tabla `personal_access_tokens`; no está duplicada en este paquete.

Copie `app/Models/Usuario.php`. En `config/auth.php`, configure el modelo del proveedor Eloquent utilizado por su guard:

```php
'providers' => [
    'users' => [
        'driver' => 'eloquent',
        'model' => App\Models\Usuario::class,
    ],
],
```

Integre ese fragmento sin borrar guards ni otras opciones. No deje `AUTH_MODEL` apuntando al modelo antiguo si su configuración utiliza esa variable.

Para autenticar, use `correo_usuario` normalizado, `estado_usuario = activo` y la clave estándar `password` en las credenciales entregadas a Laravel. El modelo mapea la contraseña persistida a `contrasena_usuario`:

```php
Auth::attempt([
    'correo_usuario' => strtolower(trim($request->string('correo_usuario')->toString())),
    'password' => $request->input('password'),
    'estado_usuario' => 'activo',
]);
```

Esto es una guía de integración, no un controlador completo. En una SPA con Sanctum configure además cookies, CSRF, dominios stateful, CORS y autorización. Aplique el bloqueo de cuenta también a sesiones/tokens existentes; comprobarlo sólo al iniciar sesión no los revoca. El modelo oculta contraseña y remember_token y no permite asignar rol mediante `fillable`.

Para los modelos Eloquent propios de las demás tablas configure `$table`, `$primaryKey` y `$timestamps = false`: el MER utiliza fechas específicas, no las columnas genéricas `created_at`/`updated_at`. Configure casts `array` para JSONB. Nunca acepte la nota o el acierto enviados por React como resultado válido.

## Semillas

`NivelSeeder` incorpora únicamente los niveles Básico e Intermedio. No inventa el currículo final, cuentas públicas ni resultados de estudiantes.

Opcional en `APP_ENV=local` o `testing`:

```bash
php artisan db:seed --class=DemostracionSeeder
```

Crea un módulo/unidad, un tema, cuatro actividades, una evaluación de unidad, un diagnóstico, dos preguntas y tres entradas de diccionario. **Todo es demostración no validada**, incluyendo las tres palabras de diccionario. Los ejercicios no requieren archivos multimedia ausentes. El módulo usa orden 900000 para separarlo de los contenidos reales. No ejecute esta semilla en producción.

Para crear su primer administrador, complete KICHWA_ADMIN_NOMBRE, KICHWA_ADMIN_EMAIL y KICHWA_ADMIN_PASSWORD con valores propios. Después:

```bash
php artisan config:clear
php artisan db:seed --class=AdministradorSeeder
```

No hay contraseña predeterminada. Se exige un mínimo de 12 caracteres y se almacena hash. Repetir la semilla no cambia contraseñas existentes ni eleva estudiantes a administrador. Retire la variable de contraseña del entorno después de crear la cuenta y regenere su caché de configuración si la utiliza.

## SQL alternativo

Si sólo necesita revisar la base desde pgAdmin o psql, ejecute `database/sql/instalar.sql` una vez en una base vacía. Luego puede ejecutar `semilla_niveles.sql` y, sólo para pruebas, `semilla_demo.sql`.

**Elija una ruta: Artisan o SQL directo.** El SQL directo no registra la tabla de control de migraciones de Laravel; ejecutar ambas rutas en la misma base causaría errores de tablas existentes. Los fragmentos numerados son documentación técnica y están incluidos en instalar.sql; no vuelva a ejecutarlos después.

`database/sql/desinstalar.sql` elimina las tablas y datos Kichwa: es exclusivamente para pruebas desechables. No se ejecuta automáticamente.

## Antes de implementar la API

Lea `documentacion/decisiones.md` y `documentacion/ejercicios.md`. Allí se diferencian las reglas implementadas en PostgreSQL de la validación, autorización y corrección que debe hacer Laravel. `pruebas/resultado.json` registra exactamente lo comprobado y sus límites. Ningún paquete puede garantizar ausencia de errores futuros en un entorno todavía no integrado.
