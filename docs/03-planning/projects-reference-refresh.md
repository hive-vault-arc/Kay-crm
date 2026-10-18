# Projects reference refresh

2026-10-18. Local technical outcome complete; human review pending. No commit or
push. Supplied image is the current
visual target for `/projects`, superseding the older compact-toolbar screenshot
composition only here. Retain Riviera, French routes, Iconsax, shadcn/Tailwind,
numbered pages, real campaigns, shared facts and protected owner/file boundaries.

Reading: operational inventory directory for the KAY team, Riviera, ENERGY1/
RHYTHM1/MOTION1. Design-system-ops owns geometry; responsive/React/Impeccable
Operate support implementation. Design-taste explicitly excludes this dense
product directory; no marketing concept tournament. Antislop remains AFTER,
with no unselected aesthetic-only fixes. Main-agent review, no subagents.

## Acceptance from the actual image

- Compact Projets title/create action, underlined standalone/development tabs.
- Warm approximately314px left filter rail: heading/reset, labeled search,
  category checkboxes with whole-result counts, offer kind/status, advanced
  filters and automatic application. Keep Maison, archive and numbered size
  capabilities even though not illustrated by the three populated categories.
- Four photograph cards across at the supplied1677x938 viewport; two rows of
  eight synthetic properties matching the reference's2 land/3 apartment/3 villa
  distribution. Image-first cards have real category labels, name/location,
  two-column sale/rental current campaigns and working detail link.
- Working Cards/List, backend sort, automatic search/filter/reset, result count,
  pagination and programme navigation; retain actual prices, review/occupancy/
  conflicts for populated campaigns rather than always displaying « Aucune ».
- Reuse real protected `InventoryThumbnail`, clean scan and file permits, not
  public listing URLs or client-owner data. Eight generated synthetic photo
  fixtures are test-only and never assigned to real inventory.
- Desktop/mobile/keyboard/touch/native200%, loading/empty/error/denied states;
  full-range counts beyond page one; permitted/invalid/retry and existing
  inventory/files/hierarchy regression coverage as affected.
- Open final actual populated screenshots and compare to the supplied image;
  record exact tests, privacy/security, AFTER audit and completion audit.

Reference-specific geometry belongs in central tokens. Existing224px shell and
≥44px targets take precedence over screenshot-only smaller sizes. No new
schema migration, stock rule, real seed or deployment is planned.

## Implemented vertical slice

`PropertiesQuery` adds bounded exact unique CSV categories to the properties
endpoint only, preserving legacy single-category clients and rejecting ambiguous
use of both. Empty means none. Canonical zero-inclusive facets precede category
selection/pagination and follow all existing non-category filters in the same
repeatable-read snapshot. Shared physical inventory stays separate from private
owner expansion and programme/unit projections. Strict facade/response parsing
and current sessions remain authoritative; no new migration.

The directory composes existing shadcn controls, FilterResultsLayout/Sheet,
NumberedPages and TanStack/shadcn DataTable. New PropertyCard/PropertyCampaign
reuse protected InventoryThumbnail and existing semantic prices/states. Query
search debounces250ms; category/type/status/sort apply immediately and reset to
page1. Literal search remains percent-encoded under the existing client target
allowlist. Clearing all visible categories sends explicit-none, not an invisible
zero-count Maison selection. Positive Maison remains fully selectable. Mobile
has its own visible reset; no hidden desktop-only dependency.

The central geometry is314px rail,148px cover,240px card minimum,176px native
sort and728px minimum rail. Auto-fill yields four cards at1677px, fewer as the
container narrows. Ordinary Tailwind owns anatomy; local CSS controls only the
reference workbench, category markers/row flex and compact utility header. The
older generic rail utility forced checkbox rows to grid; explicit scoped flex
restores the requested horizontal row. Card gap/body spacing was corrected in
the same comparison batch. No new component kit, chart, font, dependency or icon.

## Visual comparison and intentional differences

The actual supplied image, old baseline and settled desktop/mobile/filter
captures were opened, not inferred from filenames. Two main visual batches
compare four-by-two image cards, warm left rail, category counts, photo badges,
name/location, two current campaigns and gold detail links. Real default recent
sort is preserved; selecting backend reference order reproduces the sample card
sequence. Programme creation remains tied to the selected tab. The supplied
fictional2/3/3 distribution is recreated only in isolated fixtures.

