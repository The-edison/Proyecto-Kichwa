# Auditoría e integración Yachay

## Hallazgos comprobados

- La aplicación instalada usa Laravel **13.34.0**, Sanctum 4.3.3, Socialite 5.31.0 y PHP 8.4. Se conserva esta versión: bajar a Laravel 12 requiere una migración de dependencias aparte.
- Las migraciones existentes usan tablas inglesas, actividades dependientes de lecciones, evaluaciones por nivel y notas almacenadas. El MER exige 14 tablas españolas, actividades por unidad, evaluaciones por unidad/diagnóstico y vistas calculadas. Se conservan las migraciones históricas y sus tablas sin borrar datos; las nuevas rutas del aprendizaje utilizan el esquema documentado.
- README, lanzador y PHPUnit permiten SQLite, incompatible con JSONB/PLpgSQL. Se establece PostgreSQL 16+ exclusivamente para desarrollo y pruebas; las pruebas usan una base separada.
- Los 16 PHP coinciden con la recopilación Migraciones.txt. Las FK compuestas, los triggers de historial y las cinco vistas son parte del contrato.
- El diagrama muestra timestamps; el SQL y diccionario especifican timestamptz: prevalece SQL. La cédula ya es nullable/única; el problema de Google es la contraseña NOT NULL y la falta de google_id.
- El paquete excluye audio; el requisito actual lo incorpora. Audio principal en recurso_*; imágenes en elementos_* y zonas_* mediante rutas relativas de almacenamiento.
- La autenticación antigua admite contraseña de ocho caracteres, no valida algoritmo de cédula y permite role_id en mass assignment. El nuevo Usuario excluye rol/estado del fillable, y el servidor asigna el rol estudiante.
- No hay credencial PostgreSQL utilizable en el .env inicial (contraseña vacía). La creación y verificación real requieren acceso al servidor; no se modifica su autenticación ni se borran bases existentes.

## Decisiones

- Base nueva y vacía y base de pruebas separada. Nunca migrate:fresh contra la base de trabajo.
- Mantener las pantallas y sus estilos y adaptar el contrato HTTP con proyecciones explícitas; soluciones sólo en endpoints administrativos.
- Básico disponible, Intermedio reservado y rechazado también por URL directa.
- Corrección exacta en servidor: conjuntos para selección, variantes aprobadas para completar y pares para relacionar/arrastrar. No inventar contenido real ni umbrales docentes.
- Google conserva state y vinculación mediante sesión local autenticada con correo coincidente. No vincular automáticamente cuentas locales ni elevar roles.
- Administrador inicial idempotente: no sobrescribir contraseñas, roles ni desbloquear usuarios al repetir seeders. Contraseña local obligatoriamente renovada.
- Temas como texto plano escapado. Archivos raster/audio permitidos, extensión y MIME comprobados, nombres aleatorios y acceso con Content-Type/nosniff; no aceptar SVG/HTML/scripts.

## Validación

Se actualizará este apartado con los comandos realmente ejecutados y sus resultados. La guía manual no sustituye una prueba ejecutada.
