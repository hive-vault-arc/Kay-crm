# Local startup and shutdown

Updated: 2026-10-20.

The complete, current Windows/PowerShell procedure is now
[Run KAY locally](../../RUN_LOCALLY.md). It covers fresh installation and
ordinary daily operation in one file:

- Required software and locked Python/Node dependencies.
- Native PostgreSQL preparation, private configuration and separate test targets.
- Local HTTPS certificates, migrations and one-time administrator bootstrap.
- Docker/ClamAV, Uvicorn, worker and frontend startup.
- Health checks, troubleshooting, compiled mode and safe shutdown.

Use frontend `https://localhost:3100` and API `https://localhost:8100` with
matching private configuration. The older 3000/8000 commands have been removed
from this entry point to avoid sending users to the wrong ports. This does not
change the source defaults or another project's services on 8000.

[Historical startup execution](local-startup-execution.md) retains the
2026-10-16 HTTPS launcher, Windows socket-loop and browser-trust evidence.
Those dated results are not a fresh whole-product test. The optional signed
website simulator has its own [intake contract](../04-design/website-intake-local.md).
