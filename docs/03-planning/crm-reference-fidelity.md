# CRM screenshot fidelity correction

2026-10-18. Status: local reference implementation and scoped verification
complete; Khalid's product review remains pending.
The owner rejected the previous directory/detail refinement as insufficiently
close to the supplied images. Earlier technical passes and AFTER027 do not
establish visual acceptance. This record supersedes their composition claims
for the two full directories and Lead/Deal detail pages only.

## Reference-to-implementation ledger

| Owner reference | Current implementation | Final evidence |
|---|---|---|
| Shallow coastal panorama and title/count at left | Shared `CrmDirectoryHeader`,140px banner, actual scoped total, existing notification/account actions at right | Latest1600px Lead/Deal captures opened against both original images |
| Filter rail beside a separate results toolbar |314px rail from1280px,12px gap; real status counts, source/qualification selects and advanced filters; creation action last | Final filter suite2/2 passes, including all five directory families |
| Compact populated rows with contact/agent initials and coloured pills | Shared contact/agent cells, status badges, seven default columns, horizontal separators, current-page checkboxes and compact numbered pagination | All12 rows visible at1600×1000; selection and filtering pass |
| Large record identity, cream contact rail, coloured status board | Shared record heading,346px contact rail, real contact methods/agent, read-only status tiles | Latest desktop/mobile captures opened; reference composition confirmed |
| Request/message at left, follow-up/assignment at right | Lead work grid with actual saved qualification/message, existing task API composer and authorized assignment command | Real task creation and latest compact layout pass |
| Responsive and accessible controls | Existing single mobile filter Sheet, named table scroll region,44px targets, reflow and preserved keyboard semantics |320–1600px geometry/contrast, keyboard/touch and native200% zoom pass |

The two actual reference images were opened, not inferred from descriptions.
The previous interface-only pass changed proportions but retained the old
components; this correction replaces those specific compositions with shared
reference-shaped components. KAY Riviera typography, palette,224px navigation,
French labels, Iconsax, shadcn and Tailwind remain. No backend or schema change
belongs to this correction.

## Truth and interaction boundaries

- Filter choices map only to existing endpoint contracts. Leads do not acquire
  unsupported Project/Budget query filters merely because the picture has them.
  Source and Qualification use actual saved fields; country choices use existing
  metadata. Existing advanced filters remain available in disclosures.
- Filter drafts apply after350ms, with explicit Apply retained in the mobile
  Sheet and on form submission. Invalid date ranges are not issued upstream.
  Status checkboxes express the endpoint's single active status, not an invented
  multi-status query. Existing scoped counts are authoritative.
- Selection is limited to rows on the current page and filters the displayed
  selection only; it is not bulk export, reassignment or cross-page selection.
- Seven default columns improve reference density. All optional columns and
  ID-only local preferences remain; no client record is stored in preferences.
- The follow-up composer creates an ordinary internal contact task using the
  existing eligible-colleague list, command identity and Casablanca time resolver.
  Call/e-mail actions are true `tel:`/`mailto:` links, not automatic messaging.
  The board is a labelled read-only status summary; existing authorized edit and
  workflow actions remain the means to change business state.
- Embedded contact directories retain their inline layout. Create/edit forms,
  unrelated directories and lower record workflow/history modules are not
  redesigned by this correction.

## System and assets

Central layout tokens added in `branding/kay-ui-tokens.json`:
`crmFilterPanel=314`, `crmRecordContact=346`, `crmDirectoryHero=140`,
`crmRecordAvatar=84`, `crmTableAvatar=32` (CSS pixels). Shared recipes consume
them. Existing Riviera category tokens supply state colours with readable dark
text and soft surfaces; no new palette or chart dependency is introduced.

