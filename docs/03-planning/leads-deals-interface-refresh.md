# Lead/Deal interface refinement

2026-10-18 correction: the owner rejected the screenshot refinement below as
visually insufficient. Its functional checks remain historical evidence, not
visual acceptance. The newer [reference-fidelity ledger](crm-reference-fidelity.md)
records replacement components, exact geometry and final scoped verification.

## Owner screenshot refinement (2026-10-18)

The owner-provided Leads, Deals and record screenshots refine the prior local
composition without changing product contracts. Full directories retain their
left desktop filter rail at the existing256px token width; only Leads and Deals
expand that rail to314px at1536px and above. Embedded contact lists remain
inline and the mobile Sheet remains the only narrow-screen filter surface.
Lead/Deal details now pair the existing authorized contact summary in a narrow
left rail with the wider workflow content from1280px, stacking below. Existing
statuses, facts, role-scoped projections, actions, history and records are
retained. The only new presentation component reuses `ContactSummary`; no API,
database, permission, filter, sample-data or dependency change is introduced.

`frontend/src/features/contacts/contact-profile-panel.tsx` supplies the shared
contact rail. `crm-record-layout` keeps the primary workflow column materially
wider; only the two full CRM directories opt into the wide-screen filter-panel
override. Tests assert the314px rail at1600px, contact/workflow proportions,
mobile stacking and no horizontal overflow. All screenshots are synthetic
isolated-test output; visual references are not converted into seed data.

Verification: `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run build`
and `npm.cmd run test:unit` pass (49/49). Headed installed Chrome `record-facts`
passes2/2, including320–1600px and actual200% zoom. `filter-rail` passes2/2 on
the final serial rerun, including mobile/touch/keyboard, real scoped requests,
permission views and1600px captures. One earlier full filter run had a single
breakpoint focus assertion fail; its isolated rerun passed1/1 and the subsequent
full rerun passed2/2. One bounded Impeccable detector run on seven changed UI
targets exits0 with `[]`; [AFTER027](../../anti-slop/audit-027-2026-10-18.md)
records no new numbered aesthetic-only finding. 1600px Leads/Deals directory
and detail screenshots were opened for visual review. This does not claim the
complete CRM suite, cross-browser coverage, physical-device validation or human
product acceptance. No audit-only finding was applied, no database/real-data
operation was performed and no commit, publication or deployment was made.
The documentation validator passes (22 sprints,1280 local links/anchors,41
acceptance mappings,13 synchronized diagrams and12 valid API examples). A
task-scoped `git diff --check` is clean. The whole-tree check reports two
trailing-space lines in the already-modified `decisions.md`, outside this
refinement; they are retained untouched.

Khalid's product review remains pending.

2026-10-17. Status: local implementation, scoped verification, independent finish
review and documentation handoff complete. Human product review and deployment
remain unclaimed. This is a new interface request after the completed
qualification/backend alignment, not a claim that its previous UI was accepted.

## Confirmed scope

The owner requests the IMMO World front-end's compact composition: left-hand
filters, clear borders and icons, rich directories, improved record details and
no broad unused viewport bands. The owner answered the scope confirmation with
"Include create/edit forms too". Therefore all eight Lead/Deal list/detail/
create/edit surfaces are in scope. Backend contracts, permissions, data,
conversion/stock/finance rules, KAY colours and the shared component stack stay.
No commit, publication, deployment or database operation is authorized here.

## Reference and system mapping

Read-only IMMO World sources inspected: `LeadsPage`, `LeadsFilterPanel`,
`LeadsPageTableSection`, `DealDetailsPage` and their shared filter/detail pattern.
They provide structure, not new statuses, integrations, fields or dependencies.

| Reference/request | KAY system role | Action |
|---|---|---|
| Left search/filter panel beside results | Existing256px `FilterResultsLayout`,24px gap,1280px breakpoint | Reuse on full Lead/Deal directories; retain inline embedded contact lists |
| No broad outer empty space | Existing16px spacing plus shell-owned safe-area insets | Opt-in full-width Lead/Deal shell and matching global-header inset; unrelated routes unchanged |
| Recognizable bordered table columns | Existing shadcn/TanStack table and typed Iconsax | Icon-labelled headers, compact12px cell insets and subtle existing-border separators |
| Grouped record details | Existing `RecordFacts`, `SectionHeading`, status strip | Two peer desktop panels with single-column factual rows; mobile stacking |
| Clear create/edit sections | Existing shadcn fields, sections and semantic buttons | Compact headers/actions; paired sections only at wide1536px views; no field/validation change |

Design-system-ops governs geometry, responsive guidance governs reflow and touch,
React guidance governs stable component boundaries, and Impeccable uses Operate
inside the established KAY world. Marketing/concept/imagery workflows are out of
scope. Antislop retains the owner's AFTER timing for audit-only aesthetic fixes.
The requested changes themselves are explicitly authorized, not selected prior
audit findings. No new font, palette, icon family, raster, chart or dependency.
Pre-existing DESIGN format/sidecar drift is not silently repaired.

## Acceptance and planned evidence

