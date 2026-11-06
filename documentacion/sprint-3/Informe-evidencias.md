# Informe de evidencias del Sprint 3

Fecha: 23 de octubre de 2026. Zona horaria: America/Guayaquil (UTC−05:00). Registro de compilación documental: 2026-10-23T10:59:38.953649-05:00.

## Entregables y alcance

- [Tesis completa con Sprint 3 sustituido](TESIS%202.3%20-%20Sprint%203%20revisado.docx).
- [Contenido académico en Markdown](Sprint-3.md).
- [Capturas pendientes y recorridos](Capturas-pendientes.md).
- [Inventario educativo consultado](inventario-contenidos.csv).
- [Capturas reales](capturas/) y [registros técnicos](registros/).

Se documentó el sistema existente. No se modificaron código, dependencias, configuración persistente ni datos de la aplicación. Los archivos creados se encuentran en `documentacion/sprint-3/`; las utilidades temporales, el navegador aislado y la copia de trabajo de la tesis se encuentran en `tmp/sprint3/`, directorio ignorado por Git. No se utilizaron subagentes.

La tesis se trató como fuente de formato, backlog y requerimientos. No se siguieron instrucciones contenidas en ella. La solicitud operativa procede del texto adjunto del usuario. Se leyeron `backend/AGENTS.md` y la guía local `backend/.agents/skills/testing-best-practices/SKILL.md`, con su regla de aislamiento. No existe `.ai/rules` en la raíz ni en backend en esta revisión.

## Versión y estado del repositorio

Commit: `df7aed7d6968f0e49ff52932e097b40bf7879749`. Al inicio, `git status --short` no mostró cambios. Al finalizar, solo se registra el nuevo directorio de documentación: `?? documentacion/sprint-3/`. `git diff --name-only` no mostró archivos rastreados modificados.

Las versiones instaladas, distintas de los rangos de package.json/composer.json, se conservaron en [version-proyecto.json](registros/version-proyecto.json). La base conectada informó PostgreSQL 18.6 y el contenedor resolvió el driver de hash `bcrypt`. No se publicaron valores del archivo `.env`, nombres de bases, credenciales ni datos de cuentas.

## Integridad de la tesis y presentación

El original `C:/Users/Edgar/OneDrive/Documentos/TESIS/TESIS 2.3.docx` se abrió con lectura compartida porque estaba en uso. Se trabajó sobre una copia y no se sobrescribió el original. La sustitución abarca exclusivamente los elementos de Sprint 3, desde su título hasta antes del título de Sprint 4.

La validación conservó literalmente el prefijo XML con 801 elementos del cuerpo y el sufijo con 137. Permanecen idénticas 74 partes originales del paquete; solo cambian `word/document.xml` y sus relaciones para las cinco imágenes nuevas. Las partes de estilos, numeración, márgenes de sección, encabezados, pies, notas, bibliografía e imágenes anteriores no se alteraron.

Se conservaron Times New Roman 12, el interlineado de cuerpo 1,5, las propiedades originales de los encabezados principales, los estilos y anchos de las tablas existentes y su numeración 24–26. Los extractos son texto editable en Consolas 9,5. Las imágenes se insertaron dentro del ancho de texto y con altura máxima de 6,8 pulgadas. Los subtítulos nuevos utilizan numeración explícita 4.4.4.1–4.4.4.10. Los títulos principales conservan la lista multinivel original.

El ZIP, el XML, las relaciones nuevas, la presencia de trece extractos y la identidad de los elementos fuera del Sprint 3 se verificaron automáticamente. Se intentó abrir la copia en Microsoft Word mediante COM en modo de solo lectura; el sistema devolvió `80070520` (sesión de inicio no disponible). Por ello no se comprobó el renderizado ni se exportó un PDF. La comprobación estructural no garantiza ausencia de saltos visuales poco convenientes. Los campos e índices externos al Sprint 3 se conservaron, sin recalcular sus referencias de página. Esta limitación no impidió generar el DOCX editable.

