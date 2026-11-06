$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$out = Join-Path $root 'documentacion/sprint-3/registros'
New-Item -ItemType Directory -Path $out -Force | Out-Null
$php = (Get-Command php.exe -All | Where-Object Source -Match 'PHP.PHP.8.4' | Select-Object -First 1).Source
if (-not $php) { throw 'No se encontró PHP 8.4.' }
$phpArgs = @('-c', (Join-Path $root 'php.ini'), '-d', ('extension_dir=' + (Join-Path (Split-Path $php) 'ext')))
$results = [Collections.Generic.List[object]]::new()
function Run-Check([string]$id, [string]$cwd, [string]$executable, [string[]]$arguments, [string]$display, [string]$scope) {
    $start = [DateTimeOffset]::UtcNow.ToOffset([TimeSpan]::FromHours(-5)).ToString('o')
    Push-Location (Join-Path $root $cwd)
    try {
        $previous = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        $output = & $executable @arguments 2>&1
        $code = $LASTEXITCODE
        $ErrorActionPreference = $previous
        [IO.File]::WriteAllLines((Join-Path $out ($id + '.txt')), [string[]]@($output | ForEach-Object { $_.ToString() }), [Text.UTF8Encoding]::new($false))
    } finally { Pop-Location }
    $results.Add([pscustomobject]@{id=$id;fecha=$start;directorio=$cwd;comando=$display;codigo=$code;alcance=$scope})
    $results | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $out 'comprobaciones.json') -Encoding UTF8
    Write-Output ($id + ': salida ' + $code)
}
Run-Check 'tipos-frontend' 'frontend' 'npm.cmd' @('run','typecheck') 'npm.cmd run typecheck' 'Tipos TypeScript; no acredita navegación ni API.'
Run-Check 'pruebas-frontend' 'frontend' 'npm.cmd' @('test') 'npm.cmd test' 'Suite existente Node; componentes y servicios con dependencias aisladas.'
Run-Check 'pruebas-unitarias-php' 'backend' $php ($phpArgs + @('vendor/phpunit/phpunit/phpunit','--testsuite','Unit','--do-not-cache-result')) 'php -c ../php.ini -d extension_dir=<ext-PHP84> vendor/phpunit/phpunit/phpunit --testsuite Unit --do-not-cache-result' 'Pruebas unitarias puras; sin base de datos ni pruebas Feature.'
Run-Check 'rutas-api' 'backend' $php ($phpArgs + @('artisan','route:list','--path=api','--except-vendor','--json')) 'php -c ../php.ini -d extension_dir=<ext-PHP84> artisan route:list --path=api --except-vendor --json' 'Registro de rutas; no ejecuta operaciones de negocio.'
Run-Check 'auditoria-db' '.' $php ($phpArgs + @('documentacion/sprint-3/recursos/auditoria-solo-lectura.php')) 'php -c php.ini -d extension_dir=<ext-PHP84> documentacion/sprint-3/recursos/auditoria-solo-lectura.php' 'Metadatos, catálogo y reglas ejecutadas en transacción READ ONLY terminada con ROLLBACK; sin datos de usuarios.'
