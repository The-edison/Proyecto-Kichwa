param([switch]$PostgreSQL)
$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$backend = Join-Path $projectRoot 'backend'
$frontend = Join-Path $projectRoot 'frontend'
$phpIni = Join-Path $projectRoot 'php.ini'
$phpExe = (Get-Command php.exe -ErrorAction Stop).Source
$nodeExe = (Get-Command node.exe -ErrorAction Stop).Source
$extensionDirectory = Join-Path (Split-Path $phpExe) 'ext'
$viteEntry = Join-Path $frontend 'node_modules\vite\bin\vite.js'
$router = Join-Path $backend 'vendor\laravel\framework\src\Illuminate\Foundation\resources\server.php'
$envPath = Join-Path $backend '.env'
if (-not (Test-Path -LiteralPath $envPath)) { throw 'Copia backend/.env.example a backend/.env y configura PostgreSQL.' }
if (-not (Test-Path -LiteralPath $viteEntry) -or -not (Test-Path -LiteralPath $router)) {
    throw 'Ejecuta composer install en backend y npm.cmd install en frontend.'
}
$settings = Get-Content -LiteralPath $envPath
if (-not ($settings | Where-Object { $_ -match '^DB_CONNECTION=pgsql\s*$' })) { throw 'Yachay requiere DB_CONNECTION=pgsql; SQLite no está soportado.' }
if (-not ($settings | Where-Object { $_ -match '^APP_ENV=local\s*$' })) { throw 'Este lanzador sólo se usa con APP_ENV=local.' }
if ($env:DB_CONNECTION -and $env:DB_CONNECTION -ne 'pgsql') { throw 'Quita la variable DB_CONNECTION de la terminal o configúrala como pgsql.' }
function Test-LocalPort([int]$port) {
    $client = [Net.Sockets.TcpClient]::new()
    try { $result = $client.BeginConnect('127.0.0.1', $port, $null, $null); return $result.AsyncWaitHandle.WaitOne(500) -and $client.Connected }
    catch { return $false }
    finally { $client.Dispose() }
}
Push-Location $backend
try {
    & $phpExe -c $phpIni -d "extension_dir=$extensionDirectory" artisan config:clear --no-interaction
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo cargar Laravel. Revisa PHP y sus extensiones.' }
    & $phpExe -c $phpIni -d "extension_dir=$extensionDirectory" artisan migrate --no-interaction
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo migrar. Revisa puerto, usuario y contraseña de PostgreSQL en backend/.env.' }
    & $phpExe -c $phpIni -d "extension_dir=$extensionDirectory" artisan db:seed --no-interaction
    if ($LASTEXITCODE -ne 0) { throw 'No se pudieron crear los niveles y el administrador inicial.' }
    if (-not (Test-Path -LiteralPath (Join-Path $backend 'public\storage'))) {
        & $phpExe -c $phpIni -d "extension_dir=$extensionDirectory" artisan storage:link --no-interaction
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear storage:link. Comprueba permisos de enlaces de Windows.' }
    }
} finally { Pop-Location }
if (-not (Test-LocalPort 8000)) {
    Start-Process -FilePath $phpExe -ArgumentList @('-c', ('"' + $phpIni + '"'), '-d', ('"extension_dir=' + $extensionDirectory + '"'), '-S', '127.0.0.1:8000', '-t', '.', ('"' + $router + '"')) -WorkingDirectory (Join-Path $backend 'public') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $backend 'storage\logs\local-server.log') -RedirectStandardError (Join-Path $backend 'storage\logs\local-server-errors.log') | Out-Null
}
if (-not (Test-LocalPort 5173)) {
    Start-Process -FilePath $nodeExe -ArgumentList @(('"' + $viteEntry + '"'), '--host', '127.0.0.1', '--port', '5173', '--strictPort') -WorkingDirectory $frontend -WindowStyle Hidden -RedirectStandardOutput (Join-Path $backend 'storage\logs\vite.log') -RedirectStandardError (Join-Path $backend 'storage\logs\vite-errors.log') | Out-Null
}
for ($attempt = 0; $attempt -lt 20; $attempt++) {
    if ((Test-LocalPort 8000) -and (Test-LocalPort 5173)) { break }
    Start-Sleep -Milliseconds 250
}
if (-not (Test-LocalPort 8000) -or -not (Test-LocalPort 5173)) { throw 'No se iniciaron los servicios. Revisa backend/storage/logs/*server* y vite-errors.log.' }
Write-Host 'Yachay usa PostgreSQL configurado en backend/.env.'
Write-Host 'Frontend: http://127.0.0.1:5173/'
Write-Host 'API: http://127.0.0.1:8000/'
Write-Host 'El administrador debe cambiar su contraseña inicial en Mi cuenta.'