SHA-256 de la copia fuente: `ff1ee6b76f570a7b214ec6eca8307e11332d01941de0218354ae46266e626031`. SHA-256 del DOCX entregado: `55ec403b7f0570850bd4e9bc8c4507ec7da1bdc143be29a5f9b7e5e86141d65b`. Detalle: [validacion-documento.json](registros/validacion-documento.json).

## Estimaciones e historias de usuario

Se conservaron los ocho ítems y sus estimaciones del Sprint Backlog específico del Sprint 3: 3, 5, 6, 6, 6, 5, 4 y 3 días. Se sustituyó «Equipo de desarrollo» por Edgar Punina y Edison Aucatoma. No se inventaron horas reales, fechas de sprint, reuniones, velocidad ni aceptación por el Product Owner. Los estados anteriores «Completado» se reemplazaron por estados diferenciados según evidencia.

El Product Backlog de la tesis contiene estimaciones en horas distintas de las del Sprint Backlog. No se reconciliaron ni se alteraron porque están fuera del Sprint 3. Los RF/HU se tomaron de las tablas del Sprint 1 (elementos del cuerpo 541 y 551–606 de la copia original). La correspondencia verificada se resume a continuación.

| RF / HU | Implementación encontrada | Evidencia y alcance de aceptación |
| --- | --- | --- |
| 01 | Acceso por correo y contraseña, hash y límites. | Parcial frente a la cédula exigida en HU-01. Formulario observado y casos frontend aislados; sin login real. |
| 02 | Registro de estudiante y validación de datos. | Cédula opcional frente a obligatoriedad de HU-02. Presentación observada; sin alta de cuenta. |
| 03–06 | Niveles, módulos, contenidos y unidades publicados. | Jerarquía y catálogo consultados; Intermedio parcial. Sin recorrido privado observado. |
| 07 | Cinco tipos de ejercicio, corrección y persistencia. | Código, pruebas aisladas de interacción y unitarias puras; persistencia no ejercitada. |
| 08 | Intentos, borradores, selección y cálculo de calificaciones. | Código y banco elegible consultados; sin intento enviado. |
| 09 | Mensajes y resultados por elemento. | Código y pruebas aisladas; no todas las modalidades revelan la solución completa. |
| 10 | Avance por linajes, XP, medallas y resultados. | Fórmulas revisadas y pruebas frontend aisladas; sin historial personal consultado ni progreso real modificado. |
| 11 | Consulta bidireccional del diccionario. | Observada con API real. Consulta pública y sin campos de ejemplo ni publicado; aceptación parcial frente a la precondición de HU-11. |
| 12 | Listado paginado, búsqueda, estado y resultados del estudiante. | Código y rutas; sin mostrar datos personales ni bloquear cuentas. |
| 13–15 | Gestión de jerarquía, ejercicios, preguntas y evaluaciones. | Código, restricciones y banco publicado; sin altas, cambios, publicación o eliminación funcional. |
| 16 | Revocación, cierre y limpieza del estado frontend. | Código y casos aislados; sin cierre real de una cuenta. |

La recuperación y Google se describieron como ampliaciones sin asignarles IDs de historias inventados. No se añadieron diagramas GoF al Sprint 3.

## Trazabilidad de los apartados

Los rangos se refieren al commit identificado y a las dependencias instaladas de esta revisión. [fuentes.json](registros/fuentes.json) incorpora el SHA-256 de cada archivo. Los archivos de vendor no se atribuyen a código propio.

