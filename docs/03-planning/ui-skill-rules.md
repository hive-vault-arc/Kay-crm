# Mandatory UI skill rules for KAY sprints

Current visual-brand override,2026-10-18: Khalid selected
[Riviera](../../branding/riviera/README.md) for shared colors, typography and
component styling. Existing CRM layouts, Iconsax, shadcn/Tailwind/Bklit and
functional contracts remain. Riviera supersedes older palette, system/Satoshi
font and sidebar-color guidance in historical entries below. It does not select
unrelated AFTER findings or authorize illustrative functionality/data.

## Owner-requested Riviera rebrand: explicit current-task override (2026-10-18)

Under [D36](../../decisions.md), Khalid replaced the app-wide palette and
typography with the supplied [Riviera pack](../../branding/riviera/README.md),
dashboard image and CRM UX guides. Riviera now owns colors, fonts, panel/control
styling and dashboard composition. Existing route layouts and business copy,
Iconsax, shadcn/Tailwind/Bklit, responsive behavior and all API/permission/data
contracts remain binding. Reference sample values are illustrative and never
become live dashboard data. The desktop rail gains an accessible collapse
control and reuses the existing login line art; 72px is a documented geometry
proposal pending visual verification. This branding request supersedes older
visual colors/type and the pure-black-rail choice; the project's AFTER-only
timing for aesthetic audit findings remains.

Final evidence: headed Chrome checks17 routes at1440px/360px and all5 shell
cases, with the 224px/72px collapse keyboard-operable and no measured overflow,
contrast or touch-target failures. The one detector returns `[]`;
[AFTER026](../../anti-slop/audit-026-2026-10-18.md) has0 new numbered findings.
The shared execution ledger records commands, captures and limits. The72px
collapsed width remains a proposal pending Khalid's product/design review.

## Historical UI redesign evidence (2026-10-16)

### Owner-requested compact-space rule (2026-10-16)

Khalid explicitly requested removing the broad unused gutters and top/bottom
space shown on `/login`. Apply the compact-space rule in [DESIGN.md](../../DESIGN.md)
and the [design system](../04-design/design-system.md): full-page frames use the
available width, outer padding stays small, and max-widths remain only when they
protect reading/form usability. Preserve meaningful internal spacing, touch
targets, safe areas and dialog clearance. This does not mean stripping every gap
or rewriting historical Markdown whitespace. The present source change is
limited to login; other routes require their own review. The user's explicit request authorizes this login fix;
no unrelated AFTER-only finding is being applied.

The user's redesign request explicitly requires antislop **during** implementation,
not only afterward. It was applied alongside design-system-ops, responsive,
uncodixfy, relevant React guidance and Impeccable's existing-surface workflow.
The then-approved compositions replaced concept exploration. Dense CRM/admin/
tables/forms remain outside design-taste-frontend's marketing workflow; no
marketing concept tournament or forced motion was introduced. Shared shadcn,
Tailwind, Bklit and Lucide remain mandatory. Decorative city/villa assets are
not inventory evidence; real card previews use existing private authorization.

This task-specific override does not automatically select earlier AFTER-only
findings. One manual detector returned[]; it was not repeatedly rerun after
corrections. A fresh independent review cleared its scored correction batch and
all55 refreshed captures. Its verdict is not human product acceptance. DESIGN.md
merge remains user-gated. Historical AFTER entries below keep their original meaning.

SP-22: [execution](sprints/sp-22-execution.md) and
[AFTER022](../../anti-slop/audit-022-2026-10-16.md). Main read all three mandatory
skills, applicable geometry/accessibility/visual references and all9 Approved V3
originals. Dense CRM/admin/table/form exclusions: no concept/seed/comp/QUALITY BAR/
raster or new visual world. React functional-state/hydration references applied
to the existing guarded intake form. Shared shadcn/Tailwind/Bklit retained.
Narrow focus-visible layering repair and removal of stale preview copy are
functional acceptance fixes, not unselected aesthetic changes. All4 focus
profiles and actual native320–1440/touch/keyboard/200%/reduced-motion/state cases
pass;50 PNGs validate, representative current frames opened. AFTER022 has0 new
HIGH/MEDIUM and1 inherited LOW broader-V3 finding, unselected/unapplied. No
Impeccable/delegated verdict or unavailable detector execution is claimed.
Local technical acceptance does not approve complete visual fidelity or product.

