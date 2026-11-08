param()

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$transferDirectory = Join-Path $projectRoot '.production-transfer'
New-Item -ItemType Directory -Path $transferDirectory -Force | Out-Null
$privateEnvironment = Join-Path $transferDirectory 'dokploy.env'

if (-not (Test-Path -LiteralPath $privateEnvironment)) {
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $keyBytes = New-Object byte[] 32
        $passwordBytes = New-Object byte[] 32
        $generator.GetBytes($keyBytes)
        $generator.GetBytes($passwordBytes)
        $applicationKey = [Convert]::ToBase64String($keyBytes)
        $databasePassword = ([BitConverter]::ToString($passwordBytes)).Replace('-', '').ToLowerInvariant()
        $environmentText = [IO.File]::ReadAllText((Join-Path $PSScriptRoot '.env.example'))
        $environmentText = $environmentText.Replace("APP_KEY=`n", "APP_KEY=base64:$applicationKey`n").Replace("APP_KEY=`r`n", "APP_KEY=base64:$applicationKey`r`n")
        $environmentText = $environmentText.Replace("DB_PASSWORD=`n", "DB_PASSWORD=$databasePassword`n").Replace("DB_PASSWORD=`r`n", "DB_PASSWORD=$databasePassword`r`n")
        [IO.File]::WriteAllText($privateEnvironment, $environmentText, (New-Object System.Text.UTF8Encoding($false)))
    } finally {
        $generator.Dispose()
    }
    Write-Host 'Variables privadas generadas en .production-transfer/dokploy.env.'
} else {
    Write-Host 'Se conservan las claves existentes en .production-transfer/dokploy.env.'
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$archivePath = Join-Path $transferDirectory "yachay-production-$timestamp.zip"
Push-Location (Join-Path $projectRoot 'backend')
try {
    & php artisan yachay:export-production $archivePath --no-interaction
    if ($LASTEXITCODE -ne 0) {
        throw 'La exportación falló. No uses un paquete incompleto.'
    }
} finally {
    Pop-Location
}
$checksum = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
[IO.File]::WriteAllText("$archivePath.sha256", "$checksum  $([IO.Path]::GetFileName($archivePath))`n", (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Paquete privado: $archivePath"
Write-Host 'No subas .production-transfer a Git ni al directorio público de la web.'
