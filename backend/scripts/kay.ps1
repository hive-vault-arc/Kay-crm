param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('setup','serve','test','check','inspect','migrate','bootstrap','lock','install')]
    [string]$Task,
    [ValidateSet('development','test','benchmark','recovery')]
    [string]$Environment = 'development',
    [int]$Port = 8000
)
$ErrorActionPreference = 'Stop'
$backendRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$interpreter = Join-Path $backendRoot '.venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $interpreter)) { throw 'Create backend/.venv with Python 3.14.3 first.' }
$previousEnvironment = $env:APP_ENVIRONMENT
Push-Location -LiteralPath $backendRoot
try {
    $env:APP_ENVIRONMENT = $Environment
    switch ($Task) {
        'setup' { & $interpreter -m app.cli.setup_local }
        'serve' {
            if ($Environment -notin 'development','test') { throw 'Only development/test APIs are supported.' }
            & $interpreter -m app.cli.serve --environment $Environment --port $Port
        }
        'inspect' { & $interpreter -m app.cli.inspect_database }
        'migrate' { & $interpreter -m alembic upgrade head }
        'bootstrap' { & $interpreter -m app.cli.bootstrap_admin }
        'test' { $env:APP_ENVIRONMENT = 'test'; & $interpreter -m pytest --cov=app }
        'check' {
            & $interpreter -m ruff check .
            if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
            & $interpreter -m ruff format --check .
            if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
            & $interpreter -m mypy app
        }
        'lock' {
            & $interpreter -m piptools compile --allow-unsafe --strip-extras --generate-hashes --output-file requirements.txt pyproject.toml
            if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
            & $interpreter -m piptools compile --allow-unsafe --strip-extras --extra dev --generate-hashes --output-file requirements-dev.lock pyproject.toml
        }
        'install' {
            & $interpreter -m pip install --require-hashes -r requirements-dev.lock
            if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
            & $interpreter -m pip install --no-deps --no-build-isolation -e .
        }
    }
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
    $env:APP_ENVIRONMENT = $previousEnvironment
    Pop-Location
}
