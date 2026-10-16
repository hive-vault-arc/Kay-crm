# Leads and Deals header action hierarchy

2026-10-16. Explicit owner request: gold creation action, smaller and less
important surrounding header utilities. This refines the current V3 interface
and retains the preceding black sidebar/account-footer changes.

## Coverage and implementation

| Surface | Applied pattern |
|---|---|
| `/leads` | Gold `Créer un Lead`; quiet Contacts, Importer des contacts, Colonnes, Exporter les résultats filtrés and Mes exports. |
| `/deals` | Gold `Créer une affaire`; quiet Colonnes. No export/import capability invented. |
| `/leads?view=contacts` | Same pattern for existing Lead/contact creation, Demandes and the existing authorized export controls. |
| Column drawers | Only header triggers opt into compact presentation; contents, saved column IDs/order and defaults unchanged. |
| Export disclosure | Compact header triggers restyled; explicit confirmation, cancellation, pending, success/error/retry and idempotent command unchanged. |
| Contact-linked embedded lists | Existing default column/action styles retained. |
| Forms and other pages | Default shadcn buttons, fields, confirmations, permissions and behavior retained. |

Shared shadcn Button variants are opt-in: `creation` and `quiet`. The new
`ListHeaderActions` composes the primary link and a labelled secondary group,
using existing flex wrapping,16px between groups and8px inside the utility group.
Compact controls reduce horizontal padding from16px to8px, remove the
boxed rest surface and reduce label weight from500 to400. Readable14px labels
and44px hit targets remain; small appearance does not mean tiny touch areas.
Creation uses600 weight and the existing KAY gold, not a new sampled claim about
the raster logo. Normalized semantic `action.creation*` colors map through the
existing JSON -> theme variables -> Tailwind system, with no component hex values.

Contrast helper results for charcoal labels: gold rest6.52:1, hover5.56:1,
pressed4.69:1. All pass ordinary-text AA. Existing focus styling/offsets are
retained; quiet labels use the existing secondary-text role, measured6.05:1 on
the real canvas.

No backend, migration, API contract, record field, permission, authentication,
currency/date behavior, dependency, icon, photograph or chart change. No button
is removed, relabelled or replaced by a dead mockup control.

## Design workflow and scope

Reading this as the existing French KAY staff CRM, preserving V3 with a stronger
creation hierarchy: ENERGY2 / RHYTHM2 / MOTION1. The user's requested gold
creation emphasis is deliberately local to these list headers, not a global CTA
or dark-theme redesign. Existing city/villa/record patterns are not touched.

Design-system-ops component anatomy, spacing, responsive/accessibility and visual
quality references govern geometry. Responsive standards and antislop core/UI/
human are applied during implementation; no earlier unselected AFTER finding is
applied. Uncodixfy supports restrained real controls; React guidance preserves
static module-level composition and existing state/data hooks. The mandatory
design-taste-frontend scope check excludes dense CRM/admin/table/form surfaces,
so no marketing concepts, generated assets or added motion are used. Impeccable
context from the current session is not rerun; colorize/craft-floor/polish guide
the narrow refinement. One scoped detector invocation returns `[]`, exit0;
that is not treated as visual or functional proof.

## Evidence

Static and running verification results are recorded here after completion;
no prior screenshot or historical sprint count implies the new hierarchy passed.

First compiled headed Chrome selection:6/6 pass2.2m (two new hierarchy cases,
existing Lead identity/create/edit, Deal list/create/filter/columns, actual CSV
export/download/permissions and native zoom review). All eight initial synthetic
captures were opened together. One bounded layout refinement reduces utility
padding to the existing8px spacing value, keeping14px text/44px targets, to avoid
a needlessly sparse utility row on narrow Leads screens. The native review is
extended to capture and activate both actual list creation links at200% zoom.
Final confirmation is limited to the two affected hierarchy cases and that
native review, not another full product run.

Final results: lint/typecheck/build all exit0 without warnings on the final
application source. Icon guard27 semantic icons/21 consumers/40 sites/0 violations.
Fresh confirmation passes **3/3 in1.4m**: the two hierarchy cases plus the
extended native Chrome review. These are repeated/extended cases, not three
additional independent business scenarios. No test failure was hidden or skipped.
Only compact padding changed after the successful creation/export regressions;
their business handlers remain byte-for-byte untouched.

Final synthetic desktop/mobile Leads, desktop/mobile Deals, contact directory
and mobile export-confirmation frames were inspected together. The360px Leads
utility group now occupies two rows, with all controls retained and no overflow.
Actual Chrome200% measurement:713px CSS width versus1427px baseline; ratio4
versus2; no horizontal overflow. Both gold list links are checked by computed
style and activated with Enter at that real zoom, reaching their creation pages.
The native review's collected console/page error list is empty. The two new
device-scale zoom PNGs have a capture-extent limitation (they crop before the
utility row); they are not presented as complete visual proof of those rows.
Functional zoom evidence is the real interaction and geometry assertions, not
an assertion that these cropped PNGs show the entire header.