- [x] Both full directories use left rails on desktop and one functional mobile
  filter Sheet, retaining search, advanced filters, scope, pagination and columns.
- [x] All eight routes fill the available shell width with safe16px insets.
- [x] Table and detail icons are semantic Iconsax, with readable borders/labels.
- [x] Record details retain every authorized fact, link, action and history.
- [x] Create/edit forms retain inputs, errors, conflict/retry identity and drafts.
- [x] Actual desktop/mobile/wide captures,320–1920 responsiveness, keyboard,
  touch, actual zoom and loading/empty/error/denied cases are verified.
- [x] Lint, direct TypeScript, production build, unit tests and affected real
  browser workflows pass; reports/client outputs retain existing privacy guards.
- [x] One bounded detector/AFTER review plus fresh finish/documentation handoffs
  are recorded at their real scope.

## Initial evidence

The unchanged compiled baseline passes both actual qualification journeys:
2/2 installed Chrome,49.8s. The isolated fixture guard remains authoritative;
the populated local development database is not reset or used as a UI fixture.
Current source plus the previous synthetic desktop captures demonstrate the
inline filters and long stacked record layout being replaced. Source reads,
not old screenshot claims, establish current fields and authority.

The first static pass caught TanStack's requirement for an explicit column ID
when a string heading becomes a render function. Both mapped header definitions
now retain that explicit ID; final checks must rerun. The initial lint pass
reports0 icon/button violations.

## Verification checkpoints

The first updated compiled application passes all six selected installed,
headed Chrome cases in2.7m: both qualification journeys, two filter-rail cases
and two record-fact cases. They cover actual create/edit/conversion, native
200% zoom, keyboard/touch, responsive geometry and scoped loading/error/denied
states. The builder inspected a batched eight-surface desktop/mobile sample.
The two-column wide forms exposed inner fields being split again by viewport
breakpoints. Compact contact sections and the Deal qualification section now
split only when their own panel reaches the existing Tailwind64rem container
breakpoint. Noncompact ContactFields consumers keep their original geometry.
Opt-in capture checks require name and budget controls to remain at least240px
wide on the captured desktop forms. This is a regression assertion, not a new
global field-width token or fixed mobile width.

After that single correction batch, lint, direct TypeScript, production build
and45/45 unit checks pass. Icon inventory:43 semantic exports/37 consumers/
151 sites/0 violations. Button inventory:296 controls/96 files/0 violations.
Client-output privacy scan:4 roots/416 JS files/0 configured facade or signing
secret matches. The final20-case headed regression/capture run exits0:20/20
pass in6.6m. It includes both qualification journeys, all existing Lead/Deal
workflow cases, filter rails, header actions, catalogue interest and both fact/
native200% cases. The two builder rounds are complete. All36 named final
first-view/full-page files were opened and copied into the ignored
`.impeccable/review/interface/` for the fresh reviewer. Desktop/mobile/wide
captures are1440/390/1920 CSS pixels; behavior geometry additionally checks
320,360,768,1024 and1280. One final detector run on15 changed frontend targets
exits0 with `[]`; it is not rerun. The fresh review, cross-browser spot checks
and documentation comparison remain pending.

## Final regression and review

The current production-style two qualification specs pass on all three additional
profiles:6/6 Edge/Firefox/WebKit in1.9m, exit0, serial with capture disabled.
This is additional spot coverage of create/edit and conversion, not the full
20-case selection across every engine. Final report privacy:3 JSON/6 empty
step arrays/0 detailed arrays. Only `.last-run.json` remains in test-results;
no retained zoom/profile directories or isolated-test listeners on3100/8100/
8101/8001. Runtime/capture/report paths are ignored and none of the checked
generated/private paths is tracked. No populated-development or production
data was used as a browser fixture.

The independent fresh reviewer opens all36 named exact files and returns
`disposition: ship`, full scope, with no material fixes. Its five-section result
is preserved in `.impeccable/leads-deals-interface-finish-review.md`. The harness
exposes a general agent rather than the named shipped role, so the review uses
the role-equivalent fallback without inherited history; this substitution is
explicit, not called a shipped-agent invocation. The reviewer independently
inspects source and images, not browser behavior. Behavior results are supplied
test evidence. The completed AFTER025 audit has no new numbered aesthetic-only
finding; no unselected audit finding is modified.

The fresh role-equivalent documenter compares all scoped source, central tokens,
theme mapping and shared primitives, opens12 final captures across all eight
surfaces plus the relevant3 V3 originals, and completes the ordinary-extension
handoff. No new global token is required; the recipes reuse existing geometry
and palette. Its only write is the
[system comparison](../../.impeccable/leads-deals-interface-system-check.md).
Historical DESIGN format/missing-sidecar drift is reported without repair.
The full [finish review](../../.impeccable/leads-deals-interface-finish-review.md)
and [AFTER025](../../anti-slop/audit-025-2026-10-17.md) preserve scope and limits.

All planned task gates are complete. Human product acceptance, physical-device
validation, publication and deployment remain separate and unclaimed. No commit,
push, dependency installation or real-data operation is performed in this task.
