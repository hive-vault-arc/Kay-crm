#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
./.heroku/python/bin/python -m app.cli.check_postgres_ca
exec ./.heroku/python/bin/python -m app.cli.worker
