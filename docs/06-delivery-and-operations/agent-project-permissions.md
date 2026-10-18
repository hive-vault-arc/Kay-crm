# Agent project creation and editing

Authorization: 2026-10-16. Final handoff: 2026-10-17.
Owner authorization: Khalid requests agents can add/edit projects.
Decision D34 changes C04/C13 permissions, not staff roles or contact ownership.

## Effective boundary

All active, final-password staff can create/edit shared development facts and
briefing, blocks, floors, reusable unit types, standalone properties and physical
units. Existing Projects list/create/edit/detail/structure/unit controls are reused.
No layout, styling, icon, dependency, migration, worker, deployment or CI change.

Agents still cannot change legal owners, upload/manage inventory documents,
create/edit offerings, confirm availability, record external stock outcomes, or
archive/restore inventory. Deal-scoped reservation/outcome rights are unchanged.
Archived inventory remains read-only, including via copied edit URLs.

The backend's explicit ten-operation allowlist is checked after agency/current
actor locks and before receipt lookup. Unrecognized operations are not granted
to agents. Current account/session/version, CSRF, origin, facade proof, strict
bodies, stock constraints, optimistic versions, true-actor history and atomic
receipts remain authoritative.

An agent can select only a currently accessible developer contact. Changing an
existing association also requires scope for the current linked contact. Private
and missing contacts both return NOT_FOUND. Shared inventory access grants no
contact scope. On development PATCH, omitted developer_contact_id now preserves
the association; explicit null requests removal. The editor sends this field
only for creation or a deliberate selection/removal. Retry hashes distinguish
omission from null, so different intents cannot replay the same receipt.

## Verification

Backend, explicit backend/.venv interpreter, isolated synthetic PostgreSQL only:

```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_project_permissions.py tests/test_inventory.py tests/test_inventory_edges.py tests/test_developments.py -q --tb=short -x
.\.venv\Scripts\python.exe -m ruff check app tests
.\.venv\Scripts\python.exe -m ruff format --check app tests
.\.venv\Scripts\python.exe -m mypy app
.\.venv\Scripts\python.exe -m tests.unit_runner
```

Final targeted backend: 53 passed, 0 skipped, 73.11s. The preceding 53-pass run
was before adding omission/null retry protection; it is not the final-source run.
Coverage includes all three roles over HTTP, actual agent project/hierarchy/unit/
property writes, true-actor history, stale versions, retry body conflicts, private
developer denial/preservation, archived targets, thirteen forbidden operation
variants, and real lock waiters losing session authority before receipt replay.
Ruff/format pass (268 files); mypy passes (178 modules). Database-independent
runner: 154 passed, 533 deselected, 3.98s, with database connections refused.

Frontend, from frontend/:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run test:unit
$env:KAY_E2E_PRODUCTION = "1"
npm.cmd run test:e2e -- tests/e2e/project-permissions.spec.ts tests/e2e/inventory.spec.ts tests/e2e/developments.spec.ts --project=chrome --headed --grep 'Project permissions:|SP08: mixed hierarchy|SP07 AT-06/08/27/31:' --max-failures=1
```

The frontend production-mode flag selects the compiled local frontend; the API,
worker and fixtures still use the isolated test database. Restore any prior flag
after running. Lint/typecheck/build pass. The initial browser run had three passes
and one fixture failure: the setup PATCH omitted fields required by the existing
strict facade schema (422). The fixture was corrected without weakening it.
Final compiled visible Chrome rerun: 4/4 passed, 0 skipped, 2.3m. The original
manager workflows, newly allowed agent creation/editing/structure/unit workflow
and private-developer preservation all pass. The final run also removes inherited
NO_COLOR from its child environment while FORCE_COLOR is set, restoring the
original environment afterward; no application warning filter was added.
Frontend isolated TLS/facade/auth units also pass39/39,0 skipped,853.09ms.
Repository/ignore checks and git diff --check pass. Final temporary listeners
on3100/8100/8001:0; pre-existing3000 and shared ClamAV are left untouched.

Visible Chrome uses disposable synthetic sessions with traces/videos/automatic
screenshots disabled. Explicit post-login 1440px and390px captures in ignored
frontend/output/playwright/project-permissions were opened and inspected. They
show the edit action, unchanged neutral V3 project layout and private-contact/
file-write restrictions; no page-level horizontal overflow. No new palette,
geometry, chart or marketing treatment. Antislop/design-system-ops preserve the
incumbent controls; design-taste's dense CRM/form exclusion applies. React guidance
keeps existing authenticated server boundaries and event-driven client state.
All nine V3 reference originals were inspected; no aesthetic-only finding was
selected or implemented. [Scoped AFTER audit](../../anti-slop/audit-023-2026-10-16.md).

Security checked: current authority and private-contact boundaries above; no
production connection, real staff mutation, secret, migration or role promotion.
The full database/ClamAV/browser release matrix is not executed/not passed for
this change and remains required on disposable targets before customer data.
No commit, push or deployment is performed. Existing unrelated login work is
preserved; shared local services that predated this task are not stopped.
