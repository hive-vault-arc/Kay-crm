# KAY: migrate the selected design into the existing CRM

Date: 2026-10-25
Status: implementation active on the feature branch; see [execution](design-prototype-migration-execution.md)
Working branch: `codex/redesign`
Starting CRM commit: `e0bdc09feed0c3920b63cda635e5cf4cf42e08b1`
Design source: `C:/Users/ali-a/Documents/the vault/designs/kay`
Source inventory: [migration inventory](design-prototype-migration-2026-10-25.json)

## 1. Owner instructions and recommendation

2026-10-26 execution instruction: continue implementation until the redesign
branch is finished; final verification and owner approval follow that work.
Routine technical checks remain part of implementation. Deferred native review
does not block unrelated source progress and is never reported as completed.

The owner explicitly chooses the current prototype as the appearance and UX
reference. Preserve its desktop/mobile layouts, theme, spacing, tabs, cards,
drawers, interactions and motion. When it intentionally organizes a feature
differently from the existing CRM, retain that organization. Add missing CRM
functionality within this design; do not restore an older repository screen to
accommodate it. Do not recreate rejected tabs, duplicate sections or tall cards.

All work stays on `codex/redesign`. `main` remains unchanged. Merge requires
completed technical verification and the owner's explicit final confirmation.
Creating this branch is authorized and completed; it is not merge permission.

**Recommended approach: migrate the presentation directly into the existing
Next.js frontend, in small complete slices.** The CRM already has Next16.4.2,
React19.3.1, TypeScript, shadcn, Tailwind4 and working feature/API boundaries.
Creating another Next app first would require a second integration and create
two competing implementations of authentication, routes, forms and permissions.
No separate Vite-to-Next staging application or framework upgrade is needed.

Convert the prototype's selected compositions to React components while reusing
the CRM's existing services, schemas, authentication and business commands.
The prototype remains the read-only reference during migration, not a second
production implementation.

| Concern | Authority during migration |
| --- | --- |
| Appearance, density, placement, tab distribution, mobile behavior, motion | Frozen current prototype and latest owner instructions |
| Current data, permissions, private scope, validation, concurrency, history | CRM contracts and backend enforcement |
| Location of a feature intentionally moved in the design | Selected design; keep its new home and connect the existing command |
| A missing business capability | Add it using the selected components and hierarchy |
| A genuine business/document-content conflict | Record the exact conflict and a minimal resolution; do not silently change the design or weaken a contract |
| Implementation machinery | Existing Next/React/TypeScript, shadcn/Tailwind, Bklit and approved shared boundaries |

The older Riviera visual rules describe the existing app. They are not a reason
to recolor or rearrange the selected pearl/graphite prototype. Record the new
visual authority in the branch's design documentation and token mapping as part
of foundation work. Historical decisions/evidence remain historical.

## 2. Baselines and protection

- Local branch `codex/redesign` was created from `main` at the starting commit.
  No application source has changed in this planning step.
- Preserve the existing35 local additions in `docs/AGENT_LESSONS.md` and the
  existing untracked `prototype-motion-plan-2026-10-23.md`. They are not
  automatically part of a migration commit. Stage explicit paths, never all
  local work indiscriminately.
- The selected prototype includes the newest compact directory-card revision,
  photo recovery and all accepted earlier refinements. Its latest source gate
  records30 serial regression suites plus Vite build2779,254 pinned inputs and
  zero source drift. This is prototype source/model/controller evidence, not
  proof of real CRM functionality or native visual acceptance.
- The local ignored snapshot and its checksum are recorded in the inventory.
  It is a recovery/reference copy, not a database backup or a committed media
  bundle. Keep the original prototype and preview4186 available for comparison.
- Keep production/development data, sessions, credentials, original blank
  document models, migrations, worker/outbox and private-storage configuration
  out of presentation refactoring unless a separately identified integration
  requires a scoped change. Do not run retention, seed real records or migrate
  prototype arrays into PostgreSQL.

## 3. Design choices that must survive the port

1. Preserve the current KAY brand, Inter-based screen typography, pearl/glass
   surfaces, graphite controls, atmosphere image, radii, borders, shadows and
   semantic status colors. Audit the final active CSS cascade before extracting
   tokens; copying only the first stylesheet would give the wrong appearance.
