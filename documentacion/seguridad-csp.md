# CSP de Yachay: observación antes de aplicar restricciones

La ausencia de CSP en el HTML propio está confirmada. Esta entrega añade
**Content-Security-Policy-Report-Only**, sin bloquear recursos. No constituye una
corrección completa de ZAP 10038-1. No cambia API, autenticación, cookies, CORS,
base de datos, contenido educativo ni la política del iframe de YouTube.

## Implementación y recursos

`frontend/csp-policy.mjs` calcula los hashes SHA-256 de los scripts inline del
HTML compilado, incluido el tema. No mantiene un hash manual que pueda quedar
desactualizado. Normaliza los saltos de linea CRLF/CR como el parser HTML del
navegador antes de calcular el hash. El plugin instala la cabecera en preview y genera dos
alternativas de configuración junto a `dist/index.html` en cada compilación:

- `csp-report-only.nginx.conf`: directiva `add_header ... always`.
- `csp-report-only.traefik.yml`: un middleware llamado `yachay-csp-report-only`.

Ambas configuraciones se generan desde el mismo HTML y usan API y recursos del
mismo origen (`connect-src 'self'`), conforme al despliegue actual. Preview agrega
el origen de `VITE_API_URL` o `http://127.0.0.1:8000` para desarrollo local. Esa
excepción local no se incorpora en las configuraciones generadas de producción.
Si la API cambia de origen, revisar la política antes de desplegar.

La política permite el iframe exacto `https://www.youtube-nocookie.com`, fuentes,
imágenes y medios propios, e imágenes `data:`. No habilita scripts de YouTube en
el documento padre, comodines ni `unsafe-eval`. Los enlaces externos y OAuth por
redirección no requieren permitir scripts externos en Yachay.

`style-src-attr 'unsafe-inline'` es una excepción explícita de compatibilidad para
los estilos dinámicos de ejercicios y animaciones. Puede seguir generando una
alerta de ZAP; no se presenta como solucionada ni se retiran estilos para ocultarla.
Los navegadores antiguos sin `style-src-attr` pueden notificar incompatibilidades
por el fallback a `style-src`. Report-Only no modifica el aspecto visual.

## Verificación local