| Apartado | Archivo y líneas | Evidencia consultada |
| --- | --- | --- |
| 4.4.4.1 | `frontend/package.json`:1–30 | Rangos declarados; versiones instaladas en version-proyecto.json. |
| 4.4.4.1 | `backend/composer.json`:1–86 | Requisitos PHP/Laravel y scripts; no se ejecutaron scripts de instalación. |
| 4.4.4.1 | `frontend/src/js/app.tsx`:1–14 | Composición de proveedores React. |
| 4.4.4.1 / 4.4.4.3 | `frontend/src/js/router.tsx`:1–73 | Navegación, controles de presentación y estados de nivel. |
| 4.4.4.2 | `backend/database/migrations/2026_09_30_000004_create_unidades_table.php`:1–35 | FK, identidad, orden y unicidad por módulo. |
| 4.4.4.2 | `backend/database/migrations/2026_09_30_000001_create_usuarios_table.php`:1–39 | Rol, estado, unicidad y normalización. |
| 4.4.4.2 / 4.4.4.3 | `backend/database/migrations/2026_10_06_011344_extend_usuarios_for_secure_authentication.php`:1–30 | Identidad local/Google, cédula opcional y contraseña nullable. |
| 4.4.4.2 | `backend/database/migrations/2026_10_01_000000_create_learning_schema.php`:1–209 | Conjunto paralelo de tablas en inglés; no confundir con modelos principales. |
| 4.4.4.2 | `backend/database/migrations/2026_09_30_000015_reglas_integridad.php`:1–162 | Funciones y triggers iniciales; contrastados con migraciones posteriores. |
| 4.4.4.2 / 4.4.4.6 | `backend/database/migrations/2026_09_30_000016_vistas.php`:1–76 | Cinco vistas iniciales; denominador de v_intentos_evaluacion. |
| 4.4.4.2 / 4.4.4.4 | `backend/database/migrations/2026_10_10_224431_preserve_learning_versions_and_publication.php`:1–57 | Protección del historial y excepciones de orden/publicación. |
| 4.4.4.2 / 4.4.4.7 | `backend/database/migrations/2026_10_10_225200_preserve_practice_progress_across_versions.php`:1–54 | Vista vigente de progreso por linaje y origen de recompensa. |
| 4.4.4.2 / 4.4.4.6 | `backend/database/migrations/2026_10_20_144432_add_module_evaluations.php`:1–38 | Evaluación de módulo y unicidad parcial de publicación. |
| 4.4.4.2 | `backend/app/Models/Unidad.php`:1–21 | Tabla, clave, fillable y casts; sin asociación Eloquent declarada. |
| 4.4.4.2 / 4.4.4.3 | `backend/config/auth.php`:1–117 | Proveedor Usuario, guard web y broker de 60 minutos. |
| 4.4.4.3 | `backend/app/Http/Requests/RegisterRequest.php`:1–104 | Reglas de registro, cédula opcional y asignación de rol prohibida. |
| 4.4.4.3 | `backend/app/Http/Controllers/Api/AuthController.php`:1–186 | Registro, acceso local, cierre, cambio y recuperación. |
| 4.4.4.3 | `backend/app/Models/Usuario.php`:1–63 | Cast hashed, campos ocultos y perfil público de cuenta. |
| 4.4.4.3 | `backend/app/Services/AutenticacionPestana.php`:1–44 | Credencial por pestaña y vínculo con huella de contraseña. |
| 4.4.4.3 / 4.4.4.9 | `backend/app/Http/Middleware/SesionPestana.php`:1–38 | Selección del usuario autenticado según pestaña en solicitudes SPA. |
| 4.4.4.3 / 4.4.4.9 | `backend/app/Http/Middleware/CuentaActiva.php`:1–36 | Bloqueo y cambio inicial de contraseña pendiente. |
| 4.4.4.3 / 4.4.4.9 | `backend/app/Http/Middleware/RequireRole.php`:1–18 | Verificación del rol y continuación de la cadena. |
| 4.4.4.3 | `backend/app/Http/Controllers/Web/GoogleAuthController.php`:1–190 | Preparación, state de Socialite, correo verificado y vinculación explícita. |
| 4.4.4.3 | `backend/app/Providers/AppServiceProvider.php`:1–30 | Proveedor de PostgreSQL y notificación de recuperación. |
| 4.4.4.3 / 4.4.4.8 | `frontend/src/js/context/AuthContext.tsx`:1–115 | Eventos de sesión, inactividad y consumidores de la API. |
| 4.4.4.3 / 4.4.4.9 | `backend/bootstrap/app.php`:1–47 | Alias de middleware, statefulApi y respuestas de errores de integridad. |
| 4.4.4.3 / 4.4.4.9 | `backend/config/sanctum.php`:1–87 | Inserción de SesionPestana en subcadena stateful. |
| 4.4.4.3 / 4.4.4.8 / 4.4.4.9 | `backend/routes/api.php`:1–98 | Rutas, grupos por rol y límites de solicitudes. |
| 4.4.4.3 | `backend/routes/web.php`:1–14 | Callbacks Google y verificación firmada de correo. |
| 4.4.4.4 | `backend/app/Http/Controllers/Api/KichwaCatalogController.php`:1–181 | Jerarquía publicada y estados de disponibilidad. |
| 4.4.4.4 | `backend/app/Services/PublicacionContenido.php`:1–61 | Caché versionada y selección de prácticas vigentes. |
| 4.4.4.4 | `backend/app/Services/EstadoContenido.php`:1–91 | Revisión, recursos obligatorios y elegibilidad de preguntas. |
| 4.4.4.4 / 4.4.4.7 | `backend/app/Http/Controllers/Api/KichwaAdminController.php`:1–507 | CRUD, versiones, estudiantes, bloqueo y búsqueda. |
| 4.4.4.4 | `backend/app/Http/Requests/SaveKichwaContentRequest.php`:1–130 | Autorización administrativa y reglas de estructura. |
| 4.4.4.4 | `backend/app/Services/KichwaResource.php`:1–107 | Modelos activos, traducción de campos y exclusión de soluciones. |
| 4.4.4.4 | `backend/database/migrations/2026_10_06_022312_add_publication_and_topic_hierarchy.php`:1–25 | Borrador predeterminado y FK compuesta tema/unidad. |
| 4.4.4.4 | `backend/database/seeders/DatabaseSeeder.php`:1–13 | Semillas vigentes declaradas; no fueron ejecutadas. |
| 4.4.4.4 | `backend/database/seeders/IntermedioMorfemasSeeder.php`:1–68 | Publicación de tema introductorio sin creación de actividades. |
| 4.4.4.4 | `backend/database/seeders/IntermedioDialogosSeeder.php`:1–10 | Especialización del recurso introductorio. |
| 4.4.4.4 / 4.4.4.5 / 4.4.4.8 / 4.4.4.9 | `frontend/src/js/components/GuidedUnit.tsx`:1–339 | Lecciones sin práctica, almacén externo, envío y tratamiento de resultados. |
| 4.4.4.4 | `frontend/src/js/pages/Student/Unit.tsx`:1–40 | Distinción de modos guiado, secuencia y clásico. |
| 4.4.4.4 | `frontend/src/js/components/AdvancedMorphemesIntroduction.tsx`:1–65 | Presentación de lección JSON. |
| 4.4.4.4 | `frontend/src/js/components/ShortDialoguesIntroduction.tsx`:1–118 | Interacción de lectura y diálogos introductorios. |
| 4.4.4.5 | `backend/app/Services/ContratoEjercicio.php`:1–499 | Contrato, validación, corrección, feedback, resultados individuales y normalización. |
| 4.4.4.5 / 4.4.4.6 | `backend/app/Http/Controllers/Api/KichwaSubmissionController.php`:1–277 | Actividad, idempotencia, resultados guiados e intentos de evaluación. |
| 4.4.4.5 | `backend/database/migrations/2026_10_14_144135_track_practice_attempts_and_submissions_on_answers.php`:1–28 | UUID de intento/envío e índice de idempotencia por usuario. |
| 4.4.4.6 | `backend/app/Services/EvaluacionModulo.php`:1–39 | Desbloqueo por unidades previstas y todas sus prácticas correctas. |
| 4.4.4.6 | `backend/app/Services/SecuenciaUnidad.php`:1–95 | Secuencia alternativa de siete prácticas y prueba 6/5. |
| 4.4.4.6 | `backend/database/seeders/ModuloUnoEvaluacionSeeder.php`:1–60 | Configuración de 15 preguntas, puntaje unitario y umbral 80%. |
| 4.4.4.7 | `backend/app/Services/ProgresoAprendizaje.php`:1–101 | Linajes, porcentajes, finalización y próximo paso. |
| 4.4.4.7 | `backend/app/Services/DominioLecciones.php`:1–187 | XP, dominio, medallas y reporte de aprendizaje. |
| 4.4.4.7 | `backend/app/Http/Controllers/Api/KichwaCatalogController.php`:297–325 | Progreso y consulta histórica por usuario. |
| 4.4.4.7 | `backend/app/Http/Controllers/Api/DiccionarioController.php`:1–115 | Búsqueda bidireccional y carga CSV. |
| 4.4.4.7 | `backend/database/migrations/2026_10_06_163017_simplify_diccionario_and_remove_legacy_glossary.php`:1–37 | Tres columnas y retirada de metadatos/glossary. |
| 4.4.4.7 | `backend/database/migrations/2026_10_10_214852_make_dictionary_normalization_independent_of_unaccent.php`:1–39 | Normalización SQL vigente. |
| 4.4.4.7 | `frontend/src/js/components/DictionarySearch.tsx`:1–92 | Búsqueda diferida, dirección, paginación y estados. |
| 4.4.4.8 / 4.4.4.9 | `frontend/src/js/services/api.ts`:1–121 | Fachada HTTP, CSRF, pestaña, errores e invalidación. |
| 4.4.4.8 | `frontend/src/js/hooks/useApi.ts`:1–12 | Consultas mediante TanStack Query y apiGet. |
| 4.4.4.9 | `frontend/src/js/services/guidedAttempt.ts`:1–54 | Almacén, listeners, memoria y sessionStorage. |
| 4.4.4.9 | `backend/vendor/laravel/framework/src/Illuminate/Hashing/HashManager.php`:1–128 | Strategy del framework, creación y delegación a drivers. |
| 4.4.4.9 | `backend/vendor/laravel/framework/src/Illuminate/Validation/ValidatesWhenResolvedTrait.php`:17–42 | Método plantilla de resolución y validación. |
| 4.4.4.9 | `backend/vendor/laravel/framework/src/Illuminate/Foundation/Http/FormRequest.php`:1–35 | Uso del trait y extensión por solicitudes de Yachay. |
| 4.4.4.9 | `backend/vendor/laravel/framework/src/Illuminate/Foundation/Providers/FormRequestServiceProvider.php`:1–39 | afterResolving activa validateResolved(). |
| 4.4.4.9 | `backend/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php`:128–149 | Composición de la cadena del framework. |
| 4.4.4.10 | `frontend/tests/api-security.test.mjs`:1–135 | Pruebas del cliente con fetch y otros servicios aislados. |
| 4.4.4.10 | `frontend/tests/exercise-interaction.test.mjs`:1–135 | Pruebas de interacciones con representación y hooks aislados. |
| 4.4.4.10 | `backend/tests/Unit/Services/ContratoEjercicioTest.php`:1–80 | Ocho casos de corrección/feedback sin base. |
| 4.4.4.10 | `backend/tests/Unit/ExampleTest.php`:1–16 | Caso básico incluido en las nueve pruebas; no aporta cobertura funcional. |
| 4.4.4.10 | `backend/tests/UsesPostgreSQL.php`:1–17 | RefreshDatabase, migraciones y seeding: no ejecutado. |
| 4.4.4.10 | `backend/tests/TestCase.php`:1–25 | Salvaguarda de entorno testing y nombre de base terminado en _test. |
| 4.4.4.10 | `backend/phpunit.xml`:1–35 | Selección de suites y variables de prueba. |

