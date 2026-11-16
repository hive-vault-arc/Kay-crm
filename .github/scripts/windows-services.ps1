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
Write-Output 'PostgreSQL 18 is ready on loopback only.'
