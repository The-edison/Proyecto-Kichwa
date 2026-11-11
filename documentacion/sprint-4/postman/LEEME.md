# Yachay — pruebas de integración API REST

Material para el apartado **4.5.3.3 del Sprint 4**. Incluye **156 casos PI**, con aserciones automáticas y criterios de aceptación. Las rutas se contrastaron con `php artisan route:list --path=api --json`, los controladores, `KichwaResource`, Sanctum y los middlewares de rol y cuenta activa. No se modificó la aplicación.

## Ejecutar las pruebas seguras en producción

1. En Postman actualizado, pulsa **Import** e importa `Yachay-Sprint4.postman_collection.json` y `Yachay-Produccion.postman_environment.json`.
2. Selecciona el entorno **Yachay · Producción · Solo lectura**. Su `base_url` ya es `https://yachay-kichwa.devs-ueb.tech`, sin `/api` al final.
3. Abre la colección, pulsa **Run**, deja **1 iteración**, configura **250 ms de demora** y ejecuta con **Collection Runner**. Conserva la validación TLS y activa la opción de detener la ejecución ante errores de script/transporte.

Puedes ejecutar toda la colección: por defecto solo se envían **23 GET públicos/anónimos**. Los casos sin sesión y todos los de escritura se omiten antes de enviar la solicitud. Para un informe más fácil de revisar, selecciona únicamente las carpetas **01 y 02**.

No se necesitan cuentas ni contraseñas para esos 23 casos. Una solicitud omitida **no está aprobada**: no ejecuta sus aserciones de respuesta. La consola de Postman indica el código PI y el motivo con `OMITIDA`; la variable local `pi_omitted` cuenta las omisiones. No uses esta cifra como cantidad de aprobaciones.

## Organización y criterios

| Carpeta | Códigos | Casos | Alcance |
| --- | --- | ---: | --- |
| 01. Consultas públicas | PI-01 a PI-16 | 16 | Configuración, privacidad, diccionario, búsquedas, paginación, validación, opiniones y rutas de archivos no permitidas. |
| 02. Sin sesión | PI-17 a PI-23 | 7 | HTTP 401 y mensaje JSON para rutas protegidas, sin redirecciones al login. |
| 03. Lecturas de estudiante | PI-24 a PI-42 | 19 | Catálogo publicado, lecciones, ejercicios sin soluciones, evaluaciones, dominio y acceso por rol. |
| 04. Lecturas administrativas | PI-43 a PI-69 | 27 | Perfil, contadores, listados, detalle, dependencias, archivos y separación de roles. |
| 05. Validaciones y autenticación | PI-70 a PI-91 | 22 | **Solo testing**: login opcional, solicitudes inválidas y restricciones de escritura. |
| 06. Flujo de integración | PI-92 a PI-152 | 61 | **Solo testing**: crear/leer/actualizar/reordenar jerarquía temporal, corregir respuestas, idempotencia, resultado guiado, evaluación, borrador, aislamiento y abandono. |
| 07. Eliminación desechable | PI-153 a PI-156 | 4 | **Solo testing**: crear un nivel sin historial, consultar dependencias, eliminarlo y verificar 404. |

`matriz-pruebas.csv` describe cada PI, método, ruta, sesión y criterio de aceptación; puedes abrirlo en Excel usando UTF-8. La descripción de cada solicitud contiene el mismo criterio. Los scripts comprueban el HTTP exacto, JSON válido y los campos y tipos pertinentes, según cada caso. Las respuestas satisfactorias JSON también comprueban `nosniff` y `Cache-Control: no-store`; se tolera que una directiva se repita entre cabeceras combinadas.

Los identificadores se descubren desde respuestas anteriores; no se fijaron IDs de unidades o estudiantes reales. Un catálogo vacío puede provocar omisiones dependientes y se debe registrar como tal. En el grupo 03, `sequence` y `guided` solo se prueban si la unidad descubierta tiene ese modo. Los listados pueden estar vacíos sin incumplir su contrato. Las búsquedas positivas usan una entrada obtenida del diccionario y exigen al menos una coincidencia; la búsqueda negativa exige cero.

## Consultas privadas opcionales

