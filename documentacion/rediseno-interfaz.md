# Interfaz Yachay: violeta y turquesa

El rediseño conserva las rutas, contratos API y operaciones de aprendizaje y administración. Los cambios anteriores presentes en el repositorio se mantienen. No se modificó el backend para esta entrega.

## Diseño

- Violeta para las acciones principales y enlaces; turquesa para progreso y aprendizaje; ámbar para logros y destacados. Los estados cuentan con texto o iconos además del color.
- Tipografía de sistema moderna: Inter si está instalada, seguida de Segoe UI y la fuente del sistema. No depende de una descarga externa. Títulos con peso fuerte y texto con interlineado de 1.6–1.8.
- Cuadrículas responsive, separación de 8/16/24/32 px, tarjetas de 16 px y navegación lateral violeta. Las tarjetas resumen preceden a la acción principal. El administrador dispone de barras y dona con valores y leyendas textuales.
- Tema aplicado en `index.html` antes de cargar React. Usa `prefers-color-scheme` inicialmente, guarda la elección en `yachay-theme` y sigue los cambios del sistema mientras no haya elección guardada. Las superficies, controles, gráficos e ilustraciones cambian mediante variables CSS.
- En oscuro se eliminan las sombras y se distinguen las superficies mediante bordes y tonos. Las imágenes reducen su brillo al 88 %. Las animaciones respetan `prefers-reduced-motion`.
- El menú móvil maneja Tab, Shift+Tab y Escape, desactiva el contenido de fondo y devuelve el foco al botón de apertura. Los menús de perfil y avisos usan controles nativos de expansión.

## Contrastes

Ratios calculados con luminancia relativa sRGB de WCAG. Texto normal ≥ 4.5:1; bordes de controles ≥ 3:1. También se comprueban texto/enlaces sobre fondo, superficie elevada y superficie suave.

| Uso | Par claro (frente / fondo) | Ratio | Par oscuro (frente / fondo) | Ratio |
| --- | --- | ---: | --- | ---: |
| Texto principal | `#1E1B4B / #FFFFFF` | 15.99:1 | `#F5F3FF / #1A1530` | 16.04:1 |
| Texto secundario | `#5B5780 / #FFFFFF` | 6.73:1 | `#B4ADCF / #1A1530` | 8.22:1 |
| Violeta: enlaces e iconos | `#7C3AED / #FFFFFF` | 5.70:1 | `#A78BFA / #1A1530` | 6.46:1 |
| Turquesa: texto e iconos | `#0F766E / #FFFFFF` | 5.47:1 | `#2DD4BF / #1A1530` | 9.45:1 |
| Texto de botón primario | `#F5F3FF / #7C3AED` | 5.20:1 | `#F5F3FF / #7C3AED` | 5.20:1 |
| Texto sobre ámbar | `#1E1B4B / #F59E0B` | 7.44:1 | `#1E1B4B / #FBBF24` | 9.58:1 |
| Borde de campo / superficie | `#82769F / #FFFFFF` | 4.17:1 | `#8B7CAC / #1A1530` | 4.67:1 |
| Éxito | `#0F766E / #E7F7F3` | 4.95:1 | `#2DD4BF / #163734` | 6.92:1 |
| Error | `#B4233A / #FFF0F2` | 5.86:1 | `#FDA4AF / #401F32` | 7.61:1 |
| Advertencia | `#78430B / #FEF3C7` | 7.24:1 | `#FBBF24 / #3A2B17` | 8.18:1 |
| Información | `#4338CA / #EDE9FE` | 6.66:1 | `#C4B5FD / #2E2650` | 7.54:1 |

Los bordes decorativos `#E4DFF7` y `#2E2650` mantienen la paleta solicitada; no se usan como única delimitación de campos. El ámbar intenso sirve como relleno con texto oscuro. Para mensajes de advertencia se emplea el par semántico de la tabla.

## Datos y alcance

Los KPI muestran estudiantes, lecciones y ejercicios disponibles en `/admin/overview`. Los gráficos representan recursos actuales, sin inventar tendencias ni actividad histórica. El estudiante ve progreso, actividades, XP y evaluaciones; no se inventa una racha sin datos. Los logros provienen de `/mastery`. La acción de continuar lleva al nivel en curso porque la API actual no informa la última actividad visitada. Los siguientes pasos son enlaces al recorrido y al diccionario; no son fechas programadas.

La búsqueda superior abre el diccionario o el listado de estudiantes con el término aplicado. La búsqueda del listado sigue consultando todas las cuentas en el servidor; sus controles de estado y orden actúan sobre la página visible y lo indican en sus etiquetas. La paginación y las acciones existentes se conservan. El botón de avisos ofrece orientación sobre los mensajes actuales del recorrido; no representa un servicio nuevo de notificaciones.

## Verificación

Desde `frontend`, ejecutar `npm.cmd run typecheck`, `npm.cmd run build` y `npm.cmd test` (en otros sistemas puede usarse `npm`). Las pruebas incluyen seguridad de sesión, edición e interacción de ejercicios, búsqueda/paginación de estudiantes, contrastes de ambos temas y aplicación inicial del tema con almacenamiento válido, inválido o bloqueado.

