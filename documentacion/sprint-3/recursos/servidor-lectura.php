<?php
// Servidor efímero para capturas públicas. No permite operaciones de escritura.
if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'OPTIONS') {
    http_response_code(405);
    exit;
}
define('LARAVEL_START', microtime(true));
require __DIR__.'/../../../backend/vendor/autoload.php';
$app = require __DIR__.'/../../../backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Http\Kernel::class)->bootstrap();
$app['config']->set('session.driver', 'array');
$app['config']->set('cache.default', 'array');
$app['config']->set('logging.default', 'null');
$db = Illuminate\Support\Facades\DB::connection();
$db->statement('SET default_transaction_read_only = on');
if ($db->selectOne('SHOW default_transaction_read_only')->default_transaction_read_only !== 'on') {
    http_response_code(503);
    exit;
}
$app->handleRequest(Illuminate\Http\Request::capture());