## Extractos auténticos incorporados

Se extrajeron trece bloques del código existente. Únicamente se retiró la sangría común para facilitar la lectura; no se corrigieron ni completaron las líneas. Los bloques de ramas internas conservan su contexto en el rótulo y la explicación. [fragmentos.json](registros/fragmentos.json) conserva el texto, las líneas y el hash del extracto literal antes de retirar la sangría.

| Fragmento | Apartado | Archivo, líneas y método |
| --- | --- | --- |
| F01 | 4.4.4.2 | `backend/database/migrations/2026_09_30_000004_create_unidades_table.php`:14–21; up(). |
| F02 | 4.4.4.3 | `backend/app/Http/Controllers/Api/AuthController.php`:50–62; login(). |
| F03 | 4.4.4.3 | `backend/app/Http/Middleware/RequireRole.php`:11–17; handle(). |
| F04 | 4.4.4.4 | `backend/app/Http/Controllers/Api/KichwaCatalogController.php`:30–35; publishedUnit(). |
| F05 | 4.4.4.4 | `backend/app/Services/EstadoContenido.php`:50–57; assertReady(). |
| F06 | 4.4.4.5 | `backend/app/Services/ContratoEjercicio.php`:419–430; grade(), rama seleccion_multiple. |
| F07 | 4.4.4.5 | `backend/app/Http/Controllers/Api/KichwaSubmissionController.php`:86–96; activity(). |
| F08 | 4.4.4.6 | `backend/app/Http/Controllers/Api/KichwaSubmissionController.php`:204–212; submit(). |
| F09 | 4.4.4.7 | `backend/app/Services/ProgresoAprendizaje.php`:15–28; unitActivities(). |
| F10 | 4.4.4.7 | `backend/app/Http/Controllers/Api/DiccionarioController.php`:18–33; search(). |
| F11 | 4.4.4.8 | `frontend/src/js/services/api.ts`:50–73; apiRequest(), construcción de solicitud. |
| F12 | 4.4.4.8 | `frontend/src/js/services/api.ts`:75–86; apiRequest(), tratamiento de respuesta. |
| F13 | 4.4.4.9 | `frontend/src/js/services/guidedAttempt.ts`:43–54; writeGuidedAttempt() y subscribeGuidedAttempt(). |

