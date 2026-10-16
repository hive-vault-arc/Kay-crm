# DigitalOcean backend detection

2026-10-16. Detection metadata only, not a cloud deployment or production approval.

Subsequent owner-authorized [managed-runtime startup repair](digitalocean-runtime-fix.md)
addresses the reported `.heroku/python` import rejection and adds a real Linux
Uvicorn CI probe. Detection, runtime compatibility and full cloud readiness remain
separate; the other local-only configuration/storage/recovery boundaries below
are not removed by that repair.

The selected source directory is `backend` in `hive-vault-arc/Kay-crm`, branch
`main`. DigitalOcean's [Python buildpack reference](https://docs.digitalocean.com/products/app-platform/reference/buildpacks/python/)
lists `requirements.txt`, `Pipfile` and `setup.py` as detection markers. A bare
`pyproject.toml`/`requirements.lock` pair is not its documented pip detection
entry point; its uv integration additionally requires `uv.lock`. KAY keeps its
existing pip/hash-lock workflow rather than adding a second package manager.

At Khalid's explicit request, `backend/requirements.txt` contains the full normal
pip-compiled runtime dependency list, preserving every existing version/hash.
The old `requirements.lock` is only a backwards-compatible `--require-hashes`
include of `requirements.txt`, not a second dependency list. The lock-generation
command now writes `requirements.txt`. It does not pull in development tools,
remove hashes or change package versions. The
existing `backend/.python-version` remains3.14.3, matching pyproject.toml and CI.

The existing recovery code manifest/compatibility digest also includes the new
canonical filename. A regression test first reproduced its omission, then passes
after adding that one path; the compatibility guard is not relaxed or bypassed.
DigitalOcean documents3.14.3 support on its Ubuntu-22 Python buildpack. No Docker
image, Procfile, credentials, public deployment spec or auto-deploy workflow is
added by this repair.

After the protected PR merges, reselect/refresh `main` and the `backend` source
directory in the creation wizard to request detection again. See the official
[monorepo guide](https://docs.digitalocean.com/products/app-platform/how-to/deploy-from-monorepo/).
Do not click Create Resources or enable a live deployment based on detection
alone. Main protection/CI must not be bypassed to make the picker refresh sooner.

## Runtime blockers remain explicit

The approved sprint implementation is local only. It originally required this
checkout's Python3.14.3 `.venv` even for application import; the linked runtime
repair additionally accepts the pinned Linux buildpack prefix for the API,
while keeping local CLI tools strict. It still requires loopback PostgreSQL URLs, private local storage,
local HTTPS/facade configuration and a real antivirus worker. Backup protection
uses Windows current-user DPAPI/ACLs, and recovery targets have guarded local
identities. A remote managed-database URL is still rejected. The frontend also validates
its current localhost HTTPS upstream. These are existing safety boundaries, not
errors to disable as a detection workaround.

Production needs a separately reviewed configuration/storage/backup/TLS/worker
and migration plan, managed PostgreSQL authorization, private secrets, first-
administrator operation and deployment acceptance. No local `.env`, database
password, certificate/private key, Windows backup point or real record should be
uploaded to solve the picker warning. Detection success is not runtime success.

## Verification boundary

Regression cases in `backend/tests/test_packaging.py` ensure the standard file
contains the actual runtime pins, the old entry point is only an alias and the
Python pins agree. Use
the project venv for `pip install --dry-run --require-hashes -r requirements.txt`.
Repository index/secret checks and the existing full hosted CI must pass before
merge. Actual DigitalOcean detection/build/deployment is not claimed until
observed in that service; no cloud resources are created by these checks.

Local preflight: final packaging/Uvicorn10/10 pass2.61s; Ruff check/format4 files
and strict mypy177 modules pass. Both requirement filenames parse successfully
with pip's hash-enforcing dry-run; the compatibility runtime pip-audit is clean.
The full pin/hash content is independently compared against the former lock,
with only the generated output filename comment changed. Documentation checks
and index/secret checks precede publication. Protected-main publication uses a
real PR and the existing full hosted CI; the final handoff/PR records its actual
result, not a claimed cloud success.
