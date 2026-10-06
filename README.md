# Yachay · Plataforma para aprender Kichwa

Aplicación de aprendizaje del Kichwa de la Sierra Centro del Ecuador. Incluye lecciones, ejercicios, evaluaciones, seguimiento del progreso, diccionario y un panel de administración.

## Estructura

| Carpeta | Función | Tecnología |
| --- | --- | --- |
| [`frontend/`](frontend/) | Interfaz web independiente | React, TypeScript, Vite y Tailwind CSS |
| [`backend/`](backend/) | API, autenticación y datos | Laravel, Sanctum y PostgreSQL |

El frontend consulta la API de Laravel por HTTP. En el navegador usa sesiones de Sanctum y protección CSRF; los clientes externos pueden usar tokens de API.

## Inicio rápido en Windows

Necesitas PHP 8.4 con Composer y Node.js con npm. Desde la raíz del proyecto, en PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
cd backend
composer install
php artisan key:generate
cd ../frontend
npm install
cd ..
.\iniciar.ps1
```

Abre **http://127.0.0.1:5173**. El lanzador inicia el frontend en el puerto 5173 y la API en el 8000 con una base SQLite de vista previa. Para usar PostgreSQL, configura `backend/.env` y ejecuta `.\iniciar.ps1 -PostgreSQL`.

`iniciar.ps1` y `php.ini` facilitan el arranque en este equipo Windows. `php.ini` incluye una ruta local de instalación de PHP; ajústala si usas otra máquina.

## Desarrollo por separado

En una terminal, inicia la API desde `backend`:

```powershell
php artisan serve --host=127.0.0.1 --port=8000
```

En otra terminal, inicia la interfaz desde `frontend`:

```powershell
npm run dev
```

Los valores de `FRONTEND_URL` y `SANCTUM_STATEFUL_DOMAINS` en `backend/.env` deben corresponder al origen del frontend. Si cambias la dirección de la API, configura `VITE_API_URL` en `frontend/.env` según [`frontend/.env.example`](frontend/.env.example). Usa el mismo nombre de host para ambos servicios en el entorno local, por ejemplo `127.0.0.1`.

## Verificación

```powershell
cd backend
php artisan test
cd ../frontend
npm run typecheck
npm run build
```

Consulta [`backend/README.md`](backend/README.md) para la configuración de PostgreSQL, el primer administrador y las rutas de la API.
