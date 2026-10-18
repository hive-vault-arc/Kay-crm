# Staff onboarding and deletion

2026-10-18. Owner-requested local change; scoped implementation and technical
verification complete. Khalid's product review remains pending.
No commit or push is authorized. Existing staff credentials, sessions and CRM
records must not be bulk-changed. Khalid separately approved local migrations0025
and0026. Both are applied; reflected original-column fingerprints across69 tables
are unchanged before/after each upgrade. No real account was deleted.

## Acceptance

- Administrator chooses a temporary password (existing12–1024 character policy),
  can show/hide it privately, and creates an immediately login-enabled account.
- Remove the separate handoff/activation UI and command. First login remains
  restricted to password change/profile/logout; the user chooses their own
  different password and signs in freshly. Keep24-hour initial expiry.
- Resets still require the administrator's current password, revoke target
  sessions and use an admin-chosen temporary password without a handoff step.
- Never return chosen passwords from APIs or persist plaintext in receipts,
  logs, GETs, browser storage, screenshots or test failure artifacts.
- Replace the disable action with confirmed administrator-only Delete, with
  current-version/idempotency/last-final-administrator protection.
- Deletion proposal: hide the account from staff administration and revoke
  login/sessions, retaining its identity and business-history FKs. Do not delete
  any real staff as part of implementation. Retain email identity uniqueness;
  no implicit anonymization, re-creation or restore workflow is added.
- An additive nullable deleted_at marker must not rewrite existing account,
  credential or session facts. Old pending/disabled accounts remain unchanged;
  an explicit administrator reset can recover a nondeleted legacy account.
- Test PostgreSQL migration/history preservation, auth/roles, initial/reset,
  existing-account nonregression, concurrent/retried/interrupted deletion,
  last-admin/self-delete, strict facade and desktop/mobile/keyboard/privacy.

Scope: C01/C13/C14 and AT-01/02/23/38. KAY Riviera and existing shadcn/Tailwind/
Iconsax remain; dense administrator forms are outside design-taste's marketing
workflow. Antislop stays AFTER, without unrelated audit-only fixes.

## Implementation and verification

NewUser/ResetUser accept SecretStr initial passwords; HMAC command fingerprints
include both secret inputs, while receipts/results never return plaintext.
New users and explicit resets are active with the existing24-hour restricted
credential policy; handoff is no longer a login predicate. Removed handoff/disable
routes return404. DELETE keeps ordered agency/user locks, current authority,
version checks, last-final-admin protection and atomic session/audit/receipt.
Old secret-issued receipts retain their safe non-replayable response.

The UI reuses shadcn/Tailwind semantic geometry and Iconsax show/hide/delete
actions. Creation/reset passwords are transient inputs and clear on success or
dismissal; ordinary edit sends no password. Reveal hides on field blur. No copy,
mail/SMS/chat sender or credential persistence was added. Existing legacy states
and handoff metadata remain readable compatibility data, not an activation UI.

Actual commands from backend/: scoped Ruff passes; mypy app/identity and
app/discovery/audit.py passes12 files. PostgreSQL:

- `.venv/Scripts/python.exe -m pytest tests/test_staff_deletion.py tests/test_users.py tests/test_auth.py tests/test_first_admin.py -q --tb=short`:51 passed55.37s.
- `.venv/Scripts/python.exe -m pytest tests/test_scoped_activities.py tests/test_ownership.py tests/test_isolation_migrations.py tests/test_discovery_http_migration.py -q --tb=short`:46 passed96.43s.

Fixtures and migration round-trips held the normal exclusive isolated lease;
KAY's supervisor was stopped and restarted, port8000 untouched. From frontend/:
`npm.cmd run test:unit`:56 passed; lint, types and separate KAY_UI_CHECKS=1 build
pass. An initial unit expectation incorrectly used POST on the DELETE route;
it was corrected without broadening the allowlist. Initial backend expectations
for historical audit counts and the removed handoff login guard were updated
to the explicit new contract; final selections above pass.

## Final browser and privacy closure

From frontend/, with PLAYWRIGHT_BASE_URL=https://localhost:3100:
`npm.cmd run test:chrome -- tests/e2e/users.spec.ts tests/review/users.chrome.spec.ts --workers=1 --max-failures=2`
passes7/7 in3.0m on the guarded real PostgreSQL/API/facade stack. This covers
chosen/revealed initial password and no plaintext response; immediate restricted
login, own-password change/fresh login; delete/hide/revocation; unchanged existing
login, current-admin-password reset, expiry/recovery; role/copied-URL/origin/CSRF
denial; real backend outage/retry, keyboard confirmation/last admin and numbered
pagination. Visible checks exercise320/360/768/1024/1440,44px controls, sampled
contrast, touch and native200% Chrome zoom.

One inspection found a stale in-person-handoff route subtitle and a defective
native-zoom screenshot artifact. The subtitle/settings/error copy was aligned;
the capture uses foreground CDP fromSurface=false, without a layout change.
The complete visible `tests/review/users.chrome.spec.ts --workers=1 --max-failures=1`
confirmation passes2/2 in52.3s. Final safe desktop/mobile/zoom images were opened
and inspected. All secret fields are empty in captures. No further polishing
cycle or unrelated AFTER-only fix was applied; AFTER030 has no numbered finding.
The one four-target source detector returns[].

Final lint and separate.next-e2e production build (including TypeScript) pass.
`node scripts/scan-client-secrets.mjs`:4 browser roots/549 JS/0 configured facade
or signing-secret matches. `powershell -NoProfile -File scripts/audit-report.ps1`:
final confirmation report2 JSON/2 empty step arrays/0 detailed arrays. Only
.last-run.json remains in test-results; native profile is cleaned. Six checked
runtime/generated paths are ignored and untracked. Runtime dependency audit0;
9 inherited dev-only findings remain under the approved expiring exception.

Root documentation validator passes22 sprints/1286 local links/41 acceptance
mappings/13 Mermaid pairs/12 valid API examples; `git diff --check` passes.
Actual OpenAPI inventory is126 paths/159 operations with a refreshed schema hash.
Read-only isolated inspection finds0 users/contacts/enquiries/deals/timeline rows
after guarded cleanup. CA-verified login3100 and API8100 both return200; the test
supervisor is restarted and holds its normal lease. User frontend3100 and unrelated
port8000/PID21320 remain untouched. No retention CLI, real account deletion, bulk
staff change, credential message, production operation, commit or push occurred.
No full-backend aggregate/all-browser/production certification or human product
acceptance is implied by these scoped results.
