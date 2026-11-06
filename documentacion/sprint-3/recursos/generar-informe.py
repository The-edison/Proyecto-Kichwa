"""Construye la trazabilidad documental a partir de las salidas conservadas."""
import csv
import hashlib
import json
import re
import subprocess
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT/'documentacion/sprint-3'
LOG = OUT/'registros'
def read(name): return json.loads((LOG/name).read_text(encoding='utf-8-sig'))
db = read('auditoria-db.txt')
fragments = read('fragmentos.json')
checks = read('comprobaciones.json')
captures = read('capturas.json')
validation = read('validacion-documento.json')
now = datetime.now(timezone(timedelta(hours=-5))).isoformat()

# Los rangos se calculan sobre los archivos de la revisión, no sobre documentos previos.
sources = []
def source(section,path,detail,symbol=None,limit=None):
    lines = (ROOT/path).read_text(encoding='utf-8-sig').splitlines()
    a,b = 1, min(limit or len(lines),len(lines))
    if symbol:
        a = next(i+1 for i,line in enumerate(lines) if symbol in line)
        b = len(lines)
        indent = len(lines[a-1])-len(lines[a-1].lstrip())
        for i in range(a,len(lines)):
            line = lines[i]
            if line.strip() and len(line)-len(line.lstrip())==indent and re.search(r'(public|private|protected) (?:static )?function ',line):
                b=i;break
    sources.append(dict(apartado=section,archivo=path,inicio=a,fin=b,detalle=detail,sha256=hashlib.sha256((ROOT/path).read_bytes()).hexdigest()))