Desde `frontend`, ejecutar:

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173 --strictPort
```

En otra terminal, consultar el HTML mediante GET, no solo HEAD:

```powershell
curl.exe -sS -D - -o NUL http://127.0.0.1:4173/
curl.exe -sS -D - -o NUL http://127.0.0.1:4173/iniciar-sesion
```

Las pruebas `frontend/tests/csp.test.mjs` compilan una muestra con el script real
del tema y consultan respuestas HTTP reales de preview para `/`, login y una ruta
de aprendizaje. Verifican hash, Report-Only, `DENY` y `nosniff`. Las pruebas PHP
`SecurityHeadersTest` comprueban respuestas API 200/401/404, cookies y preflight.
La suite backend solo debe ejecutarse con su base local separada `*_test`.

Vite de desarrollo conserva su configuración actual: no se le impone una CSP de
producción que interfiera con HMR. Preview sirve para validación local, no como
servidor de producción.

## Aplicación manual en Dokploy: elegir UNA alternativa

El registro de Dokploy confirmó que el servicio es Docker Compose y busca
`./compose.production.yml`. El historial anterior a `4b37c34` contiene el
Dockerfile y la configuración Apache usados por ese despliegue; fueron recuperados
tras el error `Compose file not found`. El contenedor sirve React y Laravel con
Apache/PHP 8.4, servicio `app`, puerto 80. El ejemplo Nginx no es su configuración.

Los artefactos CSP no se activan por copiarlos a `dist`: requieren integración
explícita. No aplicar ambos ni sustituir la configuración completa por ejemplos.
El fragmento Nginx no debe incluirse en Apache. Para una integración posterior en
Apache se debe generar la directiva equivalente desde el HTML de esa compilación;
la recuperación del despliegue no activa CSP ni modifica sus cabeceras anteriores.

### Servidor Nginx exclusivo de la aplicación

1. Confirmar que el contenedor de Yachay sirve el HTML mediante Nginx y localizar
   su `server`/`location` real. Conservar rutas, proxy, caché y cabeceras actuales.
2. Copiar el archivo generado por **esa misma compilación** fuera del directorio
   público, por ejemplo a `/etc/nginx/snippets/yachay-csp-report-only.conf`.
3. Incluirlo en la ubicación que sirve `index.html`, también para el fallback SPA:

   ```nginx
   include /etc/nginx/snippets/yachay-csp-report-only.conf;
   ```

4. Revisar la herencia: un `add_header` en `location` puede dejar de heredar los
   del nivel superior. Conservar explícitamente las protecciones que ya llegaban
   al HTML; no duplicar ni eliminar valores sin comprobar su configuración real.
5. Validar con `nginx -t` dentro de ese contenedor antes del despliegue autorizado.
   El fragmento `nginx-estaticos.conf.example` ilustra el punto de integración;
   no demuestra qué configuración utiliza producción.

### Middleware exclusivo en Traefik

1. El YAML generado corresponde al proveedor de archivos de Traefik. El servicio
   real es Compose, cuyos dominios Dokploy gestiona mediante etiquetas Docker:
   no pegarlo como reemplazo del Compose. Antes de usar esta alternativa identificar
   las etiquetas efectivas de Yachay y la disponibilidad del proveedor de archivos.
2. Añadir `yachay-csp-report-only@file` a la lista de middlewares del router HTTPS
   existente de `yachay-kichwa.devs-ueb.tech`. Conservar todos los demás middlewares.
3. No crear routers, cambiar reglas/servicios, reemplazar archivos compartidos ni
   asociarlo a otros dominios. No cambiar opciones globales de Dokploy/Traefik.
4. Si no se dispone de ese acceso, entregar el fragmento al responsable. No
   adivinar nombres de routers o ubicaciones de archivos.

El hash está ligado al artefacto compilado: actualizar configuración y HTML juntos
en cada despliegue, y restaurarlos juntos en una reversión. Si el servidor real es
Apache/Caddy u otro, traducir únicamente la cabecera a su configuración de Yachay
después de identificarlo. No modificar Laravel para una respuesta que no sirve.

## Verificación después de un despliegue autorizado

Consultar GET de `/` y `/iniciar-sesion` por HTTPS con DevTools o `curl.exe -D -`.
Confirmar HTML 200, Report-Only, `X-Frame-Options: DENY`, `nosniff` y el HSTS ya
existente. No añadir `includeSubDomains`, preload ni una segunda CSP aplicada.

En una ventana sin extensiones, conservar los avisos CSP de consola y probar:
tema antes y después de recargar, navegación directa, video, imágenes, fuentes,
audio, ejercicios y animaciones; acceso local, registro, CSRF, recuperación y el
flujo completo de Google en un entorno de pruebas autorizado. Comprobar Network
para distinguir recursos propios de los del documento externo de YouTube.

No se añade un receptor de informes ni se envían datos de navegación a terceros.
Los avisos se revisan localmente en DevTools; el envío centralizado requeriría un
endpoint de informes y una revisión adicional de privacidad y operación.

En ZAP usar navegación normal y análisis pasivo, revisar cada URL propia y su
cabecera exacta. Report-Only puede generar avisos informativos y no obliga a ZAP a
dar por corregida 10038-1. Las alertas de `youtube-nocookie.com` siguen siendo del
proveedor externo. No ejecutar escaneo activo contra producción.

## Pendiente antes de una CSP aplicada

La activación de `Content-Security-Policy` exige revisar violaciones en un navegador
real, completar recorridos funcionales y verificar la cabecera en el servidor real.
No basta con renombrar la cabecera ni con que pasen las pruebas de Node/PHP.

En las dos respuestas HTML de producción verificadas anteriormente ya existían
Anti-Clickjacking, `nosniff` y HSTS. No se ha confirmado una cookie de sesión
insegura, un CORS inseguro ni exposición de una versión concreta del servidor.
No se alteran esas configuraciones sin evidencia. Los timestamps requieren
identificar el dato y su sensibilidad; no se eliminan fechas legítimas del API.

## Recuperación del error `Compose file not found`

Se recuperaron del historial `compose.production.yml`, `Dockerfile`, `.dockerignore`
y `deployment/apache.conf`, `public.htaccess`, `php-production.ini`, `entrypoint.sh`.
Se mantienen los servicios `app`/`db` y volúmenes `postgres_data`, `media` y
`app_private`. El único cambio al Dockerfile histórico retira la copia del paquete
antiguo `initial-content.enc`, que ya no existe y no es necesario para actualizar
una instalación con base de datos persistente. No se restauran importadores ni datos.

En el mismo servicio Compose de Dokploy `puninaaucatoma-yachaykichwa-htageu`,
conservar `./compose.production.yml`, los dominios actuales, variables y volúmenes.
Después de actualizar el repositorio se puede reintentar el despliegue autorizado.
No crear otro servicio/proyecto, regenerar APP_KEY o credenciales, ni eliminar
volúmenes. El arranque ejecuta migraciones incrementales, sincroniza únicamente
`IntermedioModuloDosEjerciciosSeeder` y prepara cachés. Esta carga dirigida incorpora
las cuatro unidades y 46 ejercicios guiados del módulo 2 de Intermedio; no ejecuta
`DatabaseSeeder`, ni importa la base local ni restablece cuentas. El seeder conserva
las lecciones existentes y los identificadores de ejercicios, y actualiza el catálogo.
Una prueba repite el comando tras responder los 46 ejercicios y comprueba que
respuestas, recompensas y cuenta se conservan. Al terminar el arranque se devuelve
la propiedad de los archivos de caché a `www-data`, para que Apache pueda invalidar
y actualizar el catálogo creado por el seeder.

Compose validado localmente con valores ficticios solo en el proceso de validación,
sin escribir archivos de entorno; sintaxis shell del entrypoint aprobada. No se
construyó la imagen completa porque Docker Engine no está iniciado localmente.

## Resultados de esta entrega

- TypeScript: `npm.cmd run typecheck`, aprobado.
- Frontend: 305 pruebas aprobadas; las pruebas CSP se repitieron después del
  ajuste de normalización CRLF/LF y pasaron.
- Backend: 269 pruebas, 4458 aserciones, aprobadas con PostgreSQL local en
  `yachay_kichwa_test`; incluye OAuth simulado, sesiones, CSRF y recuperación.
- Compilación de producción aprobada; ambos fragmentos generados con el hash del
  HTML de esa compilación. Laravel Pint aprobado.
- Edge headless sobre preview: tema oscuro y preferencia clara conservados, login
  renderizado, URL del iframe conservada, cero errores de página y cero violaciones
  CSP iniciales en la portada. Un script inline de prueba sin hash generó un evento
  CSP de tipo `report` y se ejecutó: confirma observación sin bloqueo. Las respuestas
  API públicas y el contenido externo se simularon para aislar el ensayo; no prueba
  reproducción real de YouTube ni OAuth real contra Google.
- No se ha desplegado ni validado esta configuración en Nginx/Traefik de producción.
  Falta comprobar su sintaxis/integración allí; no se afirma que ZAP 10038-1 esté
  resuelta. No se modificó infraestructura compartida ni secretos.
