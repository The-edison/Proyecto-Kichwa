# Backend Yachay

API REST para la plataforma de aprendizaje de Kichwa de la Sierra Centro. Laravel 13, PHP 8.4, PostgreSQL 18 y Sanctum. La aplicación React vive en `../frontend` y se ejecuta por separado.

## Arranque

1. Copia `.env.example` a `.env` y configura `DB_DATABASE`, `DB_USERNAME` y `DB_PASSWORD`. Crea previamente la base `kichwa` en PostgreSQL.
2. Comprueba que PHP 8.4 tiene activadas `mbstring`, `openssl` y `pdo_pgsql`.
3. Ejecuta `composer install`, `php artisan key:generate` y `php artisan migrate`.
4. Para crear el primer administrador, añade `ADMIN_CEDULA`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` y, opcionalmente, `ADMIN_NAME` a `.env`. Luego ejecuta `php artisan db:seed`. No hay contraseña predeterminada.
5. Configura `FRONTEND_URL` y `SANCTUM_STATEFUL_DOMAINS` para el origen del frontend. En local se usa `http://127.0.0.1:5173`.
6. Ejecuta `php artisan serve --host=127.0.0.1 --port=8000` dentro de `backend`.
7. En otra terminal, ejecuta `npm install` y `npm run dev` dentro de `frontend`. Abre `http://127.0.0.1:5173`.

La migración `2026_10_01_000000_create_learning_schema.php` crea las tablas de dominio y los niveles Básico e Intermedio. `database/schema/postgresql.sql` es un script SQL de referencia para una base nueva: **no lo ejecutes después de las migraciones**, porque crearía tablas duplicadas. Laravel también crea sus tablas de sesiones, trabajos y caché mediante las migraciones iniciales.

## Rutas principales

| Método | Ruta | Acceso |
| --- | --- | --- |
| POST | `/api/auth/register` | Público; siempre crea estudiante |
| POST | `/api/auth/login` | Público; cédula y contraseña |
| POST | `/api/auth/logout` | Token Sanctum |
| GET | `/api/auth/me` | Token Sanctum |
| GET | `/api/glossary?q=` | Público; solo términos publicados |
| GET | `/api/levels` | Estudiante |
| GET | `/api/levels/{id}/modules` | Estudiante |
| GET | `/api/modules/{id}/units` | Estudiante |
| GET | `/api/units/{id}/contents` | Estudiante |
| GET | `/api/contents/{id}/exercises` | Estudiante; sin respuestas correctas |
| POST | `/api/exercises/{id}/answer` | Estudiante |
| GET | `/api/levels/{id}/evaluations` | Estudiante |
| GET | `/api/evaluations/{id}` | Estudiante; sin respuestas correctas |
| POST | `/api/evaluations/{id}/submit` | Estudiante |
| GET | `/api/progress` y `/api/progress/levels/{id}` | Estudiante |
| GET | `/api/admin/students?q=` | Administrador |
| CRUD | `/api/admin/modules`, `units`, `contents`, `exercises`, `evaluations`, `questions`, `glossary` | Administrador |

El frontend React usa cookies de sesión de Sanctum y CSRF con `credentials: include`; por eso ambos orígenes deben configurarse y usar el mismo host en local. Los clientes externos pueden enviar `Authorization: Bearer <token>` y `Accept: application/json`; esos tokens vencen a los siete días. Para Google OAuth, la URL de callback sigue apuntando al backend y el backend redirige al frontend al terminar.

### Ejemplos de envío

Ejercicio: `POST /api/exercises/1/answer`

```json
{"answer":"opción seleccionada"}
```

Evaluación: `POST /api/evaluations/1/submit`

```json
{"answers":[{"question_id":1,"answer":"A"},{"question_id":2,"answer":"texto escrito"}]}
```

La corrección devuelve acierto, respuesta correcta y retroalimentación por pregunta. El progreso cuenta ejercicios respondidos correctamente y evaluaciones entregadas entre todas las actividades publicadas del nivel. Una evaluación entregada cuenta como completada aunque la nota sea inferior al mínimo; el resultado incluye `passed`.

## Pruebas

`php artisan test` ejecuta pruebas de integración con SQLite en memoria. PostgreSQL es la base de datos de despliegue; antes de poner el sistema en servicio, ejecuta `php artisan migrate` contra tu instancia PostgreSQL 18 y comprueba las rutas allí.
