# Correcciones y optimización de Yachay
Revisión local del 5 de octubre de 2026. Este informe complementa la auditoría inicial; los resultados siguientes corresponden a esta revisión.

## 1. Causa comprobada del fallo de módulos
Antes de modificar el código se buscó el texto en bootstrap/app.php, se reprodujo la solicitud y se revisaron los errores SQL del log de Laravel. El frontend inicializaba sort_order en 1 para cada creación. El INSERT real fue a modulos, con id_nivel=1 y orden_modulo=1; PostgreSQL rechazó la restricción **modulos_id_nivel_orden_modulo_key**, porque ese orden ya estaba ocupado dentro del nivel. No fue un conflicto de correo/cédula ni una inserción en otra tabla. El orden 900000 del seeder técnico no era la restricción infringida en esa solicitud.

El manejador global convertía cualquier SQLSTATE 23505 en «El correo, la cédula o el orden ya está registrado». ErroresIntegridad ahora identifica la restricción conocida y devuelve HTTP 422 con message y errors del campo correspondiente. Para módulos: errors.sort_order contiene «Ya existe un módulo con ese orden en este nivel». Correo, cédula, órdenes de otros recursos y pares del diccionario tienen mensajes propios; no se revela SQL.

Crear ya no exige escribir un orden. OrdenContenido abre una transacción, bloquea la fila del padre y asigna max(orden)+1; la restricción UNIQUE permanece como última defensa. Aplica a módulos, unidades, temas, actividades y preguntas. El reordenamiento bloquea el mismo padre y utiliza un valor temporal libre para intercambiar posiciones. El API conserva orden explícito para clientes existentes, con error específico si colisiona. FormRequest valida padres dentro de los dos niveles admitidos, y tema/unidad coincidentes; una FK compuesta protege también esta pertenencia.

## 2. Jerarquía y publicación
Administrador: niveles fijos → módulos → unidades → temas → actividades; las evaluaciones se gestionan desde la unidad y sus preguntas desde la evaluación. Cada pantalla consulta sólo su padre, con 20 registros por página; no descarga el árbol completo. Incluye migas de pan, estados vacíos, CRUD, subida de medios, publicación y botones de reordenamiento. Editar obtiene únicamente el registro seleccionado, sin descargar soluciones de todas las filas.

Se añadieron borrador/publicado a módulos, unidades y temas. Los registros anteriores se marcan publicados para conservar su disponibilidad; las nuevas creaciones nacen en borrador. El alumno debe encontrar publicados todos los padres. Intermedio muestra «Próximamente» hasta tener un módulo publicado; al publicarlo se habilitan navegación, actividades y progreso de ese nivel. Esto actualiza la reserva permanente de Intermedio que figuraba en la primera entrega.

Las actividades anteriores conservan id_tema nulo y aparecen como actividades de la unidad. Las nuevas pueden asociarse a un tema; no se reasignó material automáticamente. El orden sigue siendo único dentro de la unidad, conforme al MER existente; el botón de reordenar un tema intercambia sus propias actividades.

Las vistas de progreso se ajustaron para excluir borradores y contar unidades publicadas aún no iniciadas como cero. El catálogo compartido se guarda cinco minutos con invalidación por versión; el progreso de cada usuario se calcula aparte. Los temas muestran además el porcentaje de actividades correctamente resueltas, mediante una consulta agrupada y limitada a la página, sin consultas por fila.

Eliminar consulta dependencias y muestra cantidades de hijos/respuestas. Se conserva FK RESTRICT: HTTP 409 impide borrar contenido con historia. Los triggers siguen congelando actividades y preguntas ya utilizadas, con una excepción nueva para cambiar exclusivamente su orden.

## 3. Diccionario
GET /api/diccionario/buscar?q=&direccion=kichwa-es|es-kichwa&page= devuelve como máximo 20 entradas; consulta vacía sugiere cinco. Dos paneles apilables, intercambio que conserva el texto, búsqueda con debounce de 300 ms y AbortSignal, limpiar/copiar, mensajes de ayuda y sin coincidencias. Busca por idioma origen; normaliza mayúsculas y tildes, prioriza prefijo y después coincidencias internas. Los comodines escritos por el usuario se tratan como texto literal.

La migración nueva instala unaccent y pg_trgm, función normalizadora e índices GIN por expresión para ambas columnas. Se añadieron sinónimos y notas, visibles en los resultados. No se inventan equivalencias ni se traduce una frase desconocida.

El administrador conserva CRUD y POST /api/admin/glossary/import. CSV UTF-8, separador coma o punto y coma, cabeceras kichwa,spanish; synonyms,notes opcionales. Máximo 2 MB y 10.000 filas por archivo. Se valida todo antes de insertar en transacción, por lotes de 500; los duplicados se omiten conservando el registro anterior. Un archivo inválido no importa parcialmente. Rol administrador y límite de frecuencia; los datos [DEMO] se rechazan fuera de local/testing.