`frontend/public/images/crm-coast.png` is a decorative built-in image-generation
output, created from the owner's coastal-header reference, not stock evidence or
an actual project photograph. It is rendered by Next Image with empty alt text.
Full generation prompt: “Use case: photorealistic-natural. Asset type: decorative
panoramic CRM header image. Generate a very wide coastal Moroccan Riviera panorama
closely matching the photographic HEADER ONLY in the supplied UI reference image.
The reference image is visual composition guidance, not an edit target: reproduce
the blue Mediterranean coastline and gently curving bay, low warm-white hillside
buildings to the right, palm trees in the near foreground, distant rugged
beige-blue mountain range, pale blue sky and bright warm daylight. Keep sea visible
toward the left/center and white architecture and palms concentrated toward the
right. Clean, realistic architectural travel photography, refined natural color,
similar camera elevation and horizon. Full-bleed scene with no UI, no panels, no
sidebar, no typography, no letters, no logos, no watermark, no gradient fade baked
in. Compose for an extremely wide shallow140px-high website banner, with the
coastline, mountains, buildings and palms all visible in the central horizontal
band. Preferred output2304x768 landscape or similarly very wide panorama.” The
original generated output is retained outside the repository; the local public
asset is the application copy.

## Skills and verification so far

Design-system-ops governs the central dimensions and opt-in shared recipes;
responsive standards govern reflow and touch targets. Impeccable Operate preserves
KAY's established world and uses one batched inspection/correction followed by
one confirmation round. Design-taste-frontend's marketing/concept workflow does
not apply to these dense operational CRM surfaces. Antislop remains AFTER; no
unselected audit-only aesthetic fix is applied. One bounded detector invocation
over14 changed UI targets exits0 with `[]`; it is not repeatedly rerun.

Latest `npm.cmd run build` exits0. `npm.cmd run test:unit` passes49/49 after
the final country selector. `npm.cmd run lint` passes with43 semantic icons /
42 consumers /153 sites and309 buttons /99 files,0 inventory violations.

The initial headed Chrome `crm-reference.spec.ts` passes1/1 in42.8s on the
guarded isolated stack. It creates12 synthetic leads and12 deals, exercises real
status/source filtering, row selection, mobile Sheet/focus and a real follow-up
task; it checks geometry/contrast at320/390/768/1024/1440/1600px. Its four desktop
and four mobile surfaces plus two mobile filter captures were saved and opened.
That first inspection prompted one batch: actual coastal asset, tighter rows,
earlier record content, compact follow-up/assignment and country metadata.
The latest compiled confirmation passes1/1 (33.0s), including the actual task
POST. All four1600px and six390px surface/filter captures were opened alongside
the two original references. Both directories show all12 rows in the first
1000px-high view. The composition now follows the reference; differences remain
intentional for existing KAY typography/navigation and truthful backend fields,
not invented reference-only controls. This is not a claim of pixel identity.

Automatic execution review rejected the standalone frontend launch; the owner
started the latest compiled frontend on3100 after receiving corrected PowerShell
syntax. The25-case browser regression selection reuses the existing guarded
backend/supervisor on8100/8101 serially with `PLAYWRIGHT_BASE_URL`, without
killing another chat's services or starting a competing database lease. It is
still running; failures and final results will be retained below.

The first25-case run stops at the configured three-failure limit:4 pass,
3 fail,18 unrun. Each failure is an old count selector resolving both the new
reference banner and results heading. Count assertions now explicitly intersect
with the results status; no application behavior or permission is relaxed.
The rerun is in progress. The private client scan passes4 roots/503 browser JS/
0 configured facade/signing-key occurrences; private captures/runtime/report
paths are ignored and have0 tracked files. The scan initially refused from the
repository root because its private configuration is frontend-relative; the
documented frontend invocation above passes, without printing configuration.

The next run passes7 cases and stops at3 failures/15 unrun. One old phone
selector now sees both the identity header and contact rail; it is scoped to
the Contact region. Two functional failures are retained: narrow Sheet overflow
and breakpoint focus loss. The overflow diagnostic identifies the reset button
beside a full-width submit button. The footer now uses one bounded grid column;
advanced grid children also retain `min-width:0`. Focus tracking remembers a
rail field when CSS blurs it before the media-query event, and restoration looks
inside the newly mounted desktop panel rather than an exiting Sheet.

