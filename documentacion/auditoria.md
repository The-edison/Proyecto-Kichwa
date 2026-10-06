# Auditoría e integración Yachay

## Hallazgos comprobados

- La aplicación instalada usa Laravel **13.34.0**, Sanctum 4.3.3, Socialite 5.31.0 y PHP 8.4. Se conserva esta versión: bajar a Laravel 12 requiere una migración de dependencias aparte.
- Las migraciones existentes usan tablas inglesas, actividades dependientes de lecciones, evaluaciones por nivel y notas almacenadas. El MER exige 14 tablas españolas, actividades por unidad, evaluaciones por unidad/diagnóstico y vistas calculadas. Se conservan las migraciones históricas y sus tablas sin borrar datos; las nuevas rutas del aprendizaje utilizan el esquema documentado.
- README, lanzador y PHPUnit permiten SQLite, incompatible con JSONB/PLpgSQL. Se establece PostgreSQL 16+ exclusivamente para desarrollo y pruebas; las pruebas usan una base separada.
- Los 16 PHP coinciden con la recopilación Migraciones.txt. Las FK compuestas, los triggers de historial y las cinco vistas son parte del contrato.
- El diagrama muestra timestamps; el SQL y diccionario especifican timestamptz: prevalece SQL. La cédula ya es nullable/única; el problema de Google es la contraseña NOT NULL y la falta de google_id.
- El paquete excluye audio; el requisito actual lo incorpora. Audio principal en recurso_*; imágenes en elementos_* y zonas_* mediante rutas relativas de almacenamiento.
- La autenticación antigua admite contraseña de ocho caracteres, no valida algoritmo de cédula y permite role_id en mass assignment. El nuevo Usuario excluye rol/estado del fillable, y el servidor asigna el rol estudiante.
- El .env inicial no tenía credenciales PostgreSQL utilizables. Con el acceso proporcionado se crearon yachay_kichwa y yachay_kichwa_test en PostgreSQL 18.6, puerto 5433; la contraseña sólo está en archivos ignorados. No se cambió la autenticación del servidor ni se borraron bases existentes.

## Decisiones

- Base nueva y vacía y base de pruebas separada. Nunca migrate:fresh contra la base de trabajo.
- Mantener las pantallas y sus estilos y adaptar el contrato HTTP con proyecciones explícitas; soluciones sólo en endpoints administrativos.
- Básico disponible, Intermedio reservado y rechazado también por URL directa.
- Corrección exacta en servidor: conjuntos para selección, variantes aprobadas para completar y pares para relacionar/arrastrar. No inventar contenido real ni umbrales docentes.
- Google conserva state y vinculación mediante sesión local autenticada con correo coincidente. No vincular automáticamente cuentas locales ni elevar roles.
- Administrador inicial idempotente: no sobrescribir contraseñas, roles ni desbloquear usuarios al repetir seeders. Contraseña local obligatoriamente renovada.
- Temas como texto plano escapado. Archivos raster/audio permitidos, extensión y MIME comprobados, nombres aleatorios y acceso con Content-Type/nosniff; no aceptar SVG/HTML/scripts.

## Validación

Verificación ejecutada el 5 de octubre de 2026:

- migrate --pretend, migrate y migrate:status: 24 migraciones aplicadas, sin pendientes. Se conservan las históricas; las 16 del MER y la extensión de autenticación se agregaron como nuevas.
- DatabaseSeeder repetido: dos niveles, administrador idempotente y contraseña inicial conservada. storage:link creado.
- php artisan test: **30 pruebas, 222 aserciones**, todas pasan contra la base exclusiva de pruebas. Incluyen validación/normalización/roles, cambio obligatorio, bloqueo y tokens, recuperación, Google mockeado y state, CRUD/RESTRICT, MIME/archivos, cuatro correcciones, soluciones privadas, vistas e integridad compuesta. Pruebas adicionales rechazan la contraseña local en producción y contraseñas que exceden el límite de bytes de bcrypt.
- Pint, composer validate, npm.cmd run typecheck y npm.cmd run build: pasan.
- iniciar.ps1 -PostgreSQL: migraciones y seeders ejecutados; PHP y Vite propios del proyecto reiniciados con la configuración portable. Frontend y /up responden 200.
- Edge real: administrador de verificación cambió su contraseña obligatoria; creó módulo, unidad, tema, cuatro actividades, imágenes, audio WAV técnico y evaluación/pregunta desde el panel. Estudiante registrado desde el formulario resolvió los cuatro ejercicios: respuestas correctas, progreso **4/4 y 100%**, evaluación **100%**. El catálogo muestra porcentaje de módulo y unidad. Audio reproducible (readyState 4), imágenes cargadas.
- Pantalla táctil emulada de 390 × 844: origen y zona funcionan con toques, selectores accesibles y sin desbordamiento horizontal. Se verificó también el catálogo de escritorio; sin excepciones de navegador en esa comprobación.

Capturas: [ejercicio táctil](evidencia/estudiante-tactil.png), [progreso](evidencia/progreso-estudiante.png), [catálogo](evidencia/catalogo-basico.png).

## Cambios entregados

| Área | Archivos y resultado |
| --- | --- |
| Esquema | backend/database/migrations/2026_09_30_*; extensión 2026_10_06_*; 14 modelos españoles y cinco modelos de vistas sólo lectura; factories y tres seeders. |
| Autenticación | Usuario, config/auth.php, RegisterRequest, AuthController, GoogleAuthController, CuentaActiva, RequireRole, routes/web.php y api.php. Sesiones Sanctum/CSRF, recuperación, verificación y cambio obligatorio. |
| Aprendizaje y administración | KichwaAdminController, KichwaCatalogController, KichwaSubmissionController, ArchivoController, ContratoEjercicio y KichwaResource: recursos permitidos, corrección del servidor y conservación del historial. |
| Interfaz | AdminContentManager y ExerciseEditor; interacción común ExerciseCard; registro/login/cuenta/recuperación; catálogo/unidad/evaluación/progreso y bloqueo de estudiantes. Se conservan diseño y componentes del proyecto. |
| Entorno y calidad | iniciar.ps1, php.ini, ejemplos .env, PHPUnit/TestCase/UsesPostgreSQL y pruebas adaptadas; originales archivados en legado-pruebas. README raíz/backend y ejercicios.md. |

Los documentos adjuntos son referencias de datos, no órdenes de ejecución. El DOCX y drawio se inspeccionaron; no se importó contenido lingüístico como material final. Las soluciones sólo se proyectan al editor administrativo, nunca al catálogo de estudiantes.

## Límites y configuración externa

Intermedio y publicación de opiniones siguen reservados. La verificación de Google se ejecutó con mocks; el flujo real necesita Client ID/Secret del propietario. La recuperación y verificación se prueban con notificaciones simuladas; el entorno local usa correo en log y necesita SMTP para entrega real. La verificación de correo puede solicitarse pero no impide estudiar; Google exige correo verificado. No se desplegó producción ni se creó contenido docente final. Los datos [DEMO] y el tono WAV son exclusivamente técnicos.

Administrador inicial: admin@yachay.test / YachayLocal#2026, cambio obligatorio. Una cuenta separada de verificación permitió probar el panel sin renovar esta contraseña inicial. Pasos desde cero y configuración Google/SMTP: [README](../README.md).