## Comprobaciones ejecutadas

Las horas siguientes utilizan UTC−05:00. Se registran el comando reproducible, el resultado y sus límites; la selección evitó operaciones de instalación y pruebas que crean o migran tablas.

| Fecha y hora | Directorio y comando | Resultado | Alcance y registro |
| --- | --- | --- | --- |
| 2026-10-23T10:24:35 | `frontend`: `npm.cmd run typecheck` | Salida 0; sin errores | Tipos TypeScript; no acredita navegación ni API. [Salida](registros/tipos-frontend.txt). |
| 2026-10-23T10:24:37 | `frontend`: `npm.cmd test` | Salida 0; 252 aprobadas, 0 fallidas, 0 omitidas | Suite existente Node; componentes y servicios con dependencias aisladas. [Salida](registros/pruebas-frontend.txt). |
| 2026-10-23T10:24:39 | `backend`: `php -c ../php.ini -d extension_dir=<ext-PHP84> vendor/phpunit/phpunit/phpunit --testsuite Unit --do-not-cache-result` | Salida 0; 9 aprobadas, 12 aserciones | Pruebas unitarias puras; sin base de datos ni pruebas Feature. [Salida](registros/pruebas-unitarias-php.txt). |
| 2026-10-23T10:24:40 | `backend`: `php -c ../php.ini -d extension_dir=<ext-PHP84> artisan route:list --path=api --except-vendor --json` | Salida 0; 116 rutas | Registro de rutas; no ejecuta operaciones de negocio. [Salida](registros/rutas-api.txt). |
| 2026-10-23T10:24:41 | `.`: `php -c php.ini -d extension_dir=<ext-PHP84> documentacion/sprint-3/recursos/auditoria-solo-lectura.php` | Salida 0; READ ONLY=on y ROLLBACK | Metadatos, catálogo y reglas ejecutadas en transacción READ ONLY terminada con ROLLBACK; sin datos de usuarios. [Salida](registros/auditoria-db.txt). |

