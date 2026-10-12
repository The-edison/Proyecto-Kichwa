# Entrega definitiva: Unidad 1 del Módulo 1

Verificación local: 10 de octubre de 2026. Especificación: `Especificacion_Codex_Unidad1_Kichwa.docx`. Se aplicaron las respuestas posteriores del usuario: sustituir el contenido visible anterior, incorporar tres ilustraciones y desbloquear la prueba al acertar las siete actividades. Implementación en Laravel, React/TypeScript y PostgreSQL, sin nuevas dependencias ni cambios de credenciales. No se realizó un despliegue remoto.

## Resultado publicado

La unidad «Conociendo el Kichwa» tiene una introducción, siete actividades y una sola prueba final. En la base existente corresponde a la unidad 4 del módulo 8; estos identificadores se conservan. El contenido anterior de esta unidad —33 actividades, cinco temas y cuatro evaluaciones— quedó retirado, sin borrar registros. Las otras unidades mantienen sus registros y publicaciones.

| Actividad | Funcionamiento |
| --- | --- |
| 1. Identifica las vocales | Botones A, E, I, O, U, K. Máximo tres selecciones, contador y deselección; comprobar exige tres. Respuesta A, I, U. |
| 2. Reconoce consonantes | SHUNKU, significado corazón; opciones CH, SH, LL. Respuesta SH; el resaltado aparece después de comprobar. |
| 3. Completa la palabra | WA_I; opciones S, M, N. Respuesta S. El editor deriva el hueco y la solución desde la palabra y la posición. |
| 4. Elige la imagen correcta | Flor, corazón y casa para SISA. Respuesta flor. Tarjetas sin etiquetas que revelen el significado, con identificación accesible genérica. |
| 5. Relaciona las palabras | Sisa–Flor, Wasi–Casa, Shunku–Corazón, Purina–Caminar. Destinos desordenados; se puede cambiar la selección; calificación global. |
| 6. Construye una palabra | Fichas A, S, S, I y cuatro espacios. Forma SISA. Las dos S son intercambiables. Permite retirar, mover, deshacer y reiniciar. |
| 7. Escribe lo aprendido | Escribir WASI para Casa; acepta mayúsculas, minúsculas y espacios externos. Calificación y respuesta esperada desde el servidor. |

La introducción explica las vocales A, I, U y las quince consonantes CH, H, K, L, LL, M, N, Ñ, P, R, S, SH, T, W, Y. TS se presenta como complemento. Llama–Oveja permanece pendiente de revisión docente y no se califica.

La prueba aparece después de acertar las siete actividades. Contiene seis preguntas, correspondientes a las actividades 1, 2, 3, 5, 6 y 7, con un punto por pregunta. Se aprueba con cinco de seis. La selección y el orden quedan fijados por intento; el guardado permite recargar y reanudar. Se muestran primer resultado, mejor resultado, aprobación y reintentos. No hay XP por pregunta de la prueba.

Cada actividad nueva concede 10 XP por su primer acierto. Aprobar concede 50 XP por unidad una sola vez. Un estudiante nuevo puede obtener 120 XP; quien ya recibió el premio final anterior conserva ese premio y no recibe otros 50 XP. Las actividades anteriores no desbloquean automáticamente las nuevas. Los aciertos de una actividad nueva se conservan entre versiones de su mismo origen.

## Administración sin modificar código

Entrar como administrador en Contenidos → Básico → Primeros contactos con el Kichwa → Conociendo el Kichwa.