Para ejecutar 03 o 04, introduce en el **valor local** del entorno un token Sanctum de una **cuenta dedicada a verificación**:

- `student_token`: estudiante activo sin cambio obligatorio de contraseña pendiente.
- `admin_token`: administrador activo sin cambio obligatorio pendiente.
- `other_student_token`: otro estudiante dedicado; solo necesario para PI-138, aislamiento de intentos, en testing. Consulta la matriz si cambian los códigos al regenerar.

No hay tokens reales en los archivos entregados. Conserva los valores en tu equipo, no los compartas ni exportes con la evidencia. Los resultados privados pueden contener nombres, correos, cédulas, historial o soluciones administrativas: no publiques esos cuerpos sin anonimizar.

Se usa **Bearer Sanctum**. Las cookies están desactivadas y cada solicitud elimina `Cookie`, `Origin` y `Referer`. Esto utiliza el acceso stateless admitido por `AuthController`; no modifica ni desactiva Sanctum, CSRF o los roles. No importes cookies de una sesión de navegador. El inicio de sesión web habitual también utiliza `X-Tab-Session`; ese flujo y Google OAuth no se suplantan con un token artificial.

## Pruebas que modifican datos: únicamente en una copia de pruebas

1. Importa `Yachay-Testing.postman_environment.json` y selecciona ese entorno.
2. Usa una base de datos aislada, con las migraciones y contenido de pruebas cargados. Necesitas cuentas dedicadas de estudiante y administrador, ambas activas. No uses cuentas de personas reales ni una base conectada a producción.
3. Configura `base_url` con el origen del servidor de pruebas, `allowed_test_origin` con **el mismo origen**, `target_env=testing` y `allow_writes=true`.
4. Introduce `student_token` y `admin_token`, y opcionalmente `other_student_token`. Ejecuta la colección una sola vez, en el orden entregado y con 250 ms de demora.

Alternativa: deja vacíos los tokens y configura localmente `student_identifier`, `student_password`, `admin_identifier` y `admin_password`. PI-70 y PI-71 hacen login stateless y conservan los tokens solo durante la ejecución. En esta alternativa los grupos privados 03 y 04, que se ejecutan antes del login, se omiten; para comprobarlos, proporciona los tokens o ejecútalos por separado después de autenticar. Los archivos contienen esas variables **vacías**, sin credenciales.

Los bloqueos se aplican también a las solicitudes individuales: los grupos 05–07 requieren los tres valores de habilitación y rechazan el dominio de producción, sus subdominios y sus variantes de mayúsculas/punto final. No se siguen redirecciones. HTTP sin TLS solo se permite en localhost. El operador debe comprobar que el origen de pruebas y su base de datos estén realmente aislados; un alias DNS de producción no puede detectarse desde un script de Postman.

**Importante:** estos `GET` crean registros aunque su método sea de consulta y por eso se encuentran exclusivamente en el grupo 06:

- `/api/levels/{level}/modules`: `UsuarioNivel::firstOrCreate`.
- `/api/units/{unit}/contents`: `ProgresoUnidad::firstOrCreate`.
- `/api/progress` y `/api/progress/levels/{level}`: matrículas mediante `levelProgress`.

Los fixtures se identifican con `PI` y un UUID de ejecución. Las escrituras posteriores usan sus IDs capturados, no IDs suministrados por una persona. Los fixtures principales se despublican al finalizar. Los intentos, respuestas y recompensas **se conservan**, porque la aplicación protege su historial; la limpieza completa consiste en restaurar la copia de pruebas, no en borrar respuestas o desactivar triggers. Si interrumpes la ejecución, restaura esa copia; no asumas que las solicitudes finales de limpieza se ejecutaron. La eliminación real automatizada solo afecta al nivel desechable y a una versión nueva sin respuestas.

## Cobertura y límites explícitos

`cobertura-rutas.csv` inventaría **116 combinaciones de método y ruta Laravel**; **96 tienen casos definidos**. Tener un caso no demuestra que todas las variantes de esa ruta estén cubiertas o hayan pasado. Los 20 métodos/rutas restantes tienen su motivo indicado. `HEAD` implícito no se cuenta como caso separado.

