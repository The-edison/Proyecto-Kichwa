# Diagramas de patrones GoF de Yachay

Revisión del código disponible el 16 de octubre de 2026. Esta entrega documenta patrones existentes; no modifica el código del sistema.

## Archivos entregados

El archivo [Yachay_Patrones_GoF.drawio](Yachay_Patrones_GoF.drawio) contiene cinco páginas editables. También se incluyen archivos independientes y sus versiones vectoriales:

| Página | Archivo editable | Imagen vectorial |
| --- | --- | --- |
| Observer | [01_Observer.drawio](patrones-gof/01_Observer.drawio) | [01_Observer.svg](patrones-gof/01_Observer.svg) |
| Facade | [02_Facade.drawio](patrones-gof/02_Facade.drawio) | [02_Facade.svg](patrones-gof/02_Facade.svg) |
| Strategy | [03_Strategy.drawio](patrones-gof/03_Strategy.drawio) | [03_Strategy.svg](patrones-gof/03_Strategy.svg) |
| Template Method | [04_Template_Method.drawio](patrones-gof/04_Template_Method.drawio) | [04_Template_Method.svg](patrones-gof/04_Template_Method.svg) |
| Chain of Responsibility | [05_Chain_of_Responsibility.drawio](patrones-gof/05_Chain_of_Responsibility.drawio) | [05_Chain_of_Responsibility.svg](patrones-gof/05_Chain_of_Responsibility.svg) |

Los SVG se generan desde la misma geometría vectorial utilizada para construir los archivos draw.io. Los archivos draw.io contienen formas, textos y conectores editables; no son imágenes incrustadas.

## Observer — comportamiento

El almacén funcional de intentos guiados aplica Observer al mantener el estado y un registro de callbacks suscritos por clave, que son notificados cuando se escribe un nuevo intento. GuidedUnit se integra mediante useSyncExternalStore(), vuelve a leer el snapshot al recibir el aviso y permite cancelar la suscripción mediante la función devuelta por el almacén.

La página utiliza bloques funcionales para representar funciones, datos y callbacks reales. La repetición de GuidedUnit distingue su colaboración como suscriptor y como emisor de cambios; no representa componentes adicionales ni clases Observer inventadas.

Archivos de respaldo:

- [guidedAttempt.ts](../../frontend/src/js/services/guidedAttempt.ts): mapas drafts/listeners, readGuidedAttempt(), writeGuidedAttempt(), subscribeGuidedAttempt() y closure de cancelación.
- [GuidedUnit.tsx](../../frontend/src/js/components/GuidedUnit.tsx): importación y uso de useSyncExternalStore(), lectura del almacén y actualización mediante writeGuidedAttempt().

## Facade — estructural

El módulo api.ts proporciona una fachada funcional que simplifica la comunicación de los clientes mediante apiGet(), apiPost(), apiPatch() y apiDelete(). apiRequest() concentra la coordinación de Fetch, CSRF, credenciales de pestaña, tratamiento de errores e invalidación de consultas, y emite un evento del navegador cuando corresponde a una sesión vencida.

GuidedUnit utiliza apiPost() y useApi() utiliza apiGet(); no se atribuye a estos clientes el uso de las otras operaciones sin evidencia. Las funciones del módulo se representan como una interfaz funcional y un coordinador, sin introducir una clase ApiFacade.

Archivos de respaldo:

- [api.ts](../../frontend/src/js/services/api.ts): operaciones exportadas, apiRequest(), csrfToken(), serialización, ApiError, invalidación y eventos.
- [GuidedUnit.tsx](../../frontend/src/js/components/GuidedUnit.tsx): solicitudes de práctica mediante apiPost().
- [useApi.ts](../../frontend/src/js/hooks/useApi.ts): consultas mediante apiGet() y TanStack Query.
- [tabSession.ts](../../frontend/src/js/services/tabSession.ts): tabSessionToken().
- [queryClient.ts](../../frontend/src/js/services/queryClient.ts): instancia utilizada para invalidación de consultas.
- [AuthContext.tsx](../../frontend/src/js/context/AuthContext.tsx): consumidor del evento yachay:session-expired.

