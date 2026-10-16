#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
./.heroku/python/bin/python -m app.cli.check_postgres_ca
exec ./.heroku/python/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8080}" --no-access-log