SP-21: [execution](sprints/sp-21-execution.md),
[AFTER021](../../anti-slop/audit-021-2026-10-16.md). Three required skills read;
verification-only restored auth/CRM/admin/table/detail, no shipping UI edit.
Existing system and shadcn/Tailwind/Bklit preserved; marketing concept/seed/comp/
QUALITY BAR/raster excluded. All11 final native frames opened, six widths,
keyboard/touch/populated/empty/denied and old-session login checked. Prior valid
unchanged zoom/motion evidence retained, not newly claimed. AFTER021 has0 new
aesthetic findings; detector N/A with no UI source edit. No Impeccable/delegated
review activated; earlier optional findings and Khalid's product review pending.

SP-19: [execution](sprints/sp-19-execution.md),
[AFTER019](../../anti-slop/audit-019-2026-10-15.md). Three required skills read,
system-first incumbent KAY extension and explicit dense CRM/admin/form exclusions.
Registered direction/confirmed workflow,16 native final captures+2 canonical,
six widths, keyboard/touch/actual200% zoom, no overflow and44px targets.
One detector exit0/[], no new aesthetic findings or aesthetic-only fixes.
Fresh independent finish review ship, inherited PRODUCT/design.json drift
reported without unasked repair; final documenter outcome in execution.
shadcn/Tailwind unchanged, Bklit N/A(no chart), no new raster or visual world.
Khalid's product/design review remains pending.

