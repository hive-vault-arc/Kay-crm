# KAY frontend

Current manual launch and shutdown commands, including HTTPS certificate trust
and the separate API/worker:
[Local startup](../docs/06-delivery-and-operations/local-startup.md).


The former nine-image design reference was retired under D41; this cleanup does
not change the implemented interface. Current visual direction is in
[DESIGN.md](../DESIGN.md), the [design system](../docs/04-design/design-system.md)
and [Riviera branding](../branding/riviera/README.md). shadcn/ui, Tailwind and
Bklit remain; Iconsax replaces Lucide under
[D33](../decisions.md) through the SSR-safe semantic layer. [Migration coverage,
license and verification](../docs/reference/iconsax/migration.md). All API-backed
commands/fields/permissions are retained. The system font and opaque original
logo remain deliberate asset adaptations. Human approval and DESIGN.md's
documentation merge choice are separate; nothing is deployed by these checks.

SP-22 cumulative verification, the required browser profiles and local compiled
startup are documented in the [acceptance procedure](../docs/06-delivery-and-operations/local-final-acceptance.md).
The [execution ledger](../docs/03-planning/sprints/sp-22-execution.md) records
actual results and retained corrected failures. Local technical gates pass;
product/design review and actual-device/site validation remain separate.
The current client uses real scoped API data;
OpenAPI/Zod/facade boundaries are in the [API catalogue](../docs/04-design/api-catalogue-local.md).
Product/design review and actual-device validation remain separate.

SP-01 provides a French local shell preview; SP-02 connects its safe readiness
status to real local FastAPI/PostgreSQL through an HTTPS facade. SP-03 adds real
login/logout, protected navigation and password change. SP-04 adds administrator
Settings, named users and the temporary-credential handoff flow. SP-05 adds real
Leads and contact identity. SP-06 adds ownership/collaboration, authored history,
archive/restore and authorized merge. SP-07 adds standalone property inventory,
protected legal owners, sale/rental campaigns and availability history.
SP-08 extends Projects with programmes, blocks/floors, real physical units,
reusable types, optional safe briefing and separate whole-programme campaigns.
Configure the backend privately first
using the [backend instructions](../backend/README.md); never enter database
credentials into the frontend UI or public environment variables.

Use Node 24.13.1 and npm 11.8.0. From this directory:

```powershell
npm ci
npm run dev
```