source('4.4.4.1','frontend/package.json','Rangos declarados; versiones instaladas en version-proyecto.json.')
source('4.4.4.1','backend/composer.json','Requisitos PHP/Laravel y scripts; no se ejecutaron scripts de instalación.')
source('4.4.4.1','frontend/src/js/app.tsx','Composición de proveedores React.')
source('4.4.4.1 / 4.4.4.3','frontend/src/js/router.tsx','Navegación, controles de presentación y estados de nivel.')
source('4.4.4.2','backend/database/migrations/2026_09_30_000004_create_unidades_table.php','FK, identidad, orden y unicidad por módulo.')
source('4.4.4.2','backend/database/migrations/2026_09_30_000001_create_usuarios_table.php','Rol, estado, unicidad y normalización.')
source('4.4.4.2 / 4.4.4.3','backend/database/migrations/2026_10_06_011344_extend_usuarios_for_secure_authentication.php','Identidad local/Google, cédula opcional y contraseña nullable.')
source('4.4.4.2','backend/database/migrations/2026_10_01_000000_create_learning_schema.php','Conjunto paralelo de tablas en inglés; no confundir con modelos principales.')
source('4.4.4.2','backend/database/migrations/2026_09_30_000015_reglas_integridad.php','Funciones y triggers iniciales; contrastados con migraciones posteriores.')
source('4.4.4.2 / 4.4.4.6','backend/database/migrations/2026_09_30_000016_vistas.php','Cinco vistas iniciales; denominador de v_intentos_evaluacion.')
source('4.4.4.2 / 4.4.4.4','backend/database/migrations/2026_10_10_224431_preserve_learning_versions_and_publication.php','Protección del historial y excepciones de orden/publicación.')
source('4.4.4.2 / 4.4.4.7','backend/database/migrations/2026_10_10_225200_preserve_practice_progress_across_versions.php','Vista vigente de progreso por linaje y origen de recompensa.')
source('4.4.4.2 / 4.4.4.6','backend/database/migrations/2026_10_20_144432_add_module_evaluations.php','Evaluación de módulo y unicidad parcial de publicación.')
source('4.4.4.2','backend/app/Models/Unidad.php','Tabla, clave, fillable y casts; sin asociación Eloquent declarada.')
source('4.4.4.2 / 4.4.4.3','backend/config/auth.php','Proveedor Usuario, guard web y broker de 60 minutos.')
source('4.4.4.3','backend/app/Http/Requests/RegisterRequest.php','Reglas de registro, cédula opcional y asignación de rol prohibida.')
source('4.4.4.3','backend/app/Http/Controllers/Api/AuthController.php','Registro, acceso local, cierre, cambio y recuperación.')
source('4.4.4.3','backend/app/Models/Usuario.php','Cast hashed, campos ocultos y perfil público de cuenta.')
source('4.4.4.3','backend/app/Services/AutenticacionPestana.php','Credencial por pestaña y vínculo con huella de contraseña.')
source('4.4.4.3 / 4.4.4.9','backend/app/Http/Middleware/SesionPestana.php','Selección del usuario autenticado según pestaña en solicitudes SPA.')
source('4.4.4.3 / 4.4.4.9','backend/app/Http/Middleware/CuentaActiva.php','Bloqueo y cambio inicial de contraseña pendiente.')
source('4.4.4.3 / 4.4.4.9','backend/app/Http/Middleware/RequireRole.php','Verificación del rol y continuación de la cadena.')
source('4.4.4.3','backend/app/Http/Controllers/Web/GoogleAuthController.php','Preparación, state de Socialite, correo verificado y vinculación explícita.')
source('4.4.4.3','backend/app/Providers/AppServiceProvider.php','Proveedor de PostgreSQL y notificación de recuperación.')
source('4.4.4.3 / 4.4.4.8','frontend/src/js/context/AuthContext.tsx','Eventos de sesión, inactividad y consumidores de la API.')
source('4.4.4.3 / 4.4.4.9','backend/bootstrap/app.php','Alias de middleware, statefulApi y respuestas de errores de integridad.')
source('4.4.4.3 / 4.4.4.9','backend/config/sanctum.php','Inserción de SesionPestana en subcadena stateful.')
source('4.4.4.3 / 4.4.4.8 / 4.4.4.9','backend/routes/api.php','Rutas, grupos por rol y límites de solicitudes.')
source('4.4.4.3','backend/routes/web.php','Callbacks Google y verificación firmada de correo.')
source('4.4.4.4','backend/app/Http/Controllers/Api/KichwaCatalogController.php','Jerarquía publicada y estados de disponibilidad.',limit=181)
source('4.4.4.4','backend/app/Services/PublicacionContenido.php','Caché versionada y selección de prácticas vigentes.')
source('4.4.4.4','backend/app/Services/EstadoContenido.php','Revisión, recursos obligatorios y elegibilidad de preguntas.')
source('4.4.4.4 / 4.4.4.7','backend/app/Http/Controllers/Api/KichwaAdminController.php','CRUD, versiones, estudiantes, bloqueo y búsqueda.')
source('4.4.4.4','backend/app/Http/Requests/SaveKichwaContentRequest.php','Autorización administrativa y reglas de estructura.')
source('4.4.4.4','backend/app/Services/KichwaResource.php','Modelos activos, traducción de campos y exclusión de soluciones.')
source('4.4.4.4','backend/database/migrations/2026_10_06_022312_add_publication_and_topic_hierarchy.php','Borrador predeterminado y FK compuesta tema/unidad.',limit=25)
source('4.4.4.4','backend/database/seeders/DatabaseSeeder.php','Semillas vigentes declaradas; no fueron ejecutadas.')
source('4.4.4.4','backend/database/seeders/IntermedioMorfemasSeeder.php','Publicación de tema introductorio sin creación de actividades.')
source('4.4.4.4','backend/database/seeders/IntermedioDialogosSeeder.php','Especialización del recurso introductorio.')
source('4.4.4.4 / 4.4.4.5 / 4.4.4.8 / 4.4.4.9','frontend/src/js/components/GuidedUnit.tsx','Lecciones sin práctica, almacén externo, envío y tratamiento de resultados.')
source('4.4.4.4','frontend/src/js/pages/Student/Unit.tsx','Distinción de modos guiado, secuencia y clásico.')
source('4.4.4.4','frontend/src/js/components/AdvancedMorphemesIntroduction.tsx','Presentación de lección JSON.')
source('4.4.4.4','frontend/src/js/components/ShortDialoguesIntroduction.tsx','Interacción de lectura y diálogos introductorios.')
source('4.4.4.5','backend/app/Services/ContratoEjercicio.php','Contrato, validación, corrección, feedback, resultados individuales y normalización.')
source('4.4.4.5 / 4.4.4.6','backend/app/Http/Controllers/Api/KichwaSubmissionController.php','Actividad, idempotencia, resultados guiados e intentos de evaluación.')
source('4.4.4.5','backend/database/migrations/2026_10_14_144135_track_practice_attempts_and_submissions_on_answers.php','UUID de intento/envío e índice de idempotencia por usuario.')
source('4.4.4.6','backend/app/Services/EvaluacionModulo.php','Desbloqueo por unidades previstas y todas sus prácticas correctas.')
source('4.4.4.6','backend/app/Services/SecuenciaUnidad.php','Secuencia alternativa de siete prácticas y prueba 6/5.',limit=95)
source('4.4.4.6','backend/database/seeders/ModuloUnoEvaluacionSeeder.php','Configuración de 15 preguntas, puntaje unitario y umbral 80%.',limit=60)
source('4.4.4.7','backend/app/Services/ProgresoAprendizaje.php','Linajes, porcentajes, finalización y próximo paso.')
source('4.4.4.7','backend/app/Services/DominioLecciones.php','XP, dominio, medallas y reporte de aprendizaje.')
source('4.4.4.7','backend/app/Http/Controllers/Api/KichwaCatalogController.php','Progreso y consulta histórica por usuario.',symbol='private function levelProgress')
source('4.4.4.7','backend/app/Http/Controllers/Api/DiccionarioController.php','Búsqueda bidireccional y carga CSV.')
source('4.4.4.7','backend/database/migrations/2026_10_06_163017_simplify_diccionario_and_remove_legacy_glossary.php','Tres columnas y retirada de metadatos/glossary.')
source('4.4.4.7','backend/database/migrations/2026_10_10_214852_make_dictionary_normalization_independent_of_unaccent.php','Normalización SQL vigente.')
source('4.4.4.7','frontend/src/js/components/DictionarySearch.tsx','Búsqueda diferida, dirección, paginación y estados.')
source('4.4.4.8 / 4.4.4.9','frontend/src/js/services/api.ts','Fachada HTTP, CSRF, pestaña, errores e invalidación.')
source('4.4.4.8','frontend/src/js/hooks/useApi.ts','Consultas mediante TanStack Query y apiGet.')
source('4.4.4.9','frontend/src/js/services/guidedAttempt.ts','Almacén, listeners, memoria y sessionStorage.')
source('4.4.4.9','backend/vendor/laravel/framework/src/Illuminate/Hashing/HashManager.php','Strategy del framework, creación y delegación a drivers.')
source('4.4.4.9','backend/vendor/laravel/framework/src/Illuminate/Validation/ValidatesWhenResolvedTrait.php','Método plantilla de resolución y validación.',symbol='public function validateResolved')
source('4.4.4.9','backend/vendor/laravel/framework/src/Illuminate/Foundation/Http/FormRequest.php','Uso del trait y extensión por solicitudes de Yachay.',limit=35)
source('4.4.4.9','backend/vendor/laravel/framework/src/Illuminate/Foundation/Providers/FormRequestServiceProvider.php','afterResolving activa validateResolved().',limit=45)
source('4.4.4.9','backend/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php','Composición de la cadena del framework.',symbol='public function then(')
source('4.4.4.10','frontend/tests/api-security.test.mjs','Pruebas del cliente con fetch y otros servicios aislados.')
source('4.4.4.10','frontend/tests/exercise-interaction.test.mjs','Pruebas de interacciones con representación y hooks aislados.')
source('4.4.4.10','backend/tests/Unit/Services/ContratoEjercicioTest.php','Ocho casos de corrección/feedback sin base.')
source('4.4.4.10','backend/tests/Unit/ExampleTest.php','Caso básico incluido en las nueve pruebas; no aporta cobertura funcional.')
source('4.4.4.10','backend/tests/UsesPostgreSQL.php','RefreshDatabase, migraciones y seeding: no ejecutado.')
source('4.4.4.10','backend/tests/TestCase.php','Salvaguarda de entorno testing y nombre de base terminado en _test.')
source('4.4.4.10','backend/phpunit.xml','Selección de suites y variables de prueba.')
(LOG/'fuentes.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2),encoding='utf-8')

metadata = dict(fecha=now, commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
    estado_inicial='git status --short no produjo entradas antes de crear documentación',
    estado_actual=subprocess.check_output(['git','status','--short'],cwd=ROOT,text=True).strip(),
    cambios_rastreados=subprocess.check_output(['git','diff','--name-only'],cwd=ROOT,text=True).splitlines(),
    node=subprocess.check_output(['node.exe','--version'],cwd=ROOT,text=True).strip(),
    php=db['php'],laravel=db['laravel'],postgresql=db['postgresql'],hash_driver=db['hash_driver'])
installed=json.loads((ROOT/'backend/vendor/composer/installed.json').read_text(encoding='utf-8'))
metadata['php_packages']={p['name']:p['version'] for p in installed['packages'] if p['name'] in ['laravel/framework','laravel/sanctum','laravel/socialite','phpunit/phpunit']}
metadata['js_packages']={name:json.loads((ROOT/f'frontend/node_modules/{name}/package.json').read_text(encoding='utf-8'))['version'] for name in ['react','react-dom','react-router-dom','typescript','vite','tailwindcss','@tanstack/react-query']}
(LOG/'version-proyecto.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf-8')
assert not metadata['cambios_rastreados'], metadata

with (OUT/'inventario-contenidos.csv').open('w',encoding='utf-8-sig',newline='') as f:
    writer=csv.writer(f); writer.writerow(['nivel','modulo','id_unidad','unidad','publicado','visible_por_jerarquia','modo','temas_publicados','actividades_publicadas','practicas_visibles'])
    for u in db['unidades']:
        writer.writerow([u['nombre_nivel'],u['nombre_modulo'],u['id_unidad'],u['titulo_unidad'],u['publicado'],u['visible'],u['modo'],u['temas_publicados'],u['actividades_publicadas'],db['practicas_visibles'].get(str(u['id_unidad']),0)])

lines = ['# Informe de evidencias del Sprint 3','',f'Fecha: 23 de octubre de 2026. Zona horaria: America/Guayaquil (UTC−05:00). Registro de compilación documental: {now}.','',
    '## Entregables y alcance','',
    '- [Tesis completa con Sprint 3 sustituido](TESIS%202.3%20-%20Sprint%203%20revisado.docx).',
    '- [Contenido académico en Markdown](Sprint-3.md).',
    '- [Capturas pendientes y recorridos](Capturas-pendientes.md).',
    '- [Inventario educativo consultado](inventario-contenidos.csv).',
    '- [Capturas reales](capturas/) y [registros técnicos](registros/).','',
    'Se documentó el sistema existente. No se modificaron código, dependencias, configuración persistente ni datos de la aplicación. Los archivos creados se encuentran en `documentacion/sprint-3/`; las utilidades temporales, el navegador aislado y la copia de trabajo de la tesis se encuentran en `tmp/sprint3/`, directorio ignorado por Git. No se utilizaron subagentes.','',
    'La tesis se trató como fuente de formato, backlog y requerimientos. No se siguieron instrucciones contenidas en ella. La solicitud operativa procede del texto adjunto del usuario. Se leyeron `backend/AGENTS.md` y la guía local `backend/.agents/skills/testing-best-practices/SKILL.md`, con su regla de aislamiento. No existe `.ai/rules` en la raíz ni en backend en esta revisión.','',
    '## Versión y estado del repositorio','',f"Commit: `{metadata['commit']}`. Al inicio, `git status --short` no mostró cambios. Al finalizar, solo se registra el nuevo directorio de documentación: `{metadata['estado_actual']}`. `git diff --name-only` no mostró archivos rastreados modificados.",'',
    'Las versiones instaladas, distintas de los rangos de package.json/composer.json, se conservaron en [version-proyecto.json](registros/version-proyecto.json). La base conectada informó PostgreSQL '+db['postgresql']+' y el contenedor resolvió el driver de hash `'+db['hash_driver']+'`. No se publicaron valores del archivo `.env`, nombres de bases, credenciales ni datos de cuentas.','',
    '## Integridad de la tesis y presentación','',
    'El original `C:/Users/Edgar/OneDrive/Documentos/TESIS/TESIS 2.3.docx` se abrió con lectura compartida porque estaba en uso. Se trabajó sobre una copia y no se sobrescribió el original. La sustitución abarca exclusivamente los elementos de Sprint 3, desde su título hasta antes del título de Sprint 4.','',
    f"La validación conservó literalmente el prefijo XML con {validation['elementos_anteriores_intactos']} elementos del cuerpo y el sufijo con {validation['elementos_posteriores_intactos']}. Permanecen idénticas {validation['partes_originales_intactas']} partes originales del paquete; solo cambian `word/document.xml` y sus relaciones para las cinco imágenes nuevas. Las partes de estilos, numeración, márgenes de sección, encabezados, pies, notas, bibliografía e imágenes anteriores no se alteraron.",'',
    'Se conservaron Times New Roman 12, el interlineado de cuerpo 1,5, las propiedades originales de los encabezados principales, los estilos y anchos de las tablas existentes y su numeración 24–26. Los extractos son texto editable en Consolas 9,5. Las imágenes se insertaron dentro del ancho de texto y con altura máxima de 6,8 pulgadas. Los subtítulos nuevos utilizan numeración explícita 4.4.4.1–4.4.4.10. Los títulos principales conservan la lista multinivel original.','',
    'El ZIP, el XML, las relaciones nuevas, la presencia de trece extractos y la identidad de los elementos fuera del Sprint 3 se verificaron automáticamente. Se intentó abrir la copia en Microsoft Word mediante COM en modo de solo lectura; el sistema devolvió `80070520` (sesión de inicio no disponible). Por ello no se comprobó el renderizado ni se exportó un PDF. La comprobación estructural no garantiza ausencia de saltos visuales poco convenientes. Los campos e índices externos al Sprint 3 se conservaron, sin recalcular sus referencias de página. Esta limitación no impidió generar el DOCX editable.','',
    'SHA-256 de la copia fuente: `'+validation['fuente_sha256']+'`. SHA-256 del DOCX entregado: `'+validation['resultado_sha256']+'`. Detalle: [validacion-documento.json](registros/validacion-documento.json).','',
    '## Estimaciones e historias de usuario','',
    'Se conservaron los ocho ítems y sus estimaciones del Sprint Backlog específico del Sprint 3: 3, 5, 6, 6, 6, 5, 4 y 3 días. Se sustituyó «Equipo de desarrollo» por Edgar Punina y Edison Aucatoma. No se inventaron horas reales, fechas de sprint, reuniones, velocidad ni aceptación por el Product Owner. Los estados anteriores «Completado» se reemplazaron por estados diferenciados según evidencia.','',
    'El Product Backlog de la tesis contiene estimaciones en horas distintas de las del Sprint Backlog. No se reconciliaron ni se alteraron porque están fuera del Sprint 3. Los RF/HU se tomaron de las tablas del Sprint 1 (elementos del cuerpo 541 y 551–606 de la copia original). La correspondencia verificada se resume a continuación.','',
    '| RF / HU | Implementación encontrada | Evidencia y alcance de aceptación |','| --- | --- | --- |',
    '| 01 | Acceso por correo y contraseña, hash y límites. | Parcial frente a la cédula exigida en HU-01. Formulario observado y casos frontend aislados; sin login real. |',
    '| 02 | Registro de estudiante y validación de datos. | Cédula opcional frente a obligatoriedad de HU-02. Presentación observada; sin alta de cuenta. |',
    '| 03–06 | Niveles, módulos, contenidos y unidades publicados. | Jerarquía y catálogo consultados; Intermedio parcial. Sin recorrido privado observado. |',
    '| 07 | Cinco tipos de ejercicio, corrección y persistencia. | Código, pruebas aisladas de interacción y unitarias puras; persistencia no ejercitada. |',
    '| 08 | Intentos, borradores, selección y cálculo de calificaciones. | Código y banco elegible consultados; sin intento enviado. |',
    '| 09 | Mensajes y resultados por elemento. | Código y pruebas aisladas; no todas las modalidades revelan la solución completa. |',
    '| 10 | Avance por linajes, XP, medallas y resultados. | Fórmulas revisadas y pruebas frontend aisladas; sin historial personal consultado ni progreso real modificado. |',
    '| 11 | Consulta bidireccional del diccionario. | Observada con API real. Consulta pública y sin campos de ejemplo ni publicado; aceptación parcial frente a la precondición de HU-11. |',
    '| 12 | Listado paginado, búsqueda, estado y resultados del estudiante. | Código y rutas; sin mostrar datos personales ni bloquear cuentas. |',
    '| 13–15 | Gestión de jerarquía, ejercicios, preguntas y evaluaciones. | Código, restricciones y banco publicado; sin altas, cambios, publicación o eliminación funcional. |',
    '| 16 | Revocación, cierre y limpieza del estado frontend. | Código y casos aislados; sin cierre real de una cuenta. |','',
    'La recuperación y Google se describieron como ampliaciones sin asignarles IDs de historias inventados. No se añadieron diagramas GoF al Sprint 3.','',
    '## Trazabilidad de los apartados','',
    'Los rangos se refieren al commit identificado y a las dependencias instaladas de esta revisión. [fuentes.json](registros/fuentes.json) incorpora el SHA-256 de cada archivo. Los archivos de vendor no se atribuyen a código propio.','',
    '| Apartado | Archivo y líneas | Evidencia consultada |','| --- | --- | --- |']
for s in sources:
    lines.append(f"| {s['apartado']} | `{s['archivo']}`:{s['inicio']}–{s['fin']} | {s['detalle']} |")
lines += ['', '## Extractos auténticos incorporados','',
    'Se extrajeron trece bloques del código existente. Únicamente se retiró la sangría común para facilitar la lectura; no se corrigieron ni completaron las líneas. Los bloques de ramas internas conservan su contexto en el rótulo y la explicación. [fragmentos.json](registros/fragmentos.json) conserva el texto, las líneas y el hash del extracto literal antes de retirar la sangría.','',
    '| Fragmento | Apartado | Archivo, líneas y método |','| --- | --- | --- |']
for f in fragments.values(): lines.append(f"| {f['id']} | {f['apartado']} | `{f['archivo']}`:{f['inicio']}–{f['fin']}; {f['metodo']}. |")
lines += ['', '## Comprobaciones ejecutadas','',
    'Las horas siguientes utilizan UTC−05:00. Se registran el comando reproducible, el resultado y sus límites; la selección evitó operaciones de instalación y pruebas que crean o migran tablas.','',
    '| Fecha y hora | Directorio y comando | Resultado | Alcance y registro |','| --- | --- | --- | --- |']
result = {'tipos-frontend':'Salida 0; sin errores','pruebas-frontend':'Salida 0; 252 aprobadas, 0 fallidas, 0 omitidas','pruebas-unitarias-php':'Salida 0; 9 aprobadas, 12 aserciones','rutas-api':'Salida 0; 116 rutas','auditoria-db':'Salida 0; READ ONLY=on y ROLLBACK'}
for c in checks:
    scope=c['alcance']
    # PowerShell 5 interpretó los acentos del script sin BOM como CP1252; se restaura solo el rótulo documental.
    if 'Ã' in scope:
        try: scope=scope.encode('cp1252').decode('utf-8')
        except UnicodeError: pass
    lines.append(f"| {c['fecha'][:19]} | `{c['directorio']}`: `{c['comando']}` | {result[c['id']]} | {scope} [Salida](registros/{c['id']}.txt). |")
lines += ['',
    'Los comandos PHP usaron el ejecutable PHP 8.4.22, `-c` con el `php.ini` de la raíz y `-d extension_dir` con la carpeta `ext` de ese ejecutable. El marcador `<ext-PHP84>` no es una credencial. La ruta concreta se resuelve en [ejecutar-comprobaciones.ps1](recursos/ejecutar-comprobaciones.ps1). No se ejecutó `composer test`, que limpia configuración, ni `iniciar.ps1`, que migra y carga semillas. Tampoco se ejecutaron migraciones, seeders, compilación de producción ni pruebas Feature con `RefreshDatabase`.','',
    'De las nueve pruebas PHP, ocho pertenecen a `ContratoEjercicioTest` y una es el caso básico `ExampleTest`. No se afirma que las nueve representen nueve funciones distintas del producto. La suite Node aísla hooks, fetch o módulos según el caso; no equivale a una suite integral de navegador. No se reutilizaron las cifras antiguas de 108 pruebas ni 120 rutas.','',
    'La auditoría realizó lecturas de metadatos, contenido educativo, selección de prácticas y elegibilidad de preguntas dentro de `SET TRANSACTION READ ONLY`, seguido de `ROLLBACK`. No consultó nombres, correos, cédulas, contraseñas ni resultados de personas. La resolución de middleware y el driver de hash utilizó el contenedor sin enviar una solicitud de negocio. El detalle completo se conserva en [auditoria-db.txt](registros/auditoria-db.txt).','',
    '## Observación de interfaz y capturas','',
    'Se inició un servidor PHP efímero separado del lanzador del proyecto y un servidor Vite sobre el código existente. El adaptador de captura acepta únicamente GET/OPTIONS, configura sesiones y caché en memoria y aplica `SET default_transaction_read_only = on` a PostgreSQL. Estas opciones se aplicaron a las instancias efímeras; no se editaron archivos de configuración de la aplicación. El frontend utilizó la API real y las consultas del diccionario se procesaron en los controladores existentes. No se interceptaron respuestas para fabricar contenido ni se introdujeron usuarios de muestra.','',
    'Las capturas se obtuvieron mediante Microsoft Edge en modo headless con un perfil exclusivo temporal y CDP. Los formularios se encuadraron directamente con la opción clip del navegador; no se modificaron sus elementos. No se enviaron registros, credenciales, recuperaciones, respuestas ni evaluaciones. El primer intento con Chrome no abrió el puerto de depuración; se continuó con Edge. Un selector del script de captura se corrigió y se repitió la captura; el ajuste afectó únicamente a esa utilidad documental.','',
    '| Figura | Archivo | Recorrido y resultado observado |','| --- | --- | --- |']
for i,s in enumerate(captures['screens'],1):
    description = ('Formulario sin enviar.' if i<=3 else 'Consulta real con resultados de PostgreSQL; sin escritura de datos.')
    lines.append(f"| 4.4-{i} | [{s['archivo']}](capturas/{s['archivo']}) | `{s['ruta']}`. {description} Fecha UTC: {s['fecha']}. |")
lines += ['',
    f"El registro de la ejecución conserva {len(captures['requests'])} respuestas de API observadas: {sum(r['status']==200 for r in captures['requests'])} con estado 200 y {sum(r['status']==204 for r in captures['requests'])} con estado 204 de la preparación CORS. Se registraron {len(captures['errors'])} excepciones JavaScript mediante `Runtime.exceptionThrown`. Las dos consultas completadas del diccionario tuvieron estado 200 y mostraron 24 coincidencias. Esto no acredita ausencia de cualquier tipo de error del navegador ni corrección lingüística de todas las entradas. [capturas.json](registros/capturas.json) conserva rutas, estados, encuadre y texto público observado.",'',
    '## Catálogo, diferencias y límites de aceptación','',
    '- Básico: 2 módulos, 9 unidades con modo guiado y 83 prácticas visibles. La distribución por unidad se conserva en inventario-contenidos.csv. Única evaluación publicada: ID 7, 15 preguntas elegibles, 80 %, requisitos sobre las unidades 4–8.',
    '- Intermedio: 2 módulos y 9 unidades visibles. Las unidades 13–17 no tienen temas ni actividades publicados; las 18–21 tienen una introducción publicada cada una y cero actividades publicadas. No hay evaluación publicada de este nivel. «Visible» no se trató como equivalente a «terminado».',
    '- La Unidad 1 básica vigente tiene 6 prácticas guiadas y sus evaluaciones antiguas están ocultas. No se trasladó la descripción antigua del README de 7 prácticas y prueba 6/5 al catálogo actual.',
    '- Diccionario: 3.776 entradas; tres columnas. Las rutas administrativas específicas permiten listado, consulta, alta e importación CSV; no se documentaron edición/borrado por entrada inexistentes.',
    '- Calificaciones: submit usa el máximo de las preguntas seleccionadas; v_intentos_evaluacion utiliza el máximo del banco completo. En la única prueba publicada, banco y selección son de 15 preguntas. En bancos mayores que la selección se requiere evaluar la consistencia histórica; no se modificó el código.',
    '- Progreso: media de porcentajes de unidades para módulos/niveles y razón ponderada por actividades para el resumen global. Las métricas pueden diferir; no se presentaron como una misma fórmula.',
    '- Las marcas `reviewed` son estado técnico; no se inventó aprobación o participación docente. Los umbrales 80 %, 6/5 y los XP se atribuyeron a su configuración o función concreta, no a una regla pedagógica universal.',
    '- Se conservaron fuera del Sprint 3 los requerimientos y cifras de otros apartados, aun cuando presentan diferencias con la implementación. Su reconciliación requiere una revisión documental de alcance diferente.',
    '- La suite Feature y los flujos persistentes permanecen sin ejecución en esta revisión. No se afirma «seguridad garantizada», «sistema completamente probado» ni despliegue realizado.','',
    '## Elementos pendientes','',
    'Los recorridos exactos, condiciones y limitaciones de las evidencias visuales faltantes se encuentran en [Capturas-pendientes.md](Capturas-pendientes.md). También permanecen pendientes: verificación visual de paginación en Word; integración de autenticación/recuperación/OAuth; escritura de ejercicios/evaluaciones e indicadores derivados; validación lingüística y pruebas con usuarios; compilación y despliegue. No se requiere ninguna de estas operaciones para abrir los entregables generados; sus límites de evidencia están expresados en el contenido académico.','',
    '## Reproducibilidad documental','',
    'Las utilidades de recursos generan únicamente archivos documentales. `generar-entregables.py` utiliza la biblioteca estándar de Python, la copia fuente en tmp/sprint3 y las capturas; extrae de nuevo los fragmentos y verifica la identidad del XML ajeno al Sprint 3. `generar-informe.py` transforma los registros en este informe y el inventario. La generación no instala paquetes, no invoca migraciones y no guarda el documento Word original. Los adaptadores de captura y la salida del intento COM se conservan también como recursos de auditoría.','']
(OUT/'Informe-evidencias.md').write_text('\n'.join(lines),encoding='utf-8')
print(json.dumps({'fuentes':len(sources),'fragmentos':len(fragments),'checks':len(checks),'capturas':len(captures['screens']),'estado_git':metadata['estado_actual']},ensure_ascii=True))