No se ejecutan automáticamente envíos válidos de registro, recuperación o verificación de correo; cambios válidos de contraseña/avatar; importación o carga binaria válidas; publicación de opiniones reales; bloqueo de alumnos; ni OAuth. Pueden enviar correos, revocar sesiones, dejar archivos o alterar perfiles. Sus validaciones controladas están incluidas cuando procede. El logout revoca **todos** los tokens del usuario y se reserva para una cuenta desechable en una prueba manual independiente.

Las descargas binarias positivas requieren un archivo de prueba conocido; se incluyen rechazos de rutas/nombres no permitidos sin cargar archivos en producción. Las variantes de versionado de bancos, borrado de jerarquías con historial, movimientos no implementados y consultas con datos personales adicionales están inventariadas para pruebas manuales o ampliaciones con fixtures específicos.

No hay pruebas de carga, fuerza bruta, repetición hasta 429 ni operaciones contra otros usuarios reales. No se establece una latencia máxima arbitraria; el Runner y el informe HTTP registran el tiempo observado.

## Evidencias para la tesis

Conserva tras **tu ejecución de Postman Runner**:

1. El archivo exportado del resultado del Runner, si tu versión lo permite; si no, las capturas del resumen y de los detalles por PI.
2. Fecha/hora, entorno elegido, versión de Postman, una iteración, demora y selección de carpetas.
3. Cantidades separadas de solicitudes ejecutadas, casos aprobados, fallidos y omitidos; no confundas **casos PI** con **aserciones**, porque un PI puede tener varias.
4. Capturas de HTTP y aserciones de, por ejemplo, PI-01, PI-05, PI-09, PI-17 y PI-21, sin credenciales. Para pruebas privadas, anonimiza la información personal.
5. La colección, el entorno vacío y `matriz-pruebas.csv` usados. Mantén la verificación TLS activa. Un fallo se registra y analiza; no se cambia el HTTP esperado para ocultarlo.

Los archivos entregados distinguen:

- `validacion-estatica.json`: rutas reales contrastadas, sintaxis de los scripts y simulaciones del **bloqueo previo al envío**. No demuestra resultados de la API.
- `comprobacion-publica-http.json`: solicitudes HTTP reales contra producción usando Node.js y las mismas aserciones de PI-01 a PI-23. Incluye estado, fecha, cabeceras públicas, duración y resultados. **No es una exportación de Postman Runner** y no sustituye esa evidencia de la herramienta.
- No se adjuntan respuestas Postman prefabricadas ni cuerpos completos de usuarios. Los grupos autenticados y de escritura no se presentan como ejecutados si no se proporcionaron sus precondiciones.

## Reproducibilidad

Desde la raíz del repositorio:

```powershell
node documentacion/sprint-4/postman/recursos/generar.mjs
node documentacion/sprint-4/postman/recursos/validar.mjs
```

El primer comando regenera la colección, entornos y matriz; el segundo usa Laravel para contrastar rutas y comprueba los scripts y bloqueos sin enviar solicitudes a la API. No requiere instalar paquetes ni modifica la aplicación. Para repetir **solo** la comprobación HTTP pública real, ejecuta deliberadamente:

```powershell
node documentacion/sprint-4/postman/recursos/comprobar-publicas.mjs
```

Ese último comando sí hace 23 GET y reemplaza el informe HTTP con resultados nuevos. No lo uses como sustituto del Runner cuando la tesis exija evidencias de Postman. Los resultados adjuntos corresponden a PI-01–PI-23 y sus scripts finales; cambios posteriores de rutas o aserciones necesitan una nueva ejecución identificada como tal. Los nuevos informes generados por ese comando incluyen también el SHA-256 de la colección utilizada.

Referencias oficiales: [Collection v2.1](https://schema.postman.com/json/collection/v2.1.0/docs/index.html), [Collection Runner](https://learning.postman.com/latest-v-12/docs/tests-and-scripts/running-collections/intro-to-collection-runs) y [omitir solicitudes con pm.execution.skipRequest](https://learning.postman.com/latest-v-12/docs/tests-and-scripts/write-scripts/postman-sandbox-reference/pm-execution).