Los comandos PHP usaron el ejecutable PHP 8.4.22, `-c` con el `php.ini` de la raíz y `-d extension_dir` con la carpeta `ext` de ese ejecutable. El marcador `<ext-PHP84>` no es una credencial. La ruta concreta se resuelve en [ejecutar-comprobaciones.ps1](recursos/ejecutar-comprobaciones.ps1). No se ejecutó `composer test`, que limpia configuración, ni `iniciar.ps1`, que migra y carga semillas. Tampoco se ejecutaron migraciones, seeders, compilación de producción ni pruebas Feature con `RefreshDatabase`.

De las nueve pruebas PHP, ocho pertenecen a `ContratoEjercicioTest` y una es el caso básico `ExampleTest`. No se afirma que las nueve representen nueve funciones distintas del producto. La suite Node aísla hooks, fetch o módulos según el caso; no equivale a una suite integral de navegador. No se reutilizaron las cifras antiguas de 108 pruebas ni 120 rutas.

La auditoría realizó lecturas de metadatos, contenido educativo, selección de prácticas y elegibilidad de preguntas dentro de `SET TRANSACTION READ ONLY`, seguido de `ROLLBACK`. No consultó nombres, correos, cédulas, contraseñas ni resultados de personas. La resolución de middleware y el driver de hash utilizó el contenedor sin enviar una solicitud de negocio. El detalle completo se conserva en [auditoria-db.txt](registros/auditoria-db.txt).

