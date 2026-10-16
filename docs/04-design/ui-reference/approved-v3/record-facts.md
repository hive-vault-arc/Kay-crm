# Lead and Deal detail facts

2026-10-16. Explicit owner-requested local UI refinement. No commit, push or
deployment is authorized for these pending UI changes.

Reading this as operative KAY record details for staff, retaining French,
ivory/black/gold identity and ENERGY1 / RHYTHM1 / MOTION1. Design-system-ops owns
geometry; antislop applies DURING as previously requested. This is a dense CRM
refinement, not a marketing concept or new product scope.

## Coverage and decisions

| Surface | Applied pattern | Preserved behavior |
| --- | --- | --- |
| `/leads/[id]`: Contact | Icon-labelled two-column facts | Actual contact link, main phone/email and responsible agent |
| `/leads/[id]`: Demande reçue | Same facts | Status, initial source, Casablanca received time, assignment, message and optional original reference |
| `/deals/[id]`: Contact et offre liée | Same facts | Contact, current responsibility, stage/version, original enquiry, next action, optional linked search and no-offering state |
| Linked offering | Existing facts with Iconsax section heading | Exact inventory target, price/status/conditions and real target link |
| Lead assignment/search, deal operation/finance/task/file/history sections | Existing operation surfaces retained below summary | Permissions, forms, validation, conflicts, original versions and real actions unchanged |
| `/leads/[id]/edit`, new Lead/Deal and linked Contact routes | Existing forms/navigation | No invented inline editing, deletion, conversion, country or language fields |

| Reference observation | System role | Existing tokens/component | Action |
| --- | --- | --- | --- |
| Icon beside each label | Recognition of person, phone, email, source, date or action | Typed official Free linear Iconsax,16px/8px gap | Reuse |
| Left/right information pairs | Scan related facts without one very tall column | Shared `RecordFacts`, two columns from1280px,32px gutter | Extend shared composition, opt-in only |
| Label beside value | Stable internal alignment |2:3 grid from640px,16px inner gap | Extend shared composition |
| Mobile values below labels | Retain readable long French names/values | One column,4px inner gap,20px row gap, existing wrapping | Reuse spacing scale |
| Neutral section boundaries | Existing record hierarchy | Existing section surface/radius/border and `SectionHeading` | Reuse |

Exception: Leads/Deals facts use the workspace width rather than the old52rem
reading cap and no longer force every fact into one column. Reason: the owner
explicitly asked for two-column facts with label/value alignment. Scope: these
two detail pages only, not every `record-stack` or embedded operation form.

No values come from the reference. Missing existing email is explicitly
`Non renseigné`, not an interactive placeholder. Icons are decorative alongside
real text labels. No palette/font/dependency/logo/chart/API/backend change.

## Verification scope

Focused compiled headed Chrome uses guarded synthetic database fixtures, not
production. Check actual Lead-to-Deal creation, contact/original enquiry links,
editing, retained conflicts/retry, roles and safe loading/error/denied states.
Check320/360/768/1024/1280/1440px, real touch, keyboard focus, native200% Chrome
zoom, overflowing names and existing minimum44px controls. Actual results are
recorded below after execution. Whole-CRM regression, physical devices and
assistive-technology user testing are not implied by this UI-only check.

## Actual verification

Final `npm.cmd run lint`, `npm.cmd run typecheck` and `npm.cmd run build` from
`frontend/` pass with no reported warnings/errors. Icon inventory:29 semantic
exports,27 consumers,67 sites,0 violations;3 chart roots remain excluded.
No backend, workflow, dependency, lockfile or business-rule change.

Initial compiled headed selection:

```powershell
$env:KAY_E2E_PRODUCTION='1'
Remove-Item Env:NO_COLOR -ErrorAction SilentlyContinue
npm.cmd run test:chrome -- tests/e2e/record-facts.spec.ts tests/e2e/leads.spec.ts tests/e2e/deals.spec.ts --grep 'Lead/Deal facts:|AT-03/23/39|AT-12/39|committed-response' --reporter=list --max-failures=1
```