Open `https://localhost:3000`. The private local CA is not added to system trust;
accept/trust it explicitly in a development browser when needed. `/` redirects to
`/login`. First run the backend's interactive bootstrap yourself, choosing your
own password at the hidden prompts. No default/demo account exists. After login,
the dashboard shows authorized KPIs, tasks and notifications; `/deals` provides
the actual pipeline/reservation/outcome workflows and `/visits` the calendar,
booking and follow-up workflows. `/projects` provides real standalone inventory;
its programme tab lists real developments. `/projects/new`, `/projects/[id]` and
`/projects/[id]/edit` provide programme maintenance; `?tab=units` opens available
physical units, with bounded block/floor/type/category/availability filters.
Types describe units but have no stock state. See the
[SP-08 contract](../docs/04-design/api-contracts.md#sp-08-development-wire-contract)
and [execution record](../docs/03-planning/sprints/sp-08-evidence.md).
`/leads` now supports real
scoped search/filters/numbered pages/columns, `/leads/new` atomic creation,
`/leads/[id]` and `/leads/[id]/edit` enquiry read/edit. `/leads?view=contacts`
and `/contacts/[id]` provide canonical contact lookup and identity editing,
enquiries, authored timeline and assignment tabs. Managers/administrators can
preview ownership/collaboration changes, archive/restore and recover an enquiry
from the manager queue. Scoped agents can contribute manual entries and merge
contacts they can both access; cross-portfolio merge requires a manager/admin.
Merged URLs recheck survivor access. Notes do not send email or schedule visits.
Accessible duplicates require a choice; private numbers disclose only the
responsible agent's display name. Only column identifiers/order persist locally;
records and auth proof do not. Administrators can open
Settings → All Users to create/edit/deactivate and recover staff access; other
roles have a direct-URL denied state. Restricted
credentials can only change password or log out, then require fresh login.

```powershell
npm run lint
npm run typecheck
npm run build
npx playwright install chromium firefox webkit
npm run test:e2e
npm run test:chrome
```

E2E starts real Next HTTPS on 3100 and FastAPI HTTPS on 8100, using the guarded
PostgreSQL test target and separate `.next-e2e` output. Keep 3100, 8100 and the
test-only process supervisor's loopback 8101 free. Run database-writing suites
serially: pytest and the browser supervisor share a fail-closed PostgreSQL lease
before fixture cleanup. It stops/restarts its own API
child tree, not the development API or PostgreSQL service. No product test-control
route exists. Browser certificate acceptance is confined to disposable synthetic
contexts; facade-to-API TLS always verifies the explicit local CA. Chrome and Edge projects use the installed
browser channels; Chromium, Firefox and WebKit use Playwright's browser downloads.
The headed Chrome command runs the same cases plus touch/screenshot/200% browser
zoom review in a disposable profile. It never uses a personal Chrome profile.
Safe explicit screenshots are generated under ignored `output/playwright/`; reports and
the disposable zoom profile are under ignored `playwright-report/`/`test-results/`.
Actors/passwords are generated in test-runner memory through private isolated IPC,
not a development seed. Auth traces, video, automatic screenshots and AI failure
snapshots are disabled; automatic privacy teardown strips matcher input contexts.
Never save cookies as storage-state files or capture a password display.

`/ui-checks` mounts real shared form, table, loading and error components only
when Playwright sets `KAY_UI_CHECKS=1` on its development server. It is not linked
from the shell and always returns the unavailable page outside that environment.
Its form validates display metadata locally; it never calls a business API.

For a production-mode local smoke check, stop the dev server before building:

```powershell
npm run build
npm run start
```

`npm run start` is a local HTTPS wrapper for the built Next app, using the same
ignored certificates. This preserves Secure-cookie behavior; it is not a cloud
deployment configuration. To test the built app with isolated actors automatically
(after the dev/browser servers have stopped):

```powershell
$env:KAY_E2E_PRODUCTION = '1'
npm run test:e2e -- --project=chrome --grep 'protected redirect|restricted change|auth outage|@shell|SP04|SP05|SP06'
Remove-Item Env:KAY_E2E_PRODUCTION
```

The build is local quality evidence, not a deployment. Actual Safari/iPhone
testing remains separate from WebKit on Windows.

## Source boundaries

- `src/app`: route composition and loading/error/not-found boundaries.
- `src/features/shell`: navigation and the responsive workspace.
- `src/components/ui`: reviewed shadcn Radix/New York source.
- `src/components/shared`: KAY page, data-state and TanStack table compositions.
- `src/lib/theme.ts`: maps `../branding/kay-ui-tokens.json` into CSS variables;
  Turbopack's root includes the project so tokens have one source of truth.
- `src/app/globals.css`: Tailwind v4 theme mapping and narrow global/safe-area rules.
- `src/features/users`: strict account schemas, administrator pages, shared form,
  one-time transient display, deliberate handoff/reset/deactivation dialogs and
  allowlisted server facade. No temporary credential in GET/storage/URLs/logs.
- `src/features/contacts`: canonical identity/enquiry forms, scoped lists and
  selectors, signed-impact ownership confirmation, immutable history and retry-
  safe commands. Uses the same shadcn/Tailwind system; no new page for each tab.
- `src/lib/api/client.ts`: validated GET/POST/PATCH/PUT `/api/v1` client boundary;
  normalized French errors, bounded waits and uncached calls. `facade.ts` is
  server-only and relays allowlisted calls through verified HTTPS. `src/lib/auth`
  owns strict auth schemas, safe return paths, cookie translation and per-render
  server identity checks. Browser roles/arbitrary headers are never forwarded.
- `src/features/auth`: shadcn/RHF/Zod French forms and transient session controls.
  Only the protected cookie persists session proof; CSRF stays transient in memory.
- `src/features/shell/service-status.tsx`: real loading/ready/unavailable states
  and an explicit keyboard/touch recheck action on the dashboard.
- `src/lib/format`: exact decimal-string MAD display and Casablanca date helpers.
- `src/features/inventory`: Projects standalone tab, category/fact forms, protected
  owner selection, independent sale/rental campaign forms, availability and
  paginated history. Current-property comparisons retain drafts; aggregate pending
  controls prevent a late save from replacing the next form. Reuses shadcn/Tailwind,
  shared TanStack table, contact selector and exact MAD display. No charts or files.
  Inventory facade is strict and server-only. See the
  [SP-07 contract](../docs/04-design/api-contracts.md#sp-07-standalone-inventory-wire-contract)
  and [verified execution evidence](../docs/03-planning/sprints/sp-07-evidence.md).
- `src/lib/table`: validated column preference metadata, with no record storage.

shadcn CLI 4.21.5 generated the eight used primitives with `components.json`
selecting New York, Radix and Lucide. Local changes adapt sizing, contrast, French
sheet controls, class helper imports and wrapping. Registry setup for Bklit is
reserved for SP-17; no charts or alternative chart packages are installed.
The generated Next.js AGENTS block remains below the KAY-specific instructions.

Dependencies are exact and locked. `npm audit --omit=dev` checks the runtime tree;
the execution record separately describes the development-only glob-parser
advisory. Do not run `npm audit fix --force`, which proposes incompatible
framework/tooling downgrades. See [SP-03 evidence](../docs/03-planning/sprints/sp-03-evidence.md)
and [SP-06 evidence](../docs/03-planning/sprints/sp-06-evidence.md), plus
[QA commands](../docs/QA_COMMANDS.md) for actual results. After browser/build
output, run `node scripts/scan-client-secrets.mjs` and
`powershell -NoProfile -File scripts/audit-report.ps1` to repeat the private
bundle/report checks without printing configured secrets or input-bearing steps.

## SP-09 protected attachments

`src/features/files` is shared by contact Documents and inventory Aperçu. Metadata
uses the strict same-origin facade; binary PUT/GET uses exact configured FastAPI
HTTPS with a single-use, session-bound permit and no third-party cookie.
French shadcn controls cover selection, progress/interruption, immutable retry,
quarantine/real verdict, clean-only preview/download and archive confirmation.
No additional frontend dependency or chart was introduced. Start the separate
real ClamAV and explicit-venv worker using the [backend runbook](../backend/README.md#protected-files-and-real-antivirus-sp-09).
Scanner failure keeps files quarantined; it never permits opening them.

Run `npm run test:e2e -- --grep SP09` for the five configured browser projects,
and `npm run test:chrome -- --grep 'SP09 visible Chrome'` for headed responsive,
keyboard/touch/200% review. These own the isolated API/worker/fixture lease;
do not run backend pytest or another browser runner concurrently. See
[SP-09 evidence](../docs/03-planning/sprints/sp-09-evidence.md) for actual results,
known platform limits and pending product/design approval.

## SP-10 independent searches and shortlists

Contact → Recherches and each Lead share `src/features/requirements`. Create
separate sale/rental searches, preserve original MAD budgets and rental periods,
and distinguish required/preferred criteria and unknown/false values. Empty means
unknown, never zero. Budget/area form input accepts a decimal comma or point;
wire money remains an exact decimal string. Annual comparisons never replace
original terms. Inventory selection is manual, not automatic matching/reservation.

The selector labels actual independent properties, physical units and entire
programmes; types only filter real units. Safe target links expose no private
owner identity. Feedback belongs to one search/offering pair. Removal changes
that pair only. Archived Contacts preserve authorized read-only searches. Version
conflicts require explicit comparison/reconciliation; interrupted commands retain
the draft and the same retry key. All scope checks remain authoritative in FastAPI.

Run `npm run test:e2e -- --grep SP10` on all five configured projects, or
`npm run test:chrome -- --grep 'SP10 visible Chrome'` for the headed native-state,
keyboard/touch/responsive/actual200% workflow. These acquire the existing isolated
fixture lease; never run another browser suite or pytest concurrently. No new
package, chart or styling system is required. See [SP-10 evidence](../docs/03-planning/sprints/sp-10-evidence.md)
for actual results, implementation proposals and separate product-review status.

## SP-12 reserve and release

The existing French Affaire detail shows the exact physical scope/current stock
before explicit reserve/release confirmation. Release requires a reason; stale or
interrupted requests retain input and retry identity. Holds have no automatic
expiry. Inventory views show reserved state or safe whole/unit conflict cues.
Creating a proposal or progressing an ordinary stage does not reserve/release.

Run `npm run test:e2e -- --grep SP12` on all five configured projects, or
`npm run test:chrome -- tests/review/reservations.chrome.spec.ts --max-failures=1`
for visible keyboard/touch/responsive/actual200% review. The same isolated-target
lease forbids concurrent pytest/browser runners. No new component kit, token,
chart or dependency is introduced. See [SP-12 evidence](../docs/03-planning/sprints/sp-12-execution.md);
product review remains separate. SP-13 extends this with outcomes below.

## SP-13 outcomes and reopening

The incumbent French deal detail adds won/lost/cancelled forms, exact stock-effect
preview, required date/explanation and positive won amount, optional commission,
review flags, original history and reasoned reopen. Managers record external
outcomes on eligible inventory campaigns without a KAY win or income. Failures
retain input and retry keys; partial programmes have no invented override.

Run `npm run test:e2e -- tests/e2e/outcomes.spec.ts` across all five projects,
or `npm run test:chrome -- tests/review/outcomes.chrome.spec.ts --max-failures=1`
for headed Chrome keyboard/touch/responsive/real200% review. These use real local
HTTPS/API/PostgreSQL, synthetic fixtures and the same exclusive lease. No new
kit, font, token, CSS theme, dependency or chart is added. See
[execution record](../docs/03-planning/sprints/sp-13-execution.md) for actual
results rather than inferring technical or human acceptance from source alone.

## SP-14 calendar and working hours

`/visits` uses seven wide day columns or a chronological mobile agenda;
`/visits/new` and `/visits/{id}` handle explicit three-type booking, rescheduling,
confirmation, result/cancellation and retained history. Colleague mode is CRM
busy-only, not private details or a guarantee of personal availability.
Administrator-only `/settings/working-hours` previews future-visit impact before
saving work/lunch windows and positive agency car capacity. No real hours are
invented. Native civil fields use the backend Casablanca resolver/offsets, not
the inspected older browser timezone data. Hard work/lunch/capacity failures
cannot be overridden by an ordinary overlap explanation.

Run `npm run test:e2e -- tests/e2e/schedule.spec.ts` across the five projects,
or `npm run test:chrome -- tests/review/schedule.chrome.spec.ts --max-failures=1`
for headed native states/keyboard/touch/settings/mobile/actual200% review.
The private test supervisor acknowledges start only after CA-verified HTTPS
liveness; same-origin database readiness is still independently asserted.
All DB-writing suites remain serial. Compiled checks temporarily set
`KAY_E2E_PRODUCTION=1` and restore its previous value. Existing French shadcn/
Tailwind controls and tokens remain; calendar is a KAY composition, not a Bklit
replacement/chart. See [execution evidence](../docs/03-planning/sprints/sp-14-execution.md)
for actual results, corrected attempts and separate product/design review.

## SP-15 work and internal inbox

The dashboard now composes scoped task periods, personal notifications/read
filters and overdue unresolved visit follow-up. Contact detail's Tâches tab
and deal detail reuse inline task create/edit and explicit complete/cancel
confirmations. ?task=UUID selects the permitted record context; private links
never grant access. Current scope/clock/numbered pages come from the backend.

Retained drafts, same-key retries, deliberate current-version comparison,
loading/empty/error/denial and terminal history reuse existing French
shadcn/Tailwind primitives/tokens. No added chart (Bklit N/A), custom CSS,
font/kit/dependency, route destination or external messaging integration.
Run work.spec.ts with test:e2e and review/work.chrome.spec.ts with test:chrome
against compiled HTTPS using KAY_E2E_PRODUCTION=1, restoring the prior value.
[Execution](../docs/03-planning/sprints/sp-15-execution.md) records the actual
tested build, commands, failures, role/device boundaries and independent review.

## SP-16 Finance tab

The existing French deal detail exposes Dossier/Finance only to M/A. The new
features/finance module uses standard shadcn/Tailwind controls for optional
fixed/percentage terms, explicit recognition, partial receipts and explained
original-preserving corrections. Exact BigInt previews agree with backend
Decimal; authoritative balances come from the API. Drafts/retry keys survive
failed responses; stale versions require explicit comparison. Agents receive no
Finance UI/API projection; ordinary closing is unchanged. No chart/library/token.
See [the contract](../docs/04-design/commissions-local.md) and
[SP-16 execution](../docs/03-planning/sprints/sp-16-execution.md).

## SP-18 contact import inside Leads

features/imports adds the M/A Leads action and /leads?view=import contextual
view; batch=UUID restores its protected preview/result. Fixed CSV picker,
cancel/retry, numbered errors/skips, active row/fallback agents and protected
whole-batch approval compose the existing shadcn/Tailwind controls. Dirty/invalid
previews cannot approve. Same-batch retry refreshes actual counts, and unknown
approval responses preserve the original key/body for safe recovery. Contact
reads allow Import CSV provenance without adding it to manual source choices.
No new sidebar destination, chart, dependency or design tokens.
[Contract](../docs/04-design/contact-import-local.md),
[focused tests/review](../docs/03-planning/sprints/sp-18-execution.md).