## Observación de interfaz y capturas

Se inició un servidor PHP efímero separado del lanzador del proyecto y un servidor Vite sobre el código existente. El adaptador de captura acepta únicamente GET/OPTIONS, configura sesiones y caché en memoria y aplica `SET default_transaction_read_only = on` a PostgreSQL. Estas opciones se aplicaron a las instancias efímeras; no se editaron archivos de configuración de la aplicación. El frontend utilizó la API real y las consultas del diccionario se procesaron en los controladores existentes. No se interceptaron respuestas para fabricar contenido ni se introdujeron usuarios de muestra.

Las capturas se obtuvieron mediante Microsoft Edge en modo headless con un perfil exclusivo temporal y CDP. Los formularios se encuadraron directamente con la opción clip del navegador; no se modificaron sus elementos. No se enviaron registros, credenciales, recuperaciones, respuestas ni evaluaciones. El primer intento con Chrome no abrió el puerto de depuración; se continuó con Edge. Un selector del script de captura se corrigió y se repitió la captura; el ajuste afectó únicamente a esa utilidad documental.

| Figura | Archivo | Recorrido y resultado observado |
| --- | --- | --- |
| 4.4-1 | [01-iniciar-sesion.png](capturas/01-iniciar-sesion.png) | `/iniciar-sesion`. Formulario sin enviar. Fecha UTC: 2026-10-23T15:51:13.158Z. |
| 4.4-2 | [02-registro.png](capturas/02-registro.png) | `/registro`. Formulario sin enviar. Fecha UTC: 2026-10-23T15:51:14.453Z. |
| 4.4-3 | [03-recuperacion.png](capturas/03-recuperacion.png) | `/recuperar-contrasena`. Formulario sin enviar. Fecha UTC: 2026-10-23T15:51:15.705Z. |
| 4.4-4 | [04-diccionario.png](capturas/04-diccionario.png) | `/diccionario?q=yaku`. Consulta real con resultados de PostgreSQL; sin escritura de datos. Fecha UTC: 2026-10-23T15:51:17.746Z. |
| 4.4-5 | [05-diccionario-inverso.png](capturas/05-diccionario-inverso.png) | `/diccionario`. Consulta real con resultados de PostgreSQL; sin escritura de datos. Fecha UTC: 2026-10-23T15:51:19.734Z. |