Status: active UI working rules; SP-01–SP-19 scoped UI evidence and AFTER audits recorded
Date: 2026-10-15  
Confirmed decisions: Khalid requires the three skills below for UI-related sprint work; his earlier antislop timing choice is AFTER.  
Technical proposals: record actual applicability, evidence and any exceptions as each UI slice is implemented.  
References: [agent instructions](../../AGENTS.md), [decisions D30/D31](../../decisions.md), [design direction](../../DESIGN.md), [design system](../04-design/design-system.md), [screen map](../04-design/screen-map.md), [coding standards](../01-working-agreements/coding-standards.md), and [shared sprint gates](local-roadmap.md#required-technical-exit-gate).

## Required skills and applicability

Read each SKILL.md completely before UI work. Load its task-relevant references as instructed; do not infer its rules from the name. All 22 sprints include UI implementation or browser verification, so all link this rule and the three installed skills.

| Skill | Installed instructions | Use in KAY |
|---|---|---|
| antislop | [SKILL.md](<C:/Users/khali/.codex/skills/antislop/SKILL.md>) | Quality filter in the already-selected AFTER mode: audit the completed UI slice, not a new visual direction or an audit of these sprint documents. |
| design-system-ops | [SKILL.md](<C:/Users/khali/.codex/skills/design-system-ops/SKILL.md>) | Required before, during and after layout work: project geometry/tokens, shared component reuse, responsive states and visual evidence. |
| design-taste-frontend | [SKILL.md](<C:/Users/khali/.codex/skills/design-taste-frontend/SKILL.md>) | Read and assess its scope. The installed version explicitly excludes dashboards, dense/admin UI, data tables and multi-step forms. Apply its workflow only on surfaces actually in scope; record other surfaces as not applicable with that reason. |

These paths are installed outside the repository on Khalid's laptop. Do not copy, download or install extra skill bundles for this task. On another machine, locate the same approved skills and record the paths; if unavailable, report the missing prerequisite rather than claiming they were used.

## Authority and project constraints

The user's explicit choices and KAY contracts take precedence over generic skill defaults. Follow [DESIGN.md](../../DESIGN.md), the [design system](../04-design/design-system.md), Riviera branding and later owner-supplied references. The former nine-image reference is retired under D41. Preserve the French interface, semantic status colors and red destructive actions. Reconcile necessary token changes centrally during authorized UI implementation.

Use shadcn/ui for standard components/tables, Tailwind CSS for styling, Bklit for charts and Iconsax through KAY's typed semantic layer under D33. D33 supersedes the historical Lucide baseline recorded above, not prior verification evidence. KAY-specific compositions and narrow custom CSS remain allowed under the existing rules. Do not switch to Fluent, Carbon, another icon family or another chart library because a skill suggests it. Do not invent additional marketing heroes, generated photography, forced animation, a dark-mode toggle or new routes merely to satisfy an out-of-scope marketing-page checklist. Preserve accessibility and backend authorization regardless of aesthetic direction.

## Sprint workflow

1. Before UI changes, read these skills and the linked KAY design sources. Identify the affected screen, user task, primary action, existing reusable controls and relevant states. State a design read when the applicable skill requires it; inspect the running screen and actual supplied images once available.
2. During implementation, use design-system-ops for semantic layout/geometry tokens and parent-controlled layout. Reuse components before adding new patterns, and document any intentional local exception. Apply design-taste-frontend only after its surface-level applicability check.
3. Verify the running UI at relevant desktop/mobile widths, with long French labels, keyboard, touch, zoom and applicable loading/empty/error/denied/conflict/destructive states. Record actual screenshots or reproducible observations, console/network results and contrast checks. A build alone is not visual evidence.
4. After the UI slice is complete, use antislop in AFTER mode. Save a numbered, rule-cited audit under anti-slop/audit-NNN-YYYY-MM-DD.md, with HIGH/MEDIUM/LOW priorities and increasing audit numbers. Findings include the surface, reason and evidence; cite any explicit KAY override instead of flagging it as an unapproved redesign opportunity. SP-22 performs a cumulative completed-UI review.
5. Do not implement fixes solely from an AFTER-mode audit until Khalid selects the numbered findings. Record pending findings and product/design acceptance honestly. Existing sprint permission, functional, accessibility and regression failures still must be fixed and rerun under their own authorized technical gates; an audit does not relax those gates or grant an aesthetic rewrite.

Do not reopen the timing question unless Khalid changes his AFTER choice. Follow this workflow for each implemented UI slice without installing optional skill bundles.

## Required evidence and handoff

Each sprint records the skill files read, applicability per surface, reused tokens/components, desktop/mobile/state review evidence, and the AFTER audit path/result. Record design-taste-frontend exclusions explicitly, not as a false pass. For audit findings, record pending/selected/fixed and the actual approval reference; rerun affected verification after approved changes. Keep technical acceptance separate from Khalid's product/design review and do not claim the UI is design-approved while findings await review.

[SP-01 evidence](sprints/sp-01-evidence.md) records the three skill reads, geometry/reuse, design-taste exclusions, running-browser verification and [first AFTER audit](../../anti-slop/audit-001-2026-10-14.md). That audit has zero numbered findings; product/design review remains pending Khalid.

[SP-02 evidence](sprints/sp-02-evidence.md) records the same required workflow for
real service status and recovery, with [AFTER audit 002](../../anti-slop/audit-002-2026-10-14.md).
It also has zero numbered findings. SP-03's evidence and AFTER audit 003 are linked below; no setup
audit implies Khalid's product approval.

[SP-03 evidence](sprints/sp-03-evidence.md) records the required skills,
auth-form/shell applicability, system reuse, running desktop/mobile/zoom checks
and [AFTER audit 003](../../anti-slop/audit-003-2026-10-14.md), with zero numbered
findings. Product/design approval remains pending Khalid.

[SP-04 evidence](sprints/sp-04-evidence.md) records the required reads,
admin/table/form exclusions, system reuse, desktop/mobile/dialog/touch/keyboard
and actual 200% zoom checks. [AFTER audit 004](../../anti-slop/audit-004-2026-10-14.md)
has 0 HIGH / 0 MEDIUM / 1 LOW. Finding 1 proposes mobile identity-column polish;
it awaits Khalid's selection, with no audit-only fix or product/design approval.
Functional/security/accessibility verification is recorded separately as passed.

[SP-05 evidence](sprints/sp-05-evidence.md) records complete mandatory reads,
system-first contact/Lead layouts, dense product/table/form design-taste exclusions,
130 five-browser and30 headed Chrome checks, touch/keyboard/actual200% zoom,
explicit named horizontal scrolling and long French labels. [AFTER audit005](../../anti-slop/audit-005-2026-10-14.md)
has0 HIGH/0 MEDIUM/1 LOW mobile filter-density suggestion pending Khalid's
selection. No audit-only fix. Functional corrections (label IDs, actual scroller,
error descriptions and long picker wrapping) were rerun independently. Existing
KAY DESIGN and stack remain unchanged; no implied product/design acceptance.

[SP-06 evidence](sprints/sp-06-evidence.md) records ownership/history/merge review
and [AFTER audit006](../../anti-slop/audit-006-2026-10-14.md):0 HIGH/0 MEDIUM/1 LOW,
pending Khalid's selection. Earlier optional findings remain untouched.

[SP-07 evidence](sprints/sp-07-evidence.md) records the required reads, system-first
inventory table/form composition, explicit design-taste exclusions,15 inspected
native captures, live gutter bounds and actual200% Chrome edit.
[AFTER audit007](../../anti-slop/audit-007-2026-10-15.md) has0 HIGH/0 MEDIUM/0 LOW.
No audit-only fix; cumulative technical verification is recorded independently.
Product/design review remains pending Khalid.

[SP-08 evidence](sprints/sp-08-evidence.md) records system-first hierarchy/type/
unit/briefing forms and tables, explicit design-taste exclusions,16 inspected
native captures, touch/keyboard/gutters and actual200% programme editing.
[AFTER audit008](../../anti-slop/audit-008-2026-10-15.md) records0 HIGH/0 MEDIUM/
1 optional LOW mobile-filter-density finding pending Khalid's selection. No
audit-only fix is applied. Wrong-target form lifetime was corrected under the
independent integrity/regression gate. Final browser/privacy gates pass in the
execution record; product/design review is independently pending.

[SP-09 evidence](sprints/sp-09-evidence.md) records the three complete required
reads, system-first shared file controls and CRM/marketing applicability boundary.
[AFTER audit009](../../anti-slop/audit-009-2026-10-15.md) has0 HIGH/0 MEDIUM/0 LOW
for this slice; no aesthetic-only change. Functional native-input overflow,
French picker and focus corrections were independently rerun. The finish review
requires valid full-page context and actual state captures; final verdict and
browser/security acceptance must be read from the execution record. Existing
DESIGN.md, stack and tokens remain authoritative; product review remains pending.

[SP-10 evidence](sprints/sp-10-evidence.md) records complete required reads,
system-first inline requirement/criterion and offering/feedback composition,
explicit CRM/marketing exclusions and actual native desktop/mobile/state review.
[AFTER audit010](../../anti-slop/audit-010-2026-10-15.md) has0 new aesthetic
findings; previous optional findings remain unselected. Focus, French validation,
and numeric input corrections are independent functional work, not audit-only
redesign. The requested settled removal-focus recapture passes. The subsequent
full review found one functional P2: current-search treatment depended on hover.
Existing accent/ring tokens and a non-color check now persist with aria-pressed;
desktop pointer movement and native-touch switching pass. The same reviewer's
scoped verdict is ship/P2 resolved and all16 final captures valid; this is not
Khalid's product/design approval. The documenter records that narrow component
fact. Read the execution record for final built/privacy gates. No new chart,
shipping raster, palette/font/token or component-kit replacement.

## SP-12 existing-detail reservation extension

[SP-12 execution](sprints/sp-12-execution.md) records the complete antislop,
design-system-ops and design-taste-frontend reads and their required references.
Impeccable, responsive/uncodixfy and React guidance were applied within this
existing French KAY operational slice. Khalid confirmed extending the existing
deal detail, not a redesign. Dense CRM detail/table/confirmation surfaces exclude
the marketing/concept-board workflow; comp, concept seed, new visual world and
QUALITY BAR are inapplicable. Pre-existing PRODUCT/design.json absences were not
silently initialized or repaired.

System-first reuse preserves PageHeader/flat record sections, semantic Tailwind
tokens and shadcn AlertDialog/Button/Label/Textarea. No new palette, type role,
font, component kit, chart, dependency, custom CSS or shipping raster. Bklit is
not applicable because no chart is added. Exact physical scope, reviewed versions,
no-expiry truth, safe overlap guidance and reasoned release follow current stock.

All12 final native captures were inspected in the second/final main batched
review after one functional-copy correction. Actual Chrome tests cover touch,
keyboard Enter/Escape/focus return,320/360/390/768/1024/1440 widths and real200%
zoom (DPR2→4,innerWidth1427→713). Desktop/mobile dialog padding24/16px,
44px controls, minimum measured contrast6.484:1,0 horizontal page/dialog overflow
and0 unexpected page/console errors pass. Long synthetic French labels remain
readable; tall confirmations intentionally scroll vertically.

One detector invocation across10 changed UI targets returned[].
[AFTER012](../../anti-slop/audit-012-2026-10-15.md) has0 HIGH/0 MEDIUM/0 LOW new
aesthetic findings; no audit-only fix and earlier optional findings untouched.
The functional reserve/release/current-stock copy corrections received final
compiled15/15 five-target and1/1 headed reruns, not aesthetic approval.
[Fresh finish review](../../.impeccable/sp12-finish-review.md) returns ship,
all12 captures valid and no material fixes in its scoped interface.
[Fresh documenter](../../.impeccable/sp12-documenter.md) returns No changes:
existing component facts already cover the composition and DESIGN/tokens remain
authoritative. Neither result establishes Khalid's product/design acceptance.

## SP-14 existing-world calendar and working-policy extension

[SP-14 execution](sprints/sp-14-execution.md) records the complete required
antislop/design-system-ops/design-taste reads and relevant references. Khalid
confirmed the existing French KAY interface. Dense operational calendar/agenda,
record/form/admin surfaces exclude marketing concepts/assets; Impeccable Operate
needs no comp, seed or QUALITY BAR. Responsive, React, Playwright and uncodixfy
guidance complement the mandatory rules. Missing PRODUCT/design.json remains
inherited drift, not an authorized new-world initialization or generic pass.

System-first work reuses PageHeader, flat record/weekday groups, shadcn form,
native inputs/select, checkbox, buttons and AlertDialog with Tailwind semantic
geometry. Seven wide day columns become a mobile chronological agenda.
Administrator policy changes use reviewed future-visit impact before save.
Server-resolved civil times avoid the inspected client/database tzdata mismatch;
hard scheduling/capacity limits remain distinct from an ordinary overlap reason.
No new palette/font/token/kit/npm dependency/chart/custom CSS/shipping raster;
Bklit is N/A because the calendar is operational composition, not a chart.

Two main batched inspections opened all23 final native captures. Actual Chrome
checks desktop/mobile/settings320/390/768, six booking widths320–1440,
keyboard/trigger and terminal focus, native participant touch, retained outage,
version comparison/retry, busy refresh and actual200% (DPR2→4,width1427→713).
Minimum measured contrast5.814:1, targets≥44px, desktop dialog padding24px,
horizontal page/dialog overflow0 and unexpected console/page errors0.
The real37.63px numbered page target now uses min-w-control; wrong-proxy and
wrong-colleague assertions were harness corrections, not aesthetic findings.

One detector on19 changed source targets returns[].
[AFTER014](../../anti-slop/audit-014-2026-10-15.md) has0 new aesthetic findings;
earlier optional findings remain unselected. [Fresh full UI review](../../.impeccable/sp14-finish-review.md)
returns ship at inspected interface scope, all23 captures valid/canonical hashes
matching, no material fixes. [Fresh documenter](../../.impeccable/sp14-documenter.md)
adds one factual component-guide section and preserves DESIGN/tokens. Neither
role certifies the separate full technical gates or Khalid's product/design
acceptance. Read the execution record for final regression/privacy/isolation.

## SP-13 existing-detail outcomes extension

[SP-13 execution](sprints/sp-13-execution.md) records complete required antislop,
design-system-ops and design-taste-frontend reads/references. Khalid confirmed
the existing French KAY interface, not a redesign. Dense CRM record, history,
form and confirmation surfaces exclude marketing/asset/concept workflows.
Impeccable Operate inherits the established world; comp, seed and QUALITY BAR
are N/A. Responsive, React, Playwright and uncodixfy guidance complement those
mandatory rules. No new theme/token/font/kit/chart/dependency/custom CSS/raster;
Bklit is N/A because no chart is added.

System-first composition reuses shadcn AlertDialog/Button/Input/Label/Textarea,
NativeSelect and existing semantic Tailwind record/status geometry. Exact
stock target/effects precede outcome or reopen confirmation. Original actor,
responsibility and outcome history persist; failures retain input/retry identity.
Manager external results do not create a KAY win/income, and partially committed
programmes remain blocked with no remaining-unit override.

Two main batched inspections cover16 native captures. One functional inherited
closed-attachment message was corrected, rebuilt and regression-tested. One
desktop full-context capture caught a still-loading incumbent child; a separate
same-build settled case replaces only that image, which was opened and validated.
This was evidence repair, not another UI-polish round. Actual Chrome covers
keyboard Enter/Tab/Escape/focus return, touch,320/360/390/768/1024/1440 widths,
both refresh controls, retained failure drafts, roles and actual200% (DPR2→4,
innerWidth1427→713). Minimum measured contrast6.484:1, controls≥44px, dialog
padding24/16px, horizontal page/dialog overflow0 and unexpected console/page errors0.

One detector on14 changed UI files returns[].
[AFTER013](../../anti-slop/audit-013-2026-10-15.md) records0 new aesthetic findings
and the per-item delivery gate; no audit-only change, earlier optional findings
unselected. [Fresh full UI review](../../.impeccable/sp13-finish-review.md) returns
ship, all16 captures valid/canonical hashes matching and no material fixes in its
inspected scope. [Fresh documenter](../../.impeccable/sp13-documenter.md) returns
No system-document changes needed. Generic persistence still fails on missing
PRODUCT/design.json; this is pre-existing out-of-scope drift, not silently repaired
or passed. Incumbent scoped extension persistence passes. Backend/security/full
technical acceptance remain separately evidenced; product review remains Khalid's.

## SP-15 incumbent work surfaces (2026-10-15)

[SP-15 execution](sprints/sp-15-execution.md) records complete antislop,
design-system-ops and design-taste-frontend reads and required references.
Khalid confirmed today's/overdue work, contextual task controls, personal inbox
and visit follow-up within the existing French KAY interface. Dense dashboard,
record, list and form surfaces exclude the marketing/concept/asset workflow.
Impeccable Operate preserves the incumbent world; comp, seed and QUALITY BAR
are N/A. Responsive, React, Playwright and uncodixfy guidance supplement the
required rules. No new palette/font/token/kit/chart/dependency/CSS/raster;
Bklit is N/A because no chart is added.

Existing shadcn controls, semantic Tailwind, NumberedPages and the Casablanca
LocalTimeField compose the work sections. Two main batched inspections open
all23 native captures. The final headed command passes2/2 in1.2m after one
material French-copy correction; all23 captures are refreshed. Recorded checks
include320–1440 widths, native touch, keyboard/focus, actual200% zoom, retained
outage/version-conflict input and loading/empty/denied/terminal states.
Minimum measured contrast5.814:1, controls≥44px, desktop dialog padding24px,
page/dialog horizontal overflow0 and unexpected page/console errors0.

One detector across19 targets returns[]. [AFTER015](../../anti-slop/audit-015-2026-10-15.md)
records0 new aesthetic findings; no audit-only changes or earlier optional
findings selected. The [fresh finish review](../../.impeccable/sp15-finish-review.md)
preserves its original full review and resolves its single scored French-copy
fix at final build S5SnyXhT5J3phRg8k_fNM. All25 refreshed originals/canonical
files are independently valid. This verdict is not full technical acceptance.
The [documenter](../../.impeccable/sp15-documenter.md) adds factual composition
documentation only; DESIGN/tokens remain unchanged. Inherited missing
PRODUCT/design.json metadata is reported, not repaired or passed. Technical
verification is separately recorded; Khalid's product/design review stays pending.

## SP-16 incumbent finance surfaces (2026-10-15)

[SP-16 execution](sprints/sp-16-execution.md) records complete required antislop,
design-system-ops and design-taste reads/references. Dense CRM record/form/history
surfaces exclude marketing/concept/assets; Impeccable Operate inherits the
confirmed French KAY world, with comp/seed/QUALITY BAR N/A. Existing shadcn,
semantic Tailwind, responsive/touch geometry, NumberedPages and protected
confirmation focus compose the M/A-only Finance tab. No theme/token/font/chart/
kit/CSS/dependency/raster change; Bklit N/A without charts.

Two bounded builder visual batches open14 native captures, with one functional
amount-label/invalid-focus correction. After the independent review, one stale
pipeline sentence is corrected and the same evidence recaptured/validated only,
without another builder polish hunt. Final headed1/1 passes39.0s; all16 originals/
canonical files independently valid. Real keyboard/touch,320–1440 widths,
actual200% (DPR2→4,width1427→713), contrast minimum5.814:1, actual controls≥44px,
dialog24px, page/dialog horizontal overflow0 and unexpected errors0 are recorded.
The hidden nonfocusable native file input uses its actual visible chooser hit
target in the measurement; no application file-style change or smaller threshold.

One detector12 changed targets returns[]. [AFTER016](../../anti-slop/audit-016-2026-10-15.md)
records0 new aesthetic findings and per-item UI/control evidence. The
[fresh review/verdict](../../.impeccable/sp16-finish-review.md) preserves its full
review and scores only its final copy fix resolved/ship. No second detector or
aesthetic-only selected fix. Incumbent DESIGN/tokens remain unchanged; inherited
missing PRODUCT/design.json is reported, not repaired or passed. Backend/full
technical acceptance and Khalid's product/design approval remain separate.

## SP-17 incumbent reporting surfaces (2026-10-15)

[Execution](sprints/sp-17-execution.md) records complete required skill reads and
references. Design-taste excludes this dense dashboard/table/admin surface;
Impeccable Operate preserves French KAY, ENERGY1/RHYTHM1/MOTION1 and the existing
system. No new comp, seed, marketing assets or visual world. Shared shadcn controls,
Tailwind roles and exact Bklit registry bar/table wrappers compose flat sections.
Existing palette/type remains; a shared16rem chart canvas is documented.

Two bounded builder inspection batches, one detector[] and native11+2 captures
support six widths320–1440, actual200% zoom, touch/keyboard/focus, minimum contrast
6.113:1 and44px controls. Required target/Escape/default-date defects were fixed;
the final F1 captures validate retained server dates, not another polish hunt.
[AFTER017](../../anti-slop/audit-017-2026-10-15.md) has0 HIGH/0 MEDIUM/1 optional
LOW mobile density choice, unselected/unapplied. The fresh finish review preserves
its original full review and scores F1 resolved/ship only at that fix scope.
The fresh documenter adds factual component composition; incumbent DESIGN stays.
Inherited missing PRODUCT/design.json remains uncorrected, not called passed.
Human product/design review and full-product acceptance remain separate.

## SP-18 incumbent Leads import (2026-10-15)

[Execution](sprints/sp-18-execution.md) records all three required skill reads,
system-first shadcn/Tailwind geometry and explicit design-taste exclusions for
this dense administrative multistep form/row surface. Bklit N/A: no chart.
Impeccable Operate retains KAY and1/1/1 dials; no new world/seed/comp/raster,
font, palette or styling dependency. Missing PRODUCT/design.json is inherited
drift, reported but not repaired. Confirmed existing-interface answer recorded.

Two builder visual batches inspect first6 and final12 original+2 canonical
captures. Executable cancellation/retry detected a real stale-preview state,
fixed and rerun without an extra aesthetic hunt. Six widths320–1440, keyboard/
touch/return focus, controls≥44px, contrast≥5.814:1 and actual200% pass.
One detector returns[]; [AFTER018](../../anti-slop/audit-018-2026-10-15.md)
has0 new aesthetic findings. Fresh [finish review](../../.impeccable/sp18-finish-review.md)
returns full-scope ship for this slice, no material fixes. Fresh documentation
handoff records the inherited composition without changing visual authority.
This does not certify broader V3 implementation or Khalid's product/design review.
