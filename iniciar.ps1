param(
    [switch]$PostgreSQL
)

$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$backend = Join-Path $projectRoot 'backend'
$frontend = Join-Path $projectRoot 'frontend'
$phpIni = Join-Path $projectRoot 'php.ini'
$phpFallback = 'C:\Users\said_\AppData\Local\Microsoft\WinGet\Packages\PHP.PHP.8.4_Microsoft.Winget.Source_8wekyb3d8bbwe\php.exe'
$nodeFallback = 'C:\Users\said_\AppData\Local\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.19.0-win-x64\node.exe'
$phpExe = if (Test-Path $phpFallback) { $phpFallback } else { (Get-Command php.exe -ErrorAction Stop).Source }
$nodeExe = if (Test-Path $nodeFallback) { $nodeFallback } else { (Get-Command node.exe -ErrorAction Stop).Source }
$viteEntry = Join-Path $frontend 'node_modules\vite\bin\vite.js'
$router = Join-Path $backend 'vendor\laravel\framework\src\Illuminate\Foundation\resources\server.php'

if (-not (Test-Path $viteEntry) -or -not (Test-Path $router)) {
    throw 'Faltan dependencias. Ejecuta composer install en backend y npm install en frontend.'
}

function Test-LocalPort([int]$port) {
    $client = [System.Net.Sockets.TcpClient]::new()
    try {
        $result = $client.BeginConnect('127.0.0.1', $port, $null, $null)
        return $result.AsyncWaitHandle.WaitOne(500) -and $client.Connected
    } catch {
        return $false
    } finally {
        $client.Dispose()
    }
}

if ($PostgreSQL) {
    if (Test-LocalPort 8000) {
        throw 'El puerto 8000 ya está ocupado. Detén el servidor actual antes de cambiar a PostgreSQL.'
    }
    $passwordLine = Get-Content (Join-Path $backend '.env') | Where-Object { $_ -match '^DB_PASSWORD=' } | Select-Object -First 1
    if (-not $passwordLine -or $passwordLine -eq 'DB_PASSWORD=') {
        throw 'Configura DB_PASSWORD en backend/.env antes de iniciar con PostgreSQL.'
    }
    Write-Host 'Iniciando con PostgreSQL configurado en backend/.env...'
} else {
    $previewDb = Join-Path $backend 'database\kichwa-preview.sqlite'
    if (-not (Test-Path $previewDb)) { New-Item -ItemType File -Path $previewDb | Out-Null }
    $env:DB_CONNECTION = 'sqlite'
    $env:DB_DATABASE = $previewDb
    Write-Host 'Iniciando vista previa local con SQLite...'
}

Push-Location $backend
try {
    & $phpExe -c $phpIni artisan migrate --force --no-interaction
    if ($LASTEXITCODE -ne 0) { throw 'No se pudieron ejecutar las migraciones.' }
} finally {
    Pop-Location
}

if (-not (Test-LocalPort 8000)) {
    Start-Process -FilePath $phpExe -ArgumentList @('-c', $phpIni, '-S', '127.0.0.1:8000', '-t', '.', $router) -WorkingDirectory (Join-Path $backend 'public') -WindowStyle Hidden | Out-Null
}
if (-not (Test-LocalPort 5173)) {
    Start-Process -FilePath $nodeExe -ArgumentList @($viteEntry, '--host', '127.0.0.1') -WorkingDirectory $frontend -WindowStyle Hidden | Out-Null
}

Write-Host 'Abre http://127.0.0.1:5173/ en tu navegador.'
Write-Host 'Si es tu primera vez, entra en Registro y crea una cuenta de estudiante.'