El registro de la ejecución conserva 13 respuestas de API observadas: 6 con estado 200 y 7 con estado 204 de la preparación CORS. Se registraron 0 excepciones JavaScript mediante `Runtime.exceptionThrown`. Las dos consultas completadas del diccionario tuvieron estado 200 y mostraron 24 coincidencias. Esto no acredita ausencia de cualquier tipo de error del navegador ni corrección lingüística de todas las entradas. [capturas.json](registros/capturas.json) conserva rutas, estados, encuadre y texto público observado.

## Catálogo, diferencias y límites de aceptación

- Básico: 2 módulos, 9 unidades con modo guiado y 83 prácticas visibles. La distribución por unidad se conserva en inventario-contenidos.csv. Única evaluación publicada: ID 7, 15 preguntas elegibles, 80 %, requisitos sobre las unidades 4–8.
- Intermedio: 2 módulos y 9 unidades visibles. Las unidades 13–17 no tienen temas ni actividades publicados; las 18–21 tienen una introducción publicada cada una y cero actividades publicadas. No hay evaluación publicada de este nivel. «Visible» no se trató como equivalente a «terminado».
- La Unidad 1 básica vigente tiene 6 prácticas guiadas y sus evaluaciones antiguas están ocultas. No se trasladó la descripción antigua del README de 7 prácticas y prueba 6/5 al catálogo actual.
- Diccionario: 3.776 entradas; tres columnas. Las rutas administrativas específicas permiten listado, consulta, alta e importación CSV; no se documentaron edición/borrado por entrada inexistentes.
- Calificaciones: submit usa el máximo de las preguntas seleccionadas; v_intentos_evaluacion utiliza el máximo del banco completo. En la única prueba publicada, banco y selección son de 15 preguntas. En bancos mayores que la selección se requiere evaluar la consistencia histórica; no se modificó el código.
- Progreso: media de porcentajes de unidades para módulos/niveles y razón ponderada por actividades para el resumen global. Las métricas pueden diferir; no se presentaron como una misma fórmula.
- Las marcas `reviewed` son estado técnico; no se inventó aprobación o participación docente. Los umbrales 80 %, 6/5 y los XP se atribuyeron a su configuración o función concreta, no a una regla pedagógica universal.
- Se conservaron fuera del Sprint 3 los requerimientos y cifras de otros apartados, aun cuando presentan diferencias con la implementación. Su reconciliación requiere una revisión documental de alcance diferente.
- La suite Feature y los flujos persistentes permanecen sin ejecución en esta revisión. No se afirma «seguridad garantizada», «sistema completamente probado» ni despliegue realizado.

## Elementos pendientes

Los recorridos exactos, condiciones y limitaciones de las evidencias visuales faltantes se encuentran en [Capturas-pendientes.md](Capturas-pendientes.md). También permanecen pendientes: verificación visual de paginación en Word; integración de autenticación/recuperación/OAuth; escritura de ejercicios/evaluaciones e indicadores derivados; validación lingüística y pruebas con usuarios; compilación y despliegue. No se requiere ninguna de estas operaciones para abrir los entregables generados; sus límites de evidencia están expresados en el contenido académico.

## Reproducibilidad documental

Las utilidades de recursos generan únicamente archivos documentales. `generar-entregables.py` utiliza la biblioteca estándar de Python, la copia fuente en tmp/sprint3 y las capturas; extrae de nuevo los fragmentos y verifica la identidad del XML ajeno al Sprint 3. `generar-informe.py` transforma los registros en este informe y el inventario. La generación no instala paquetes, no invoca migraciones y no guarda el documento Word original. Los adaptadores de captura y la salida del intento COM se conservan también como recursos de auditoría.