## Strategy — comportamiento

La autenticación de Yachay utiliza el mecanismo Strategy del hashing de Laravel: AuthController accede mediante Hash::check(), y HashManager delega la operación al driver que satisface el contrato Hasher. BcryptHasher y ArgonHasher extienden AbstractHasher e implementan Hasher; Argon2IdHasher extiende ArgonHasher y hereda el contrato. El diagrama muestra estrategias disponibles y no determina el algoritmo activo ni atribuye este patrón a ContratoEjercicio.

La franja inferior repite referencias de Hasher y AbstractHasher para conservar separadas y legibles las relaciones reales de cada implementación. No implica distintas definiciones de esos tipos ni relaciones directas de implementación adicionales para Argon2IdHasher.

Archivos de respaldo:

- [AuthController.php](../../backend/app/Http/Controllers/Api/AuthController.php): Hash::check() en la autenticación.
- [Hash.php](../../backend/vendor/laravel/framework/src/Illuminate/Support/Facades/Hash.php): acceso al servicio hash.
- [Facade.php](../../backend/vendor/laravel/framework/src/Illuminate/Support/Facades/Facade.php): resolución del servicio y reenvío de llamadas.
- [HashManager.php](../../backend/vendor/laravel/framework/src/Illuminate/Hashing/HashManager.php): contexto, contrato y delegación al driver.
- [Manager.php](../../backend/vendor/laravel/framework/src/Illuminate/Support/Manager.php): clase base y resolución de drivers.
- [Hasher.php](../../backend/vendor/laravel/framework/src/Illuminate/Contracts/Hashing/Hasher.php): contrato común de hashing.
- [AbstractHasher.php](../../backend/vendor/laravel/framework/src/Illuminate/Hashing/AbstractHasher.php): clase base abstracta.
- [BcryptHasher.php](../../backend/vendor/laravel/framework/src/Illuminate/Hashing/BcryptHasher.php): herencia e implementación del contrato.
- [ArgonHasher.php](../../backend/vendor/laravel/framework/src/Illuminate/Hashing/ArgonHasher.php): herencia e implementación del contrato.
- [Argon2IdHasher.php](../../backend/vendor/laravel/framework/src/Illuminate/Hashing/Argon2IdHasher.php): especialización de ArgonHasher.

## Template Method — comportamiento

El proceso de validación mantiene un algoritmo común en validateResolved(), declarado en ValidatesWhenResolvedTrait e incorporado por FormRequest. Las solicitudes concretas de Yachay heredan de FormRequest y especializan preparación, autorización, reglas y mensajes según los métodos que efectivamente declaran. FormRequestServiceProvider activa el proceso cuando el contenedor resuelve una solicitud que cumple el contrato de validación.

La parte superior representa herencia y uso del trait; la inferior explica el flujo principal del método plantilla y sus interrupciones. La rama específica de precognición se omite expresamente, y los pasos del flujo no representan clases nuevas.

Archivos de respaldo:

- [FormRequest.php](../../backend/vendor/laravel/framework/src/Illuminate/Foundation/Http/FormRequest.php): uso del trait, passesAuthorization(), getValidatorInstance() y validationRules().
- [ValidatesWhenResolvedTrait.php](../../backend/vendor/laravel/framework/src/Illuminate/Validation/ValidatesWhenResolvedTrait.php): validateResolved(), preparación y hooks de finalización o rechazo.
- [FormRequestServiceProvider.php](../../backend/vendor/laravel/framework/src/Illuminate/Foundation/Providers/FormRequestServiceProvider.php): activación por afterResolving().
- [RegisterRequest.php](../../backend/app/Http/Requests/RegisterRequest.php): preparación, autorización, reglas, mensajes y atributos.
- [SaveKichwaContentRequest.php](../../backend/app/Http/Requests/SaveKichwaContentRequest.php): autorización administrativa, reglas y mensajes.
- [SaveTestimonialRequest.php](../../backend/app/Http/Requests/SaveTestimonialRequest.php): autorización de estudiante activo, reglas y mensajes.

## Chain of Responsibility — comportamiento