Current normal captures: `frontend/output/playwright/list-header-actions/`,
including `leads-1440.png`, `leads-360.png`, `deals-1440.png`, `deals-360.png`,
`contacts-1440.png`, `export-confirmation-360.png`, `leads-loading.png` and
`leads-error.png`. All are synthetic and explicitly credential-free; loading
and error captures show the intentional test transport fault, not an outstanding
runtime outage. No trace, password-bearing screenshot or real client record.

Repeatable commands from `frontend/`:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
$env:KAY_E2E_PRODUCTION='1'
Remove-Item Env:NO_COLOR -ErrorAction SilentlyContinue
npm.cmd run test:chrome -- tests/e2e/list-header-actions.spec.ts tests/e2e/deals.spec.ts tests/e2e/discovery.spec.ts tests/e2e/leads.spec.ts tests/review/chrome.spec.ts --grep 'list header actions|SP11: list creation|scoped cross-domain search|international identities|visible Chrome, touch' --max-failures=1
# Focused confirmation after the compact-padding adjustment:
npm.cmd run test:chrome -- tests/e2e/list-header-actions.spec.ts tests/review/chrome.spec.ts --grep 'list header actions|visible Chrome, touch' --max-failures=1
```

## During-work antislop delivery gate

Scope: changed list-header actions and their reachable existing controls, not
a new entire-CRM audit. Existing assets, fields, data, labels, hierarchy elsewhere
and supported light/black-sidebar direction remain authoritative.

| Item | Status and evidence |
|---|---|
| R-02 | PASS: no em-dash or new display copy introduced. |
| R-03 | PASS: new geometry cases exercise320/360/768/1024/1440px and check page/control overflow. |
| R-17 | PASS: no metric or fabricated count; live scoped API totals retained. |
| R-18 | PASS: no testimonial or team content introduced. |
| R-23 | PASS: existing KAY gold and actual creation links used at the owner's explicit request; no new asset or navigation structure. |
| R-24 | PASS: all five Lead utility destinations/panels are activated in the focused case. |
| R-25 | PASS: gold rest/hover/pressed label ratios6.52/5.56/4.69; readable14px secondary labels and inherited focus indicators. |
| R-26 | PASS: creation links, Contacts, import, columns, export confirmation/cancel and Mes exports retain real handlers; actual create/export regressions pass. |
| R-27 | PASS: intentionally held/failed list request, visible loading/error, real retry and empty result exercised. |
| R-28 | PASS: no FAQ added. |
| R-32 | PASS: keyboard Enter creation, drawer Escape/focus return and real touch taps exercised. |
| R-33 | PASS: edits use apply_patch on owned source, no runtime source/CSS patcher. |
| R-34 | PASS: no theme toggle or unsupported second theme introduced. |
| R-35 | PASS: successful build, isolated headed Chrome action tests and inspected real screenshots, not static mockups. |
| R-36 | PASS: no fabricated performance/security/deployment claim. |
| R-37 | PASS: explicit Approved V3 refinement and descriptive2/2/1 dials retained. |
| R-38 | PASS: actual API data; only guarded synthetic fixtures used for tests. |
| R-01 | PASS: solid requested gold, no gradient/glow. |
| R-04 | PASS: existing Iconsax remains; no icon added. |
| R-06 | PASS: existing system typography, readable14px labels, no display face added. |
| R-07 | PASS: no background pattern added. |
| R-08 | PASS: no decorative arrows added. |
| R-09 | PASS: no badge added. |
| R-10 | PASS: no glass/blur added. |
| R-12 | PASS: no shadow added. |
| R-13 | PASS: no glow added. |
| R-14 | PASS: no feature cards added. |
| R-19 | PASS: no motion added; existing simple state transitions retained. |
| R-22 | PASS: no illustration added. |
| R-05 | PASS: functional action grouping, not a new page template. |
| R-11 | PASS: existing shadcn/V3 control radius retained. |
| R-15 | PASS: exact existing French action labels retained. |
| R-16 | PASS: no marketing copy added. |
| R-20 | PASS: KAY gold, black rail and actual CRM destinations retained. |
| R-21 | PASS: no unsolicited dark-mode scope. |
| R-29 | PASS: existing gold/charcoal plus hover/pressed shades, not a new multi-color palette. |
| R-30 | PASS: no third-party product identity copied. |
| R-31 | PASS: gold establishes creation priority; quiet compact actions reduce utility weight while preserving touch targets. |
| C-1 | PASS: each new style answers the explicit request and uses shared tokens. |
| C-2 | PASS: real action paths, with unchanged API contracts and permissions. |
| C-3 | PASS: no decorative region, duplicated CTA or new feature. |
| C-4 | PASS: responsive, loading/error/retry, keyboard and touch states covered. |
| C-5 | PASS: historical runs and scoped final confirmation are distinguished. |
| Liveliness | PASS: explicit2/2/1 dials; gold creation focal point, existing KAY identity, structural16px group separation and8px utility gaps. |

No full backend suite, five-browser matrix, deployment or assistive-technology
user study is claimed. Existing AFTER-only findings and wider DESIGN.md approval
remain separate. Changes are local/uncommitted; no push is authorized by this
UI request. Shared Button defaults and all backend paths are source-preserved.
Final read-only cleanup check:0 project service listeners and0 KAY service
processes; shared PostgreSQL and unrelated resources are preserved.