## 4. SPA, consultas y medios
React Router reemplaza navegación con recarga. Formularios interceptan submit; los cambios de autenticación usan navegación SPA. La redirección externa de Google permanece como navegación de OAuth. TanStack Query deduplica peticiones por clave y conserva datos cinco minutos; limpia caché al cambiar sesión. Las mutaciones actualizan el elemento de la página administrativa sin GET de toda la lista; invalidan otras claves sin refetch inmediato. La invalidación distingue diccionario, jerarquía y progreso.

Se añadieron skeletons, toasts, validación junto a campos, protección de doble envío y bloqueo de Guardar mientras se sube un archivo. Rutas con React.lazy/Suspense. Listas paginadas y DTO de resumen; el cuerpo completo del tema se carga al seleccionarlo. Nunca se selecciona ni entrega la solución a estudiantes.

El dashboard administrativo usa una consulta con cuatro contadores; la vista de módulos del alumno ya no solicita unidades por cada módulo. Sanctum reutiliza request->user(). Las imágenes tienen carga diferida; audio carga metadatos. Imágenes subidas se limitan a 1600 px en el lado mayor y se recodifican a WebP, eliminando metadatos. Medios: ETag, respuesta 304, Cache-Control immutable por un año y soporte de rangos de audio. El JSON negociado con gzip se comprime a partir de 512 bytes; respeta gzip;q=0.