2. Keep compact full-width frames and purposeful internal spacing. Supporting
   rails fit content; do not stretch blank panels or add filler sections.
3. Reuse the consistent Lead/Deal detail hierarchy. Contacts retain Aperçu /
   Activité, Dossiers liés below Responsabilité, and the Recherches action in
   its selected location. Do not restore a duplicate Dossiers tab.
4. Owners retain Aperçu / Activités with Patrimoine in the compact right rail.
   Inventory retains combined property facts/characteristics/offers; programmes
   retain Aperçu / Unités. Documents and Modifier stay in the page header;
   offer/unit creation actions stay with their sections.
5. Side panels use tonal cards/lists rather than data tables. Keep the selected
   file picker, cancel/back destinations, PDF preparation/history tabs and
   short clickable inventory steppers with draft/error retention.
6. Keep the selected Help hub/categories/guides/reader structure. Do not restore
   the removed essential-answers block or the repository's former help layout.
7. At the selected phone breakpoint,830px, CRM directories use compact lists;
   Kanban remains desktop-only. Projects always uses image cards. Preserve the
   desktop display preference while changing phone presentation.
8. Preserve the latest mobile cards: Project image left, complete compact
   details/offers right and one native full-card link; no separate open footer.
   Prospects pairs phone with metadata; Contact/Deal/Owner cards share compact
   metadata/disclosure rows. Keep the grouped icon search/filter toolbar,
   top-aligned form labels, one main detail scroller and selected scrollbar
   presentation without disabling native scrolling.
9. Port the current restrained motion, including320ms local,420ms panel and
   460ms page entrances and their actual exit/hover tokens. Read all active
   motion sources, retain reduced motion and interruption safety. Commands,
   validation, focus and acknowledgements must remain immediate.

These are owner-selected design decisions, not a claim that the latest source
revision has completed native mobile, keyboard, zoom or accessibility review.

## 4. Technical mapping

| Prototype responsibility | Existing CRM home / proposed shared presentation |
| --- | --- |
| Shell, sidebar, header, account/theme/search controls | `features/shell`, `features/auth`, `features/discovery`, shared brand/header components |
| Tokens, fonts, atmosphere, modes, motion | `branding` token definitions, `lib/theme.ts`, `app/layout.tsx`, Tailwind theme, a narrowly owned motion/atmosphere layer |
| Buttons, inputs, selects, tabs, sheets, confirmations | Existing `components/ui` shadcn primitives, KAY variants and shared compositions |
| Directory tables, cards, selection, paging, filters | Existing feature list controllers plus shared responsive directory presentation |
| Record shell, field editing, tab/scroll state, drawer navigation | Existing Contact/Lead/Deal/Owner/Inventory feature controllers plus a shared record layout |
| Project/property/programme/unit cards, steppers, facts | `features/inventory`, `features/owners`, shared cards/record facts |
| Tasks, visits, activity, notifications | `features/work`, `features/schedule`, `features/activities`, existing live invalidations |
| Requirements and discussed/visited projects | `features/requirements`, `features/project-links` |
| File/photo/version and PDF UI | `features/files`, `features/generated`, existing private facade/transfers |
| Dashboard, reports, finance | `features/reports`, `features/finance`, existing Bklit charts |
| Import/export/audit/intake/help/staff | Existing `imports`, `discovery`, `intake`, `help`, `users` feature modules |

Implementation rules:

