<?php
// Herramienta documental: no modifica la aplicación ni ejecuta migraciones.
require __DIR__.'/../../../backend/vendor/autoload.php';
$app = require __DIR__.'/../../../backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$db = Illuminate\Support\Facades\DB::connection();
$out = ['fecha' => (new DateTimeImmutable('now', new DateTimeZone('America/Guayaquil')))->format(DATE_ATOM),
    'php' => PHP_VERSION, 'laravel' => $app->version(), 'hash_driver' => $app['hash']->getDefaultDriver()];
try {
    $db->beginTransaction();
    $db->statement('SET TRANSACTION READ ONLY');
    $db->statement("SET LOCAL statement_timeout = '15s'");
    $out['read_only'] = $db->selectOne('SHOW transaction_read_only')->transaction_read_only;
    $out['postgresql'] = $db->selectOne('SHOW server_version')->server_version;
    $out['migraciones'] = $db->select('SELECT migration, batch FROM migrations ORDER BY migration');
    $out['tablas'] = $db->select("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
    $out['vistas'] = $db->select("SELECT viewname, definition FROM pg_views WHERE schemaname='public' ORDER BY viewname");
    $out['rutinas'] = $db->select("SELECT p.proname AS nombre,p.prokind AS clase,l.lanname AS lenguaje FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang WHERE n.nspname='public' AND p.proname LIKE 'kichwa_%' ORDER BY p.proname");
    $out['triggers'] = $db->select("SELECT event_object_table AS tabla,trigger_name AS nombre,string_agg(event_manipulation,', ' ORDER BY event_manipulation) AS eventos FROM information_schema.triggers WHERE trigger_schema='public' GROUP BY event_object_table,trigger_name ORDER BY event_object_table,trigger_name");
    $out['restricciones'] = $db->select("SELECT c.relname AS tabla,con.conname AS nombre,pg_get_constraintdef(con.oid) AS definicion FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY c.relname,con.conname");
    $out['indices_diccionario'] = $db->select("SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='diccionario' ORDER BY indexname");
    $out['niveles'] = $db->select('SELECT id_nivel,nombre_nivel,orden_nivel,publicado FROM niveles ORDER BY orden_nivel');
    $out['modulos'] = $db->select('SELECT m.id_modulo,n.nombre_nivel,m.nombre_modulo,m.publicado,n.publicado AND m.publicado AS visible FROM modulos m JOIN niveles n USING(id_nivel) ORDER BY n.orden_nivel,m.orden_modulo');
    $out['unidades'] = $db->select("SELECT u.id_unidad,n.nombre_nivel,m.nombre_modulo,u.titulo_unidad,u.publicado,n.publicado AND m.publicado AND u.publicado AS visible,u.configuracion->>'learning_mode' AS modo,(SELECT count(*) FROM temas t WHERE t.id_unidad=u.id_unidad AND t.publicado) AS temas_publicados,(SELECT count(*) FROM actividades a WHERE a.id_unidad=u.id_unidad AND a.publicado) AS actividades_publicadas FROM unidades u JOIN modulos m USING(id_modulo) JOIN niveles n USING(id_nivel) ORDER BY n.orden_nivel,m.orden_modulo,u.orden_unidad");
    $out['evaluaciones'] = $db->select("SELECT e.id_evaluacion,e.titulo_evaluacion,e.tipo_evaluacion,e.id_unidad,e.id_modulo,e.id_tema,e.publicado,e.configuracion,(SELECT count(*) FROM preguntas p WHERE p.id_evaluacion=e.id_evaluacion) AS preguntas,(SELECT count(*) FROM preguntas p WHERE p.id_evaluacion=e.id_evaluacion AND p.publicado) AS preguntas_publicadas FROM evaluaciones e ORDER BY e.id_evaluacion");
    $out['diccionario'] = $db->selectOne('SELECT count(*) AS entradas FROM diccionario');
    $out['columnas_diccionario'] = $db->select("SELECT column_name,data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='diccionario' ORDER BY ordinal_position");
    $out['practicas_visibles'] = App\Services\PublicacionContenido::exercises()->get(['id_actividad','id_unidad'])->groupBy('id_unidad')->map(fn ($items) => $items->count())->all();
    $out['elegibilidad_evaluaciones'] = App\Models\EvaluacionKichwa::where('publicado', true)->get()->map(fn ($e) => ['id' => $e->id_evaluacion, 'elegibles' => App\Services\EstadoContenido::eligible($e->id_evaluacion)->count()])->all();
    $out['normalizacion'] = $db->selectOne("SELECT public.kichwa_normalizar('  CORAZÓN  ') AS ejemplo");
    $route = collect($app['router']->getRoutes()->getRoutes())->first(fn ($r) => $r->uri() === 'api/admin/overview');
    $out['middleware_admin_overview'] = $app['router']->gatherRouteMiddleware($route);
    $db->rollBack();
    $out['cierre'] = 'ROLLBACK';
} catch (Throwable $exception) {
    if ($db->transactionLevel() > 0) { $db->rollBack(); }
    // No se publica el mensaje: podría contener credenciales o datos del entorno.
    $out['error'] = ['tipo' => $exception::class, 'codigo' => $exception->getCode()];
}
echo json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES).PHP_EOL;
exit(isset($out['error']) ? 1 : 0);