- En Temas se gestiona la introducción; en Actividades, las siete prácticas; en Evaluaciones, la prueba y su banco de seis preguntas.
- Los editores permiten cambiar instrucciones, opciones, soluciones, retroalimentación, palabras, posiciones de huecos, fichas, parejas, imágenes y audios. Los recursos pueden subirse o reutilizarse desde la biblioteca.
- La prueba usa la opción «Prueba corta tras siete actividades». Allí se seleccionan las siete actividades y se ordenan con Subir/Bajar. Ese listado define el orden de la secuencia; no depende del orden general de todos los registros históricos.
- Para publicar se requieren siete actividades distintas de la misma unidad y seis preguntas completas, revisadas, publicadas y de un punto. Las tarjetas visuales exigen sus imágenes. Retirar un requisito bloquea la prueba.
- La vista previa utiliza el mismo motor de interacción y calificación sin crear resultados ni premios de estudiante.
- Un registro usado se cambia mediante «Crear nueva versión». Se edita el borrador y se publica cuando esté revisado; los intentos antiguos conservan su versión original. Las nuevas actividades publicadas del mismo origen mantienen los aciertos previos y no duplican XP.

Los audios son administrables y opcionales para estos siete ejercicios; la especificación definitiva no exige inventar grabaciones ni añadir preguntas de escucha.

## Datos y respaldo

Antes de aplicar la carga definitiva se creó el respaldo PostgreSQL `.verificacion/unidad1-definitiva-before-20261010-235831.dump`. Es privado y no se debe publicar. Se guardó además una comparación de integridad en `.verificacion/unidad1-definitiva-history-before.json`.

Después de aplicar la migración y la semilla, y al terminar la verificación, se compararon los registros originales por sus identificadores y hashes. Permanecen intactas las 33 respuestas de actividad, 11 respuestas de evaluación, dos intentos, 21 premios, ocho registros de progreso y tres inscripciones existentes. También se comprobaron los módulos, unidades y preguntas originales; actividades, temas y evaluaciones conservan sus datos salvo el retiro intencional de publicaciones de esta unidad. Para las otras unidades se comparó también su estado de publicación.

Estado final local: siete actividades publicadas, una introducción publicada, una evaluación publicada y seis preguntas elegibles. Las cuentas y respuestas de comprobación se crearon exclusivamente en una base aislada de verificación.

## Implementación y configuración

`SecuenciaUnidad` resuelve actividades vigentes por origen, verifica requisitos y resume resultados. `DominioLecciones` mantiene premios y progreso; la calificación usa el contrato compartido del backend. `UnitSequence` presenta la secuencia y el desbloqueo. `UnidadUnoDefinitivaSeeder` realiza la sustitución editorial de manera transaccional e idempotente. `DatabaseSeeder` incluye esta semilla definitiva.

La migración `2026_10_10_234314_add_learning_mode_to_units.php` incorpora configuración JSON a las unidades. La unidad usa `learning_mode: sequence`; las otras mantienen su flujo habitual. La prueba usa `sequence_mode: true`, `final: true`, `fixed_order: true`, `question_count: 6`, `required_correct: 5` y `prerequisite_activities` con siete referencias ordenadas. Los editores generan estos campos. Las soluciones y campos que revelan respuestas no se envían al estudiante.

Se requiere PostgreSQL y PHP con GD/WebP, Intl y PDO PostgreSQL. El entorno local usa PostgreSQL en el puerto 5433. Mantener `backend/.env` y sus credenciales. El almacenamiento público debe ser persistente; `KICHWA_PUBLIC_STORAGE_ROOT` permite configurar su ubicación. Las imágenes se entregan mediante el controlador de archivos existente. En otro entorno, configurar las URLs de frontend/API, sesiones y CORS de forma consistente antes de publicar.

Para aplicar el cambio en otra instalación del proyecto, realizar primero un respaldo completo de su base y almacenamiento. Desde `backend`, con la configuración de ese entorno:

```powershell
$phpExt = Join-Path (Split-Path (Get-Command php.exe).Source) 'ext'
php -c ../php.ini -d "extension_dir=$phpExt" artisan migrate --force
php -c ../php.ini -d "extension_dir=$phpExt" artisan db:seed --class=UnidadUnoDefinitivaSeeder --force
```

La semilla busca la unidad por su clave existente; no presupone los identificadores de la base local. Ejecutarla nuevamente no duplica actividades, preguntas ni evaluaciones. Conserva las imágenes fuente y permite recuperar sus copias en el almacenamiento.