Revisión visual en Chrome con datos de prueba interceptados únicamente en el navegador: dashboards de estudiante y administrador en claro/oscuro a 1440 px, móvil a 390 px, menú lateral y retorno de foco. Esta revisión no sustituye una prueba integral contra el backend con cuentas reales.

## Pantallas de nivel y módulo

El nivel incorpora un resumen del recorrido con progreso real de `/progress`, tarjetas independientes de módulos, estados textuales, barras accesibles y acciones para explorar, continuar o repasar. Se mantienen los diagnósticos y ambas paginaciones.

El módulo organiza las unidades en tarjetas que separan objetivo, temas, ejercicios, preguntas y progreso. Los iconos distinguen lectura, secuencia y desafío; las insignias muestran el dominio y las condiciones de desbloqueo. Se conservan los destinos originales de cada tema, las evaluaciones y las paginaciones de temas y unidades. Los objetivos se muestran completos.

Ambas pantallas se verificaron visualmente en claro y oscuro a 1440 y 390 px con datos de prueba, sin desbordamiento horizontal ni errores de JavaScript. También se comprobaron los enlaces a módulos, unidades con tema seleccionado y evaluaciones finales desbloqueadas.

## Gestión administrativa de niveles y módulos

Los niveles se muestran en tarjetas con estado de publicación, cantidad de módulos y accesos de gestión. Los módulos separan título, objetivo y metadatos de la barra de acciones. Ambos listados incluyen un resumen del recorrido, búsqueda que reconoce términos con o sin tildes y filtros de publicación sobre la página visible. Los contadores de publicados y borradores indican explícitamente ese alcance.

Los formularios mantienen sus campos y contratos, con etiquetas más claras, errores asociados a los controles, cierre visible y foco inicial en el primer campo. Las operaciones existentes de crear, editar, publicar, retirar publicación, ordenar y eliminar conservan las comprobaciones y confirmaciones originales.

Se revisaron ambos listados en claro y oscuro a 1440 y 390 px. Con solicitudes interceptadas únicamente para la revisión se verificaron los filtros, la búsqueda, el foco del editor, la creación de módulos, la edición de niveles, la publicación, el cambio de orden y la eliminación. También se confirmó que un registro con dependencias no dispara la solicitud de eliminación. No se realizaron mutaciones sobre el backend real.

## Gestión administrativa de unidades

Las unidades reutilizan el catálogo de niveles y módulos, con el módulo de origen visible, contadores, objetivos completos y accesos a temas y actividades. El listado identifica el modo de aprendizaje configurado en cada unidad: secuencia guiada o recorrido por temas. La búsqueda local incluye títulos y objetivos; los filtros de publicación y contadores mantienen el alcance de la página visible.

El formulario conserva el título, objetivo y opción de aprendizaje en secuencia, presentados con el mismo estilo del catálogo. Se mantienen las rutas, campos enviados, paginación, comprobación de dependencias y confirmaciones de las operaciones originales.

Verificación en Chrome con datos y solicitudes interceptados para la revisión, en ambos temas a 1440, 768 y 390 px: enlaces a unidades, búsqueda por objetivo, filtros, estado vacío, creación, edición, configuración del modo de aprendizaje, publicación, retirada de publicación, cambio de orden, protección de dependencias y eliminación. No se detectaron errores de JavaScript ni desbordamiento horizontal y no se modificó el backend real.

## Estudiantes, cuenta y menús por rol

El directorio administrativo reúne búsqueda, filtros y ordenamiento en una superficie con resumen de cuentas. La tabla se transforma en tarjetas en móvil y conserva su semántica y las acciones de progreso y acceso. Los resultados se presentan en un diálogo con XP, dominio, unidades, insignias y evaluaciones reales; el teclado permanece dentro del diálogo y al cerrarlo el foco regresa al botón de origen. La búsqueda y paginación siguen consultando el servidor; los filtros y contadores de estado indican que corresponden a la página actual.

Mi cuenta comparte diseño entre ambos roles: identidad y estado del correo, navegación por secciones, datos personales, métodos de acceso y seguridad. Se conservan el cambio obligatorio de contraseña inicial, los contratos de contraseña y verificación, la redirección según el rol y la vinculación con Google. Los campos permiten mostrar la contraseña y asocian los errores de validación con sus etiquetas.

Los menús laterales separan gestión o aprendizaje, recursos y cuenta. El desplegable de perfil organiza identidad, cuenta, navegación del rol, inicio y cierre de sesión. Se cierra al navegar, hacer clic fuera o pulsar Escape; solo puede estar abierto un desplegable superior a la vez. Las superficies usan las variables del tema existente y respetan sus contrastes, estados de foco y movimiento reducido.

Verificación: TypeScript, compilación de producción y 29 pruebas aprobadas. Revisión visual en Chrome a 1440 y 390 px con ambos temas y roles, sin errores de ejecución ni desbordamiento horizontal. Con datos y solicitudes interceptados se comprobaron búsqueda, paginación, filtros, cambio de estado, diálogo y retorno del foco, jerarquía y cierre de menús, visibilidad de contraseñas, errores asociados a campos, verificación de correo, error de vinculación, Google conectado o deshabilitado y cambio obligatorio de contraseña con redirección. No se enviaron correos ni se modificaron cuentas reales; queda fuera de esta revisión la integración con el backend y OAuth reales.