Para servir frontend/dist con gzip y caché de assets de nombre hash se entrega nginx-estaticos.conf.example. Es un fragmento para integrar en el servidor HTTP del despliegue, con referencias oficiales de [gzip](https://nginx.org/en/docs/http/ngx_http_gzip_module.html) y [cabeceras](https://nginx.org/en/docs/http/ngx_http_headers_module.html). No se instaló ni desplegó Nginx en Windows; Vite sigue siendo el servidor de desarrollo.

## 5. Mediciones antes/después
Instrumentación temporal DB::listen y hrtime, sin añadir Telescope ni dejar diagnóstico activo. Se ejecutó el controlador anterior recuperado del commit c5aa861 y el actual sobre el mismo conjunto local: 3 módulos, 3 unidades, 8 actividades y 1 entrada del diccionario. Once ejecuciones por caso, primera descartada; mediana de diez. No incluye autenticación, red ni renderizado: no equivale a latencia de producción.

| Pantalla/operación | Antes | Después |
| --- | --- | --- |
| Dashboard admin, consultas SQL | 8 | 1 (−87,5%) |
| Dashboard admin, mediana del controlador | 4,12 ms | 0,34 ms |
| Dashboard admin, mediana SQL | 2,07 ms | 0,30 ms |
| Peticiones de datos del dashboard | 4 listas | 1 resumen |
| Niveles admin, consultas SQL | 1 | 0 con caché caliente |
| Niveles admin, mediana | 0,49 ms | 0,40 ms |
| Lista de módulos admin, consultas SQL | 2 | 2 |
| Lista de módulos admin, mediana | 0,89 ms | 0,82 ms |
| Creación de cuatro ejercicios desde navegador | Recargaba lista según código anterior | 0 documentos nuevos, 0 GET de lista |
| Navegación móvil/tablet/escritorio | Enlaces nativos | 0 documentos nuevos; variable de ventana conservada |
| Búsqueda rápida c → co → cod → codigo | Sin debounce | 1 GET final tras debounce (OPTIONS es preflight) |
| Chunk JS principal, sin comprimir | 302,32 kB | 228,12 kB (−24,5%) |
| Chunk JS principal, gzip | 90,59 kB | 71,88 kB |

El nuevo chunk compartido de navegación/datos pesa 79,13 kB (26,68 kB gzip). La reducción del chunk principal **no implica reducir todos los bytes iniciales**: Router/Query añaden código compartido, compensado por separar rutas. Editor administrativo: 21,78 kB (7,01 kB gzip), cargado sólo cuando se usa. El fondo original conserva 825,60 kB; sigue siendo el mayor asset. No se afirma haber medido Lighthouse ni la carga real de un diccionario de 2.800 entradas: esa carga debe comprobarse al importar el corpus validado.

## 6. Verificación ejecutada
- php artisan test: **44 pruebas, 346 assertions, todas aprobadas**, sobre la base separada *_test. Incluye órdenes consecutivos/duplicados, padre inválido, 403, publicación, Intermedio dinámico, pertenencia tema/unidad, RESTRICT, inmutabilidad con reordenamiento, diccionario normalizado/paginado, CSV atómico y protección de datos técnicos.
- Pint aprobado; npm.cmd run typecheck y npm.cmd run build aprobados; npm.cmd audit: 0 vulnerabilidades.
- Imágenes: prueba de reducción 2000×1000 a 1600×800, formato WebP, ETag/304. Gzip negociado y cache invalidada comprobados.
- Las 28 migraciones figuran Ran en la base de trabajo y se usan igualmente en pruebas. Reinicio con iniciar.ps1 -PostgreSQL -Reiniciar ejecutado; frontend/API responden HTTP 200.

### Recorrido real en Edge
1. Entrar como administrador; abrir niveles y Básico.
2. Crear «Flujo SPA A» y «Flujo SPA B» consecutivamente, sin orden manual ni error de unicidad; publicar A.
3. Abrir A y crear «Unidad SPA A» y «Unidad SPA B» consecutivamente; publicar A.
4. Crear y publicar «Tema SPA»; comprobar migas de pan.
5. Crear desde el editor los cuatro tipos: selección múltiple con imagen/audio, completar con audio, relacionar imagen/palabra y arrastrar sobre fondo con zonas. Probar cada vista previa; guardar. La red registró cero recargas y cero GET de lista tras estas creaciones.
6. Cerrar sesión mediante SPA; entrar como estudiante; recorrer Básico → módulo → unidad → tema.
7. Resolver correctamente los cuatro ejercicios. En arrastrar se usaron eventos táctiles reales del navegador: tocar etiqueta y zona; también hay selectores accesibles por teclado.
8. Revisar a **375, 768 y 1440 px**, sin desbordamiento horizontal. La comprobación final conservó la variable de ventana tras navegar.
9. Diccionario: «codigo» encuentra «Código» sin tilde; intercambiar conserva texto. Español → Kichwa con «entrada tecnica» devuelve la entrada completa, notas y sinónimos. Datos de verificación exclusivamente locales.

Evidencia: [móvil](evidencia/revision-movil-375.png), [tablet](evidencia/revision-tablet-768.png), [escritorio](evidencia/revision-escritorio-1440.png), [diccionario móvil](evidencia/revision-diccionario-375.png), [jerarquía administrativa](evidencia/revision-admin-1440.png). La comprobación final del administrador también pasó a 375/768/1440 px, con cero errores de JavaScript registrados.

## 7. Archivos y limpieza
[Inventario completo A/M/D](archivos-correcciones.txt) enumera archivos creados, modificados y eliminados desde c5aa861; incluye el primer commit de la corrección de órdenes.

Commits de implementación: f86a7dd (órdenes y unicidad), 4e105bd (API, publicación, diccionario y medios), ade5662 (SPA y experiencia), 91e7424 (limpieza). La documentación y el reinicio se guardan en un commit posterior.

Antes de retirar código se buscaron sus referencias en rutas, controladores, modelos, servicios, seeders y pruebas del repositorio activo. Se eliminaron 15 controladores/helpers ingleses sin rutas, 12 modelos ingleses y 3 servicios de la capa duplicada; también cuatro copias de pruebas archivadas. Se retiraron métodos muertos de opiniones y configuraciones de conexiones SQL no soportadas. La configuración de cola deja de asumir SQLite. Los originales permanecen en Git.

Se conservan User/Role/Testimonial necesarios para opiniones públicas anteriores; todas las tablas y migraciones aplicadas se conservan. No se encontró un sistema activo de homologación. No se borraron datos ni credenciales existentes. No se añadió contenido docente definitivo. El seeder técnico sólo funciona en local/testing y nunca se ejecuta por defecto.

## 8. Migraciones y reinicio
La configuración privada PostgreSQL (puerto 5433) permanece fuera de Git. Para aplicar esta revisión en otra copia existente:

```powershell
Set-Location C:\PROYECTOS\Proyecto-Kichwa\backend
composer install
php artisan config:clear
php artisan migrate --pretend
php artisan migrate
php artisan migrate:status
php artisan cache:clear
php artisan test
Set-Location ..\frontend
npm.cmd ci
npm.cmd run typecheck
npm.cmd run build
Set-Location ..
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\iniciar.ps1 -PostgreSQL -Reiniciar
```

No ejecutar migrate:fresh. Nuevas migraciones:
- 2026_10_06_022312_add_publication_and_topic_hierarchy.
- 2026_10_06_022314_optimize_dictionary_search: scaffold vacío que llegó a ejecutarse; se conserva como registro histórico, sin efecto SQL.
- 2026_10_06_022725_add_dictionary_search_indexes_and_metadata: implementación efectiva del diccionario.
- 2026_10_06_022726_allow_safe_reordering_of_used_exercises.

La instalación de extensiones requiere permisos de PostgreSQL para CREATE EXTENSION; el rol local usado tiene esos permisos. Crear índices puede bloquear escritura durante la migración: programar ventana de mantenimiento si el corpus crece mucho. El lanzador -Reiniciar sólo detiene php/node de este proyecto que ocupen 8000/5173; rechaza detener procesos ajenos.

## 9. Límites conocidos
Google real y SMTP requieren credenciales del propietario, como en la entrega anterior. Opiniones de estudiantes siguen reservadas; no se implementó otra política de habilitación. El contenido técnico local no sustituye validación lingüística docente. La navegación y el toque se comprobaron con emulación Edge; conviene confirmar audio y gestos en un teléfono físico. La compresión estática del despliegue requiere integrar el fragmento del servidor HTTP; no hubo despliegue de producción. Las mediciones pequeñas locales no garantizan el rendimiento del corpus completo o de tráfico concurrente; el bloqueo de órdenes está implementado, pero no se ejecutó una prueba de estrés concurrente.