- Keep server identity checks and the protected App Router layout. Use client
  components for interactive forms, drawers, tabs and browser APIs; keep secrets
  and privileged access server-side. This follows the documented
  [Next server/client composition](https://nextjs.org/docs/app/getting-started/server-and-client-components).
- Introduce semantic tokens matching the prototype, then implement component
  geometry with Tailwind and shadcn variants. Tailwind's
  [theme variables](https://tailwindcss.com/docs/theme) support this mapping.
  Do not dump the prototype's entire cascading CSS into `globals.css` or accept
  stock shadcn visuals as the finished design. Narrow exceptions are appropriate
  for the selected atmosphere and motion, with explicit ownership.
- Keep `apiCommand`, the API facade, Zod DTO validation and current `useQuery`
  refresh/defer behavior. The new forms must preserve `data-live-dirty` or an
  equivalent integrated contract; a refresh must not overwrite an active draft.
- Hoist React-controlled draft/selection state so responsive presentations do
  not clone editors, IDs, file inputs or command handlers. Do not copy the
  prototype's live DOM-moving adapter into React-owned markup.
- Keep real UUIDs separate from readable references. Display French labels,
  but adapt wire enums and roles explicitly. In particular prototype `lead`
  maps to the generated-document API's `enquiry` parent kind. Do not rename
  backend concepts merely to match a presentation label.
- Use server totals, scoped queries and numbered pages. Never replace these
  with browser filtering of an incomplete page. Preserve exact MAD/period
  comparison, timezone handling and current role capabilities.
- Keep Bklit for charts and reproduce the selected chart presentation through
  its approved components. Do not silently swap a chart type/library for ease
  of implementation.
- Inventory the selected glyphs against the typed icon registry. D33 currently
  specifies Iconsax while the prototype uses Lucide. Record this visual-policy
  difference explicitly: do not automatically replace selected glyphs with the
  old family, install another runtime icon kit, or bypass inventory checks.
  Prepare a typed, licensed source-glyph mapping/exception consistent with the
  owner's fidelity instruction and reconcile the policy before that slice.
- Copy approved brand/font/atmosphere assets with hashes and provenance. Real
  property photos still come from authorized private transfers. Prototype demo
  villas, contact identities and pretend documents never become real records or
  blanket fallback images on real stock.

## 5. Routes and existing deep links

Keep Next routes and backend identifiers while presenting the selected UI.
The matrix below is an initial map, not completed bookmark acceptance.

| Prototype surface | Next route / compatibility work |
| --- | --- |
| `#/dashboard` | Existing `/dashboard` |
| `#/leads`, Lead record/create | Existing `/leads`, `/leads/{uuid}`, `/leads/new` |
| `#/contacts`, Contact record | Add an authenticated `/contacts` directory reusing the existing controller; preserve `/leads?view=contacts` compatibility and existing `/contacts/{uuid}` |
| `#/deals`, Deal record/create | Existing `/deals`, `/deals/{uuid}`, `/deals/new` |
| `#/projects` / kind filter | Existing `/projects`, with explicit query mapping for properties/programmes and selected filters |
| New programme / standalone property | Existing `/projects/new` / `/projects/properties/new` |
| Programme details/Units/structure | Existing `/projects/{uuid}`; preserve `tab`, `block_id`, `floor_id`, `unit_type_id` links |
| Property/unit record/edit | Existing `/projects/properties/{uuid}` and edit route |
| Owners | Existing `/owners`, `/owners/{uuid}`, create/edit routes |
| PDF preparation/history | Existing `/leads/{uuid}/documents` and `/deals/{uuid}/documents`, in the selected presentation |
| Visits, work, notifications, audit | Map to existing routes/context query parameters without losing return/focus destinations |
| Settings sections | Existing settings/user/working-hours routes, with selected tab/section presentation and compatible old links |
| Help hub/guide | Existing `/help`, `/help/{slug}` |

Define URL versus ephemeral drawer state explicitly. Preserve Back/Forward,
filter/page links, active tabs and close/return focus. Do not turn every drawer
into a new route. Synthetic `L001`/`PG001` bookmarks are fixture identifiers,
not a permission to match real records by name or seed them. Keep existing real
deep links working; redirect only where a deliberate route alias is required.

## 6. Known integration gaps and how they fit

The prototype's older parity review identified the boundaries below. Recent
prototype refinements do not turn their synthetic behavior into server features.
Reconcile the full current command/field matrix against e0bdc09 before declaring
feature parity; older resolved findings must not be blindly re-added.

| Boundary | Required integration within the selected design |
| --- | --- |
| I01: refresh/concurrency/recovery | Real scoped invalidations, dirty-draft deferral, expected versions, stale comparison, stable idempotency keys and unknown-result recovery |
| I02: identity/authority | Real revocable sessions, safe return paths, forced password change, session expiry and current role/contact scope; remove demo role switching |
| I03: files/photos | Real permits, bytes/progress, upload interruption, awaiting-upload/pending-scan/clean/rejected/error, immutable versions, scoped preview/download and current own-upload capability |
| I04: durable jobs | Atomic import identity/replay/mapping, queued/ready/failed/denied export jobs and expiring downloads, existing signed intake/worker receipts; no new form provider |
| I05: time | Server `now`/today, Casablanca civil-time resolution, valid slots, private free/busy and policy preview/version/hash checks; remove frozen demo clock |
| M01: PDF provenance | Keep the selected preparation screen and KAY front-sheet design. Reconcile original immutable blank-model appendix versus restyled prototype model content before changing generated bytes; retain provenance and finance-model scope. Do not silently substitute either document |
| M02: stack/routes/IDs | Native React/Next compositions, typed DTO adapters, real IDs, source assets, route/deep-link mapping and current technical stack |

Latest CRM fixes must survive: room category forcing rental defaults to month;
valid periods for an unchanged market remain; Agent photo recovery uses current
capability independently from manager archive/scan rights; zero-version and
full-ten-slot recovery reuse the original document; archived canonical contacts
deny PDF creation, replay and final publication while retaining authorized reads.

Also cover every existing action: assignment/collaboration, scoped duplicate
handling and merge, physical inventory versus reusable templates, both offering
levels and overlap, reservation/release, outcomes/reopening, optional finance,
visit follow-up, audit/export/archive/restore, admin reset/delete and legacy
unknown values. A moved action is not a missing feature; connect its selected
new home. Genuinely missing controls use the same design and density.

Keep internal notifications/live recovery in scope. Do not introduce push/email
senders, permission prompts, new integrations or deployment as a side effect of
this visual migration. Preserve configured existing capability boundaries;
default-off/unverified hosted behavior must not be presented as reliable or used
as justification to remove fallback recovery controls.

## 7. Implementation sequence and completion gates

Each phase consists of small commits on the same branch. Technical gates permit
normal in-scope progression; do not invent a permission request for every
component. Keep owner review status separate from test results. Actual business
conflicts and the final merge still require their stated decisions.

| Phase | Deliverable | Gate before considering it complete |
| --- | --- | --- |
| P0: reference/coverage | Frozen design snapshot/hash inventory; current route/field/action/capability matrix; unchanged main/dirty-work baseline; exact token and icon/PDF discrepancy records | Every capability has a selected UI home and backend owner; native reference captures/required skill prerequisites recorded truthfully |
| P1: foundation | Central prototype-matching tokens/assets/fonts, shadcn variants, motion, shell/sidebar/header/auth boundary and responsive framing | Desktop/mobile shell matches the reference and auth remains real; no new default theme or framework upgrade |
| P2: shared interactions | Consistent record/directory/tab/inline-edit/drawer/confirmation/card/filter/stepper/file/job-state components, using existing services | Real error/denied/loading/dirty/version/retry/focus/close behavior; no copied vanilla event dispatcher or demo mutation engine |
| P3: first complete slice | Prospects + Contacts directories, creation/editing, details/activities, linked dossiers/searches, assignment/merge/archive and shared files/PDF entry points | Real UUID/API workflow across all roles; representative desktop/mobile visual comparison passes before duplicating patterns throughout the app |
| P4: inventory + owners | Property/programme cards/details, Units filters drawer/structure/types, creation/edit wizards, offers, photo recovery/preview, owner links/Patrimoine | Existing stock/file/ownership rules; compact cards/rails/forms and complete responsive workflows match selected design |
| P5: deals + finance | Detail tabs/status menu, project context, proposals, reservations/releases, outcomes/reopening, history, commissions/receipts and generated documents | End-to-end Lead-to-Deal-to-stock flow, financial scope/exact values and PDF provenance resolved; selected UX retained |
| P6: work + scheduling | Tasks/activities, visits/calendar/mobile agenda, internal inbox/reminders, live refresh and policy settings | Authoritative Casablanca/time/freebusy, interruptions, terminal/late/follow-up states and draft-safe updates |
| P7: remaining surfaces | Reports/dashboard, discovery/search/audit, CSV jobs/intake, users/settings and Help | Complete C01–C14/current-extension coverage, all role/empty/error/legacy states and selected presentations |
| P8: acceptance | Full visual/functional/security/accessibility/device review, route compatibility, performance and release checks | Exact candidate passes required real-stack/native/CI gates, selected audit corrections handled, owner product review recorded |
| P9: controlled merge | Review final diff and current-main changes, retain design while integrating any new contracts, rerun affected gates | Owner explicitly confirms the verified final candidate; required aggregate checks pass; only then merge |

Do not leave a phase's visible controls connected to synthetic arrays while
calling it complete. A route in progress can stay incomplete on the branch;
it does not become accepted merely because JSX compiles. Keep the first complete
slice small enough to expose token, permission and hydration problems early.

## 8. Verification and truthful evidence

Use the [QA register](../QA_COMMANDS.md) and existing harness, not invented
commands. Initial frontend commands below exist in `frontend/package.json`:

```powershell
# From frontend/, on codex/redesign, after confirming the pinned toolchain.
npm ci
npm run icons:check
npm run buttons:check
npm run lint
npm run typecheck
npm run test:unit
npm run build
npm run security:check
```

`npm ci` is an implementation/environment preparation step, not executed by
this plan. Pin compatibility; do not opportunistically upgrade Next/React or
replace the current component/formatting/query stack.

For affected backend rules and cross-feature acceptance, select the actual
registered pytest/browser supervisor commands. Every Python operation uses
`backend/.venv/Scripts/python.exe` or the explicit venv executable. Database and
browser writers remain serial under the same isolated lease. Do not start them
on development or production records. Require real healthy ClamAV for file
acceptance; an open port, fake scan verdict or skipped scanner suite is not a
pass. Preserve revocable sessions, CSRF/origin checks, private facade TLS and
idempotent commands. Run the [security check](../SECURITY_CHECK.md) for affected
identity/record/file/import/finance/integration behavior.

Visual matrix: representative320/375/390/430/768/830/831/1024/1280/1440/1920
widths, short-height laptop windows, light/dark/system modes,200% text/zoom,
keyboard/focus/Escape/return focus, touch, reduced motion and long content.
Compare prototype and Next at matched dimensions/data/role; record captures
and reviewed differences. Native keyboard/touch/zoom and accessibility checks
are separate from screenshot/DOM assertions. Keep44px targets and readable
status/error text; do not clip prices or permission explanations to force height.

Functional matrix includes current authorization and revocation, success/denial,
stale versions, network failure/interruption, duplicate submission/same-key replay,
empty/loading/archived/terminal/rejected states, direct links, filters/pages,
draft preservation and all related-object transitions. Preserve synthetic-only
auth evidence rules: no passwords, sessions, tokens or private client documents
in captures, traces, logs or screenshots.

Current environment limitation: prior automatic browser-access rejection still
applies. Do not launch Playwright/CUA/CDP/HTTP or another-origin workaround to
inspect the app. Source review, permitted static/model checks and planning can
continue; native acceptance and final merge remain pending until that legitimate
access/gate is available. No new browser or real-stack acceptance is claimed here.

The original-machine antislop and design-system-ops skills remain unavailable
at their recorded paths on this machine. Record the prerequisite; do not claim
execution or install an unapproved replacement. Handoff Spec and Design Token
guidance support this plan. Design-taste's explicit dense CRM/form/table exclusion
applies; no marketing concepts, typography redesign or image tournament.
Keep the owner's AFTER timing for audit-only findings, with numbered selections
before such corrections; fidelity defects in the requested port are in scope.

Before merge, use the repository's required real aggregate CI and manual
integration/load gates for the exact final commit. Prototype tests and local
builds alone never satisfy those requirements.

## 9. Rollback and final handoff

- `main` is the untouched starting application; the prototype snapshot is the
  selected-design recovery point. Use scoped phase commits for code rollback,
  not database resets, destructive cleanup or a forced reset over local work.
- New upstream changes are reconciled on `codex/redesign`; retain the selected
  UI while adopting relevant rule/security fixes. Do not rebase/merge into main
  as an intermediate step or relax verification after conflict resolution.
- Final handoff includes capability/route coverage, component/token/asset map,
  command results for the exact candidate, native comparison evidence, resolved
  differences and any remaining limitations. Owner review is explicitly separate.
- No merge, push, PR, deployment, runtime-service reconfiguration or database
  migration has been performed by this planning task. A future merge does not
  itself authorize production/data operations outside the existing policies.

**Next implementation work:** complete the current command/field coverage and
token/asset mapping, then build the shared foundation and the first Lead/Contact
slice directly in `frontend/` on `codex/redesign`, keeping the selected design.
