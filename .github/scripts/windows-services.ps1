$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true' -or $env:CI -ne 'true' -or -not $IsWindows) {
    throw 'GITHUB_HOSTED_WINDOWS_REQUIRED'
}
$serviceRoot = Join-Path $env:RUNNER_TEMP 'kay-ci-services'
if (Test-Path -LiteralPath $serviceRoot) { throw 'FRESH_SERVICE_DIRECTORY_REQUIRED' }
New-Item -ItemType Directory -Path $serviceRoot | Out-Null

function Get-VerifiedArchive([string]$Url, [string]$Name, [string]$Sha256) {
    $archive = Join-Path $serviceRoot "$Name.zip"
    Invoke-WebRequest -Uri $Url -OutFile $archive
    if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne $Sha256) {
        throw 'SERVICE_DOWNLOAD_INTEGRITY_FAILED'
    }
    $destination = Join-Path $serviceRoot $Name
    Expand-Archive -LiteralPath $archive -DestinationPath $destination
    return $destination
}

$postgresRoot = Get-VerifiedArchive 'https://get.enterprisedb.com/postgresql/postgresql-18.6-1-windows-x64-binaries.zip' 'postgres' 'fbe23da234ee31547bf8a36d29dfd81e82b849df2d2b78d2eecb43d360252f8c'
$postgresBin = Join-Path $postgresRoot 'pgsql/bin'
$postgresData = Join-Path $serviceRoot 'pgdata'
$password = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
Write-Output "::add-mask::$password"
$passwordFile = Join-Path $serviceRoot 'bootstrap-password.txt'
[IO.File]::WriteAllText($passwordFile, $password)
try {
    & (Join-Path $postgresBin 'initdb.exe') '-D' $postgresData '-U' 'postgres' '-A' 'scram-sha-256' '--pwfile' $passwordFile '--encoding=UTF8' '--locale=C'
    if ($LASTEXITCODE -ne 0) { throw 'CI_POSTGRES_INIT_FAILED' }
} finally { Remove-Item -LiteralPath $passwordFile }
& (Join-Path $postgresBin 'pg_ctl.exe') '-D' $postgresData '-l' (Join-Path $serviceRoot 'postgres.log') '-o' '-p 5433 -h 127.0.0.1' '-w' 'start'
if ($LASTEXITCODE -ne 0) { throw 'CI_POSTGRES_START_FAILED' }
"CI_POSTGRES_BIN=$postgresBin" | Out-File -LiteralPath $env:GITHUB_ENV -Append -Encoding utf8
"CI_POSTGRES_PASSWORD=$password" | Out-File -LiteralPath $env:GITHUB_ENV -Append -Encoding utf8

$clamavRoot = Get-VerifiedArchive 'https://github.com/Cisco-Talos/clamav/releases/download/clamav-1.5.4/clamav-1.5.4.win.x64.zip' 'clamav' '0d9e0228b2674137ea1a2853566c98a0278ad52ab2582c3d6dbd75373848c395'
$clamavBin = Split-Path (Get-ChildItem -LiteralPath $clamavRoot -Filter 'clamd.exe' -Recurse | Select-Object -First 1).FullName -Parent
if (-not $clamavBin) { throw 'CLAMAV_BINARY_MISSING' }
$definitions = Join-Path $serviceRoot 'definitions'
New-Item -ItemType Directory -Path $definitions | Out-Null
$freshConfig = Join-Path $serviceRoot 'freshclam.conf'
$cvdCertificates = Join-Path $clamavBin 'certs'
[IO.File]::WriteAllText($freshConfig, "DatabaseDirectory $definitions`nCVDCertsDirectory $cvdCertificates`nDatabaseMirror database.clamav.net`nTestDatabases yes`n")
& (Join-Path $clamavBin 'freshclam.exe') "--config-file=$freshConfig" '--stdout'
if ($LASTEXITCODE -ne 0) { throw 'CLAMAV_DEFINITION_UPDATE_FAILED' }
$clamConfig = Join-Path $serviceRoot 'clamd.conf'
$scanTemp = Join-Path $serviceRoot 'scan-temp'
New-Item -ItemType Directory -Path $scanTemp | Out-Null
[IO.File]::WriteAllText($clamConfig, "DatabaseDirectory $definitions`nCVDCertsDirectory $cvdCertificates`nTemporaryDirectory $scanTemp`nTCPSocket 3310`nTCPAddr 127.0.0.1`nMaxFileSize 32M`nMaxScanSize 64M`nLogFile $(Join-Path $serviceRoot 'clamd.log')`nLogTime yes`n")
if (Get-Service -Name clamd -ErrorAction SilentlyContinue) { throw 'EXISTING_CLAMAV_SERVICE_REFUSED' }
$clamd = Join-Path $clamavBin 'clamd.exe'
& $clamd '--install-service'
if ($LASTEXITCODE -ne 0 -or -not (Get-Service -Name clamd -ErrorAction SilentlyContinue)) { throw 'CLAMAV_SERVICE_INSTALL_FAILED' }
$serviceCommand = '"' + $clamd + '" --daemon --service-mode --config-file="' + $clamConfig + '"'
& sc.exe config clamd binPath= $serviceCommand
if ($LASTEXITCODE -ne 0) { throw 'CLAMAV_SERVICE_CONFIG_FAILED' }
Start-Service -Name clamd
$deadline = [DateTime]::UtcNow.AddMinutes(3)
do {
    if ((Get-Service -Name clamd).Status -eq 'Stopped') { throw 'CLAMAV_START_FAILED' }
    try {
        $socket = [Net.Sockets.TcpClient]::new('127.0.0.1', 3310)
        $stream = $socket.GetStream()
        $stream.ReadTimeout = 1500
        $request = [Text.Encoding]::ASCII.GetBytes("zPING`0")
        $stream.Write($request, 0, $request.Length)
        $buffer = [byte[]]::new(64)
        $count = $stream.Read($buffer, 0, $buffer.Length)
        if ([Text.Encoding]::ASCII.GetString($buffer, 0, $count).Contains('PONG')) { $ready = $true }
    } catch { $ready = $false } finally { if ($socket) { $socket.Dispose() } }
    if (-not $ready) { Start-Sleep -Seconds 2 }
} while (-not $ready -and [DateTime]::UtcNow -lt $deadline)
if (-not $ready) { throw 'CLAMAV_READINESS_FAILED' }
Write-Output 'PostgreSQL18 and real signature-verified ClamAV are ready on loopback only.'