The focused follow-up confirms breakpoint/mobile validation/touch/role checks
pass1/1; its other case still identified the footer before that final correction.
Two intervening attempts were invalidated by the owner stopping/restarting the
frontend: connection-refused/navigation errors are not application pass evidence.
After a CA-verified200 login response and confirmation of the development-server
process, the final25-case selection runs serially on the real supervised stack.
Its latest reference case passes1/1 in43.1s. Remaining results are pending.

The final source also compiles successfully with `KAY_UI_CHECKS=1 npm.cmd run build`
into the existing separate `.next-e2e` output, avoiding the user's active `.next`
development runtime. All49 units pass again. The bounded detector was run before
the functional focus/footer corrections and was not rerun; it is not represented
as a detector scan of those later lines.

## Final verification

The final broad installed, headed Chrome run finishes24 passed/1 failed in9.8m.
The only failure is the filter geometry helper measuring Radix's hidden16px
checkbox input rather than the actual labelled44px hit area. Both the rendered
checkbox and its hidden form input now measure their shared label; no44px,
containment or overflow assertion is removed. The subsequent complete
`filter-rail.spec.ts` rerun passes2/2 in1.5m. Thus all25 distinct selected cases
have passing evidence on the final application source; this is explicitly not
one all-green25-case invocation.

The broad command from `frontend/` was:

```powershell
$env:PLAYWRIGHT_BASE_URL='https://localhost:3100'; npm.cmd run test:chrome -- tests/e2e/crm-reference.spec.ts tests/e2e/filter-rail.spec.ts tests/e2e/record-facts.spec.ts tests/e2e/list-header-actions.spec.ts tests/e2e/shell.spec.ts tests/e2e/leads.spec.ts tests/e2e/deals.spec.ts tests/e2e/leads-qualification.spec.ts tests/e2e/deals-qualification.spec.ts --max-failures=3
```

The final focused command replaces the test paths with
`tests/e2e/filter-rail.spec.ts` and uses `--max-failures=1`. Coverage includes
actual Lead/Deal create/edit/conversion, scoped counts and filters, row selection,
ID-only column preferences, role/copied-ID denial, revoked sessions, interrupted
commands, outage recovery, stale versions, responsive/keyboard/touch, both record
loading/error/denied states, real internal follow-up creation and native200% zoom.
The native zoom captures were opened, as were both corrected mobile filter
footers. No pixel-identity, full-CRM, five-browser or physical-device claim.

Final source lint and direct TypeScript checks pass; isolated production build
and49/49 units pass. Client privacy:4 roots/531 JS/0 configured facade or signing
key occurrences. Report privacy:2 JSON/2 empty step arrays/0 detailed arrays.
Only `.last-run.json` remains in `test-results`; no retained zoom profile, trace,
video, input-bearing failure context or automatic screenshot. The
[AFTER028 audit](../../anti-slop/audit-028-2026-10-18.md) retains0 new numbered
aesthetic-only findings and the bounded detector's exact timing.

The normal test fixtures clean their synthetic business records. Three empty
synthetic actors left by interrupted browser cleanup were identified read-only
on the guarded `kayrealestate_test` target and removed individually through the
existing authenticated supervisor fixture operation, not a global reset. Older
shared fixtures and the existing supervisor/user-started frontend are preserved.
No populated development data, real account or production service is changed.
Read-only verification finds0 of the three interrupted fixture IDs remaining.
The final documentation validator passes22 sprints/1283 local links and anchors/
41 acceptance mappings/13 synchronized diagrams/12 valid API examples. Task-scoped
`git diff --check` passes. Existing unrelated dirty-tree changes are preserved;
no commit, push or deployment is performed.

No populated development/production data, credential capture, external send,
commit, publication or deployment is part of this correction. Human acceptance,
physical-device testing and full-product certification remain unclaimed.