The existing224px sidebar and French Riviera fonts stay, rather than the
image's~202px rail. The44px utility header keeps global notifications reachable;
the mock omits it. This and≥44px filter/action targets slightly increase full
page height. No narrow max-width or unexplained dead band is introduced. The
subtitle/count remain truthful product data, not always «8 biens fictifs».
Prices, review/occupancy/conflict messages grow cards when necessary rather than
being clipped to the mock's all-empty-campaign height. Native short sort labels
are readable on mobile. These are scoped accessibility/domain-preservation
differences, not an alternative visual world.

Safe ignored evidence lives in
`frontend/output/playwright/projects-reference/`: before.png, desktop.png,
mobile.png, mobile-filters.png and native-zoom-200.png. Captures contain only
synthetic post-login UI. The8 PNG fixtures in assets/ were generated by the
built-in tool, visually inspected, copied from its default saved outputs and
uploaded through real metadata/permit/transfer/ClamAV flows. They are never used
as real inventory covers. Exact prompts, paths and SHA256 are recorded in
[the asset manifest](projects-reference-assets.json). Originals are preserved;
no output asset exists only outside the workspace. No new shipping raster.

## Actual verification and retained early failures

Backend uses its explicit venv; the exact confirmed test supervisor tree was
stopped for the exclusive pytest lease and restarted before serial browser work.
Port8000 and user's frontend3100 were untouched.

- `.venv/Scripts/python.exe -m pytest tests/test_property_facets.py tests/test_inventory.py tests/test_inventory_edges.py tests/test_project_permissions.py -q --tb=short`:51 passed66.51s.
- Scoped Ruff passes; `.venv/Scripts/python.exe -m mypy app/inventory`:24 files pass.
- `npm.cmd run test:unit`:66 pass, including exact/empty/ambiguous/legacy category
  semantics, hidden zero-count category clearing, current session/filter relay,
  fail-closed incomplete facets and the production-client path allowlist.
- Frontend lint/typecheck and separate `KAY_UI_CHECKS=1 npm.cmd run build` pass.
  The live development.next was not overwritten. Inventory:45 icons/49 consumers/
  171 sites;319 buttons/103 files;0 violations.
- With PLAYWRIGHT_BASE_URL=https://localhost:3100,
  `npm.cmd run test:chrome -- tests/e2e/projects-reference.spec.ts tests/e2e/inventory.spec.ts --workers=1 --max-failures=1`:9 passed3.3m. It covers7 existing inventory cases plus2 new Projects cases: actual clean photo downloads, views/filters/sort/House/pages, prices/annual comparison, owner privacy, role/version denial, held acknowledgements, actual outage/retry, exactly-once edits, late logout denial and revoked sessions.

Early baseline8-image waits failed because below-fold lazy thumbnails had not
been observed; baseline capture was explicitly limited to the initial state,
while final checks await each actual photo after scrolling. Mobile captures were
initially loading and full-page sticky navigation was displaced by scroll; settled
captures reset scroll and use the actual viewport for mobile/zoom. No UI render
claim is inferred from scan success alone.

One older logout test expected visible ellipsis instead of the existing stable
aria-label; only its locator was corrected. More importantly, the revoked-session
test exposed a real new path-builder error: URLSearchParams emitted plus spaces
rejected by KAY's API client. It was fixed to%20 in the feature builder, with a
new regression assertion, not by weakening the security allowlist. The first
generic filter-rail extension expected its historical24px gap, whereas the
documented Projects gap is20px; its scoped assertion now checks20px exactly.
The successful mixed-hierarchy browser case passes17.4s. Final broader confirmation
and security/cleanup results follow below; failed attempts are not counted as passes.

One five-target detector returns[]. AFTER032 and the main-agent finish review
record the evidence; no independent reviewer or human visual approval is implied.
No unselected aesthetic-only finding was fixed and no commit/push occurred.

Final wider confirmation passed the shared five-directory filter-rail case but
timed out in the newly added clear-all test. During a pending request useQuery
deliberately hides the previous value, so rapid category changes lacked the
current zero-house fact and could retain invisible Maison. Categories now wait
disabled for current facets; no stale snapshot is reused and the held-request
case checks this state. The response wait is explicitly bounded15s rather than
waiting for the entire case budget. This is a functional race correction, not
an aesthetic audit fix. The failed attempt is not counted as a pass.

The timed-out case also exhausted its cleanup budget. A subsequent run received
409 on its first fixture reference. A read-only isolated check found1 synthetic
user/8 properties/8 documents and0 contacts/enquiries/offerings. With no browser
suite running, the existing authenticated supervisor stopped its test worker
and ran guarded `fixture clear`; this refuses development/non-synthetic users.
Only these disposable test rows were removed; generated asset originals/copies,
development data and port8000 were not touched. The clean rerun follows below.