Result:4 passed,1 failed,1 not run,1.9m. Existing Lead identity/contact/edit,
invalid-field/idempotency/revocation, explicit Deal creation/proposal/stage skip
and preserved-draft/stale-version recovery cases passed. The new layout case
failed because a broad alert selector also matched Next.js's hidden route
announcer. Scope it to main, not a weaker application/access check. The focused
two-case rerun passed2/2 in1.3m. An earlier test typecheck duplicate `width`
property was also corrected; final typecheck is clean.

One visual alignment correction top-aligns summary link text while retaining
the44px hit region. Admin capture now waits for the nested assignment select;
native zoom captures scroll the actual facts into view. Rebuild and final run:

```powershell
$env:KAY_E2E_PRODUCTION='1'
Remove-Item Env:NO_COLOR -ErrorAction SilentlyContinue
npm.cmd run test:chrome -- tests/e2e/record-facts.spec.ts tests/e2e/deals.spec.ts --grep 'Lead/Deal facts:|permitted requirement/exact offering' --reporter=list --max-failures=1
```

Result:3/3 passed,0 skipped,1.7m. This includes actual requirement/exact-unit
offering prefill, proposal/stale-target versions, both record layouts and native
200% Chrome zoom. Together with the four earlier unchanged operation regressions,
seven distinct focused cases passed; this is not one full seven-test suite run
or a complete CRM/release regression result.

Observed widths320/360/768/1024/1280/1440px: correct1/2 fact columns, inline
label/value grids from640px, all fact icons16px/decorative, long names and
references wrap, page/main horizontal overflow0. Measured normal-text contrast
minimum6.045:1; measured controls and summary links retain at least44px height.
Main review records0 unexpected console/page errors; injected503 and real scoped
404 are expected. Roles retain admin-only assignment and deny another agent's
copied Lead/Deal IDs without exposing the contact name.

Click-through: Lead edit opens its real form and returns through Voir le Lead;
Créer une affaire saves a distinct real deal with the originating enquiry kept;
touch on the original enquiry returns to the Lead and touch on contact name
opens its actual contact; deal edit/cancel restores trigger focus; both detail
read failures recover through Réessayer. Existing regression cases actually
save Lead/contact edits, accepted proposals and stage skips, and recover an
interrupted create/stale edit without losing input or duplicating the deal.

Desktop/mobile and representative loading/error/denied frames were opened,
then final desktop, settled admin and native zoom frames were inspected in one
confirmation pass. The12 safe PNGs and geometry JSON are under ignored
`frontend/output/playwright/record-facts/`; only synthetic post-login data is
captured. No screenshot is a shipping application asset.

### Scoped antislop delivery gate

- Hard gate PASS: real API facts, honest missing email, semantic definition
  lists, no invented fields/actions/claims; loading/error/retry and real denied
  states are exercised. Existing operation behavior remains authoritative.
- R-03/R-25/R-32 PASS: six widths, native200%, keyboard focus and touch,
 6.045:1 measured normal-text contrast, no horizontal overflow,44px controls.
- R-26/R-35 PASS: changed summary links navigate and moved data is real;
  the click-through and actual commands/results are recorded above.
- Purpose/liveliness/quality locks PASS: icon/content meanings and geometry
  reasons are mapped above; KAY's existing light identity,1/1/1 dials, record
  title hierarchy and neutral section surfaces remain. No new motion/font/
  palette, marketing workflow or unrelated AFTER-only fix. No delegated or
  independent-review verdict is claimed.

Final listener check finds0 project ports on3000/3001/3100/3101/8000/8001/
8100/8101/8102/8200/8201/8202. Test servers are stopped; shared PostgreSQL5432
and Codex tool workers are intentionally retained. No production access,
real-data release test, commit, push or deployment. Human product review pending.