## Inicio manual en Windows

Usar dos terminales con PostgreSQL activo y dependencias instaladas. Si los puertos ya están ocupados por el proyecto, utilizar los procesos existentes.

Terminal 1, backend:

```powershell
cd C:\PROYECTOS\Proyecto-Kichwa\backend
$phpExt = Join-Path (Split-Path (Get-Command php.exe).Source) 'ext'
cd public
php -c ../../php.ini -d "extension_dir=$phpExt" -S 127.0.0.1:8000 ../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php
```

Terminal 2, frontend:

```powershell
cd C:\PROYECTOS\Proyecto-Kichwa\frontend
$env:VITE_API_URL = 'http://127.0.0.1:8000'
npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Abrir `http://127.0.0.1:5173`, entrar como estudiante y abrir la Unidad 1. Si había una pestaña abierta, recargar para obtener el catálogo actualizado.

## Verificación ejecutada

- Backend: **102 pruebas aprobadas, 1153 aserciones**, incluyendo diccionario, autenticación, publicación, contratos, versiones, preservación histórica, bloqueo, reanudación, aislamiento de usuarios y premios únicos.
- Frontend: **20 pruebas aprobadas**, TypeScript sin errores y compilación de producción exitosa. Pint pasó en los archivos PHP modificados.
- Navegador con base aislada: recorrido completo de las siete actividades, parejas calificadas globalmente, fichas repetidas, deshacer, escritura normalizada, desbloqueo, recarga y recuperación de las seis respuestas, resultado 6/6 y total de 120 XP.
- Panel en navegador: configuración de las seis preguntas y siete requisitos, creación y guardado de una versión en borrador desde el editor de palabra/hueco, sin errores de formulario.
- Vista a 375, 768 y 1440 píxeles sin desbordamiento horizontal; ilustraciones comprobadas visualmente y texto introductorio completo comprobado después de corregir su carga.
- Base real: migración y carga realizadas, requisitos de publicación verificados y comparación histórica final sin cambios indebidos.

Para repetir pruebas, usar la base de pruebas configurada por el proyecto; no ejecutar migraciones de reinicio contra la base real. `UsesPostgreSQL` utiliza migraciones y transacciones con protección del entorno de pruebas.

```powershell
# Desde backend
$phpExt = Join-Path (Split-Path (Get-Command php.exe).Source) 'ext'
php -c ../php.ini -d "extension_dir=$phpExt" artisan test

# Desde frontend
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

## Ilustraciones incorporadas

Se usó la herramienta integrada `image_gen` y se revisaron las tres imágenes generadas. Las fuentes están en `backend/resources/images/unidad1/flor.png`, `corazon.png` y `casa.png`. La semilla crea versiones WebP de 640 × 640, calidad 85, con nombres opacos basados en SHA-256 para no revelar respuestas en la URL.

Prompts utilizados: una flor reconocible con tallo y dos hojas; un corazón rojo simbólico, sin anatomía; una casa rural andina con techo, puerta y ventana. En los tres casos: ilustración educativa pintada, objeto único centrado, fondo crema claro, silueta legible en móvil, sin texto, números, etiquetas ni marcas de agua. El panel permite sustituirlas por recursos definitivos.

## Recuperación

Para un ajuste editorial, crear y publicar versiones desde el panel. Para volver temporalmente al contenido anterior sin borrar datos, retirar las nuevas publicaciones, cambiar la unidad al modo clásico y volver a publicar los registros históricos elegidos. Revisar padres, bancos y accesos antes de habilitar el recorrido antiguo.

La migración no permite quitar la configuración mientras haya una secuencia activa. Evitar un rollback destructivo o un reinicio de la base. Si fuera necesario recuperar el respaldo, restaurarlo primero en una base distinta, junto con la versión compatible del código y su almacenamiento, verificarla y reconciliar cualquier progreso registrado después del respaldo antes de cambiar la conexión. Una restauración directa sobre la base actual perdería esos avances posteriores.