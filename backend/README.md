# API Yachay

API Laravel 13 con PostgreSQL 16+, sesiones Sanctum y Socialite. Usa Usuario y el MER español de documentacion-base; las tablas históricas siguen conservadas salvo `glossary`, cuyas palabras se unifican en `diccionario` (`id`, `kichwa`, `español`).

La instalación, variables, credenciales iniciales, Google, correo y pruebas están en [README principal](../README.md). Los contratos JSON están en [ejercicios](../documentacion/ejercicios.md). Consulta [correcciones y optimización](../documentacion/correcciones-y-optimizacion.md) para publicación, jerarquía, CSV, métricas y nuevas migraciones. La búsqueda direccional está en /api/diccionario/buscar.

Rutas: /api/auth/*, /api/admin/{levels,modules,units,contents,exercises,evaluations,questions,diccionario,students}, /api/admin/uploads, /api/media/* y catálogo/aprendizaje bajo /api. Consulta php artisan route:list --path=api para métodos y rutas exactos.

No ejecutes migrate:fresh contra la base de trabajo. Las pruebas requieren .env.testing y una base exclusiva con nombre terminado en _test.