The clean rerun passed clear-all but a later mobile photo wait failed after
rapid filter/view remounts. Existing file permits are limited to30 per session
per minute; that budget was a suspected cause, not captured proof of429 in the
failed run. No limit, permit, preview or authorization implementation was changed.
Mobile capture now uses an independent fresh synthetic session, as touch/native
zoom already do. The real filter session records only its count of429 permit
responses in geometry.json, with no IDs, headers or token diagnostics. Final
captures still require actual protected blob images; no mocked download/pass.

## Final confirmation and security/cleanup

With the real running HTTPS stack,
`PLAYWRIGHT_BASE_URL=https://localhost:3100 npm.cmd run test:chrome -- tests/e2e/projects-reference.spec.ts --workers=1 --max-failures=1`
passes2/2 in1.4m: populated/reference51.0s and campaigns/outage34.6s. This is
after the clear-all/loading correction and independent mobile-capture session.
Across the documented runs,11 distinct Chrome cases pass:2 Projects,7 incumbent
inventory,1 shared five-directory rail and1 SP08 hierarchy case. This is not an
11-case single final invocation or a full-product/all-browser certification.

Final lint and separate production build pass after the source correction;
unit suite66/66 passes. Browser-bundle scan checks4 roots/577 JS with0 configured
facade/signing-secret matches. The dependency check during this task reported0
runtime vulnerabilities/9 inherited dev-only findings under the existing
expiring exception, not a clean full audit. No dependencies changed.

Final desktop,360px mobile/filter and actual native200% captures were opened.
Desktop has8 settled synthetic photographs in four-by-two cards; native zoom
shows actual clean photos and readable two-column cards, not a lazy placeholder.
Native measurements:713 CSS px,2x verified zoom, minimum sampled contrast4.729,
0 page overflow,0 visible controls under44px. The final rapid filter session
recorded0 throttled permits; this does not retrospectively prove the earlier
photo failure's cause. The fallback remains truthful when a preview fails.

`powershell -NoProfile -File scripts/audit-report.ps1` finds2 JSON entries,
2 empty result-step arrays and0 detailed/input-bearing arrays. Only
test-results/.last-run.json remains as a file; the native profile is removed,
with no trace/video/automatic screenshot or password diagnostics retained.
Output/fixture assets/report/result paths are confirmed Git-ignored.

Read-only queries after fixture cleanup prove0 users, contacts, enquiries,
properties, offerings, documents, jobs and notifications in the guarded isolated
target. Worker status is stopped/not ready. The pinned project-only ClamAV
service started for these transfers was stopped again; signature volume and
generated PNG originals/copies remain. Frontend3100 and test API8100/supervisor8101
remain running. CA-verified3100/login and8100/health/live return200. The first
health probe forced IPv4 on the IPv6-only frontend and was refused; using its
actual localhost listener verifies200 without changing or bypassing TLS.
Port8000 was never stopped or repurposed. No development/production data changed.

Root sprint/document validator passes22 specifications,1292 links/anchors,
41 acceptance mappings,13 Mermaid sources and12 API JSON examples; git diff
--check passes. These are documentation checks, not inferred application tests.

## Completion audit against the original outcome

| Original requirement | Current evidence |
|---|---|
| Match the supplied Projects composition | Actual reference and final desktop opened; compact title/create, underlined tabs, warm314px rail, four-by-two148px photo cards, paired campaigns and detail links. Deliberate retained shell/header/touch differences are stated above. |
| Working filters and directory actions | Actual search/category clear-all/reset, Cards/List, backend sort, Maison, archive/page-size/numbered pages and programme route; full-range facet counts tested beyond page1. |
| Preserve real data/security | Current-session strict facade, private-owner denial, protected clean-file permits, role/version/retry/session regressions; no fake production photo/count, migration or development seed. |
| Responsive and resilient | Six widths, mobile Sheet/reset, keyboard/Escape/focus, touch, verified native200%, real held loading/empty/outage/retry, long populated prices and annual comparison. |
| Tests and handoff |51 PostgreSQL/66 units, scoped static/build checks and11 distinct headed cases across recorded runs; final2-case confirmation and actual screenshot/privacy/cleanup evidence above. |

Local implementation and technical comparison are complete. Khalid's product/
visual approval and broad release/all-browser verification remain separate.
No unresolved in-scope functional failure is known; the earlier transient photo
wait is retained with its uncertainty, not erased or recast as a proven root cause.