La ruta GET /api/admin/overview atraviesa una cadena de middleware que valida la autenticación, el estado de la cuenta y el rol administrativo antes de ejecutar KichwaAdminController::overview(). El orden efectivo resuelto por el Router es EnsureFrontendRequestsAreStateful, Authenticate:sanctum, SubstituteBindings, CuentaActiva y RequireRole:admin. Cada manejador puede continuar mediante la closure siguiente o interrumpir la solicitud; la preparación de la sesión de pestaña para la SPA se ejecuta dentro de la subcadena de Sanctum.

El orden se comprobó arrancando el contenedor de Laravel y consultando gatherRouteMiddleware() para esa ruta, sin enviar una petición de negocio ni modificar la configuración. La vista omite los middleware globales y el recorrido de retorno de la respuesta; no pretende representar todas las rutas del sistema.

Archivos de respaldo:

- [api.php](../../backend/routes/api.php): ruta overview y grupos auth:sanctum, active y role:admin.
- [app.php](../../backend/bootstrap/app.php): registro de alias y activación de statefulApi().
- [sanctum.php](../../backend/config/sanctum.php): SesionPestana como authenticate_session.
- [SesionPestana.php](../../backend/app/Http/Middleware/SesionPestana.php): validación de la credencial de pestaña dentro de la subcadena SPA.
- [CuentaActiva.php](../../backend/app/Http/Middleware/CuentaActiva.php): interrupciones por cuenta bloqueada o cambio inicial pendiente.
- [RequireRole.php](../../backend/app/Http/Middleware/RequireRole.php): autorización administrativa y continuación.
- [KichwaAdminController.php](../../backend/app/Http/Controllers/Api/KichwaAdminController.php): acción overview().
- [EnsureFrontendRequestsAreStateful.php](../../backend/vendor/laravel/sanctum/src/Http/Middleware/EnsureFrontendRequestsAreStateful.php): subcadena condicional del frontend.
- [Authenticate.php](../../backend/vendor/laravel/framework/src/Illuminate/Auth/Middleware/Authenticate.php): autenticación y posible interrupción.
- [SubstituteBindings.php](../../backend/vendor/laravel/framework/src/Illuminate/Routing/Middleware/SubstituteBindings.php): middleware presente en el orden efectivo.
- [Router.php](../../backend/vendor/laravel/framework/src/Illuminate/Routing/Router.php): resolución y ejecución de los middleware de ruta.
- [Pipeline.php](../../backend/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php): composición de la cadena mediante continuaciones.

## Validaciones y límites

- XML válido en el archivo principal, los cinco draw.io independientes y los cinco SVG.
- Identificadores únicos por página; los participantes y conectores llevan además un prefijo de página en el archivo principal. Solo se repiten los identificadores raíz 0 y 1 que requiere cada modelo de draw.io.
- Todos los conectores tienen origen y destino existentes; las referencias a padres son válidas.
- Todos los segmentos de la geometría definida son ortogonales. Se comprobó que no atraviesen cajas, que las cajas no se superpongan y que no haya cruces interiores entre conectores.
- Fuentes de 22 o más en los objetos de texto. Se verificó el ancho del texto de los participantes con métricas de Arial y se corrigieron los rótulos que excedían el espacio disponible.
- Se renderizaron e inspeccionaron las cinco páginas SVG en un navegador local; se corrigió el punto de salida y entrada del aviso Observer.
- Los participantes se contrastaron con las funciones, declaraciones de herencia, contratos y configuración del repositorio y las dependencias instaladas. El orden de la ruta administrativa se consultó en el Router en ejecución.
- No se probó manualmente la apertura en la interfaz de draw.io ni se ejecutaron pruebas funcionales del sistema. Los SVG proceden de la geometría compartida, no de una exportación del editor draw.io.
- No se determinó el algoritmo de hashing activo. No se incluyeron secretos ni archivos .env.

Para exportar versiones posteriores desde draw.io: abrir el archivo, seleccionar la página y utilizar **Archivo → Exportar como → SVG**. Los objetos y conectores siguen siendo editables en los archivos .drawio.
