# Remaining CRM integration and production release

Status: combined locally; focused checks underway, not released.

Owner request: publish all prepared owners, property forms, project links,
reminders, histories, initial prices and record-removal workflows. Preserve the
already deployed realtime implementation. C02/C04/C06/C07/C08/C10/C13/C14 apply.

## Source inventory and preservation

Integration branch `codex/remaining-crm-release` starts from live main
`16242781528d4f4df3e1454827d77657c56a655c` in the existing managed realtime
worktree. The primary checkout and other feature checkouts contain unpublished
user work and must not be reset, cleaned, switched, or staged in place.

- Primary `codex/property-initial-price`: required initial draft offering price,
  prices in cards/details, record archive/restore and visit cancellation controls.
- `owners-directory`: scoped owner directory, creation/edit/detail, portfolio,
  navigation and compact presentation.
- `property-listing-fields`: complete conditional multi-step property listing,
  Maps link, expanded property categories and separate holiday rental campaign.
- `lead-deal-project-links`: discussed/visited project links, history positioning
  and French event descriptions, proactive reminders and visit outcome recording.
- Open PR17: inspect for still-missing skeleton/page-size/owner-archive behavior;
  do not blindly merge an older competing implementation. PR21 is an older UI-only
  release and must not replace later integrated photo/storage work.

Capture complete tracked/untracked, nonignored feature changes as recoverable
Git snapshots without modifying their real indexes or working files. Integrate
against current main with three-way reconciliation, reviewing overlaps rather
than overwriting live-update/version/conflict handling.

## Acceptance and release gates

1. One linear additive migration chain follows production `0031_realtime`.
   Reconcile competing `0031` revisions and all references/tests. Test both fresh
   and populated upgrades; preserve existing business values and identity/history.
2. Backend permission, ownership, collaboration, current-session, merge policy,
   version/idempotency, archive/restore-window and stock guards remain authoritative.
   No protected business/finance hard purge or real synthetic seed is authorized.
3. French owners navigation and all requested workflows work end-to-end, with
   scoped numbered pages, conditional forms, required positive MAD prices, safe
   Maps links, independent Lead/Deal histories and correct reminder context.
4. New writes invalidate the proper realtime audiences; current views reconcile
   without losing filters, pagination or unsaved drafts. Worker effects remain
   durable and replay-safe. No per-socket database lease or private event payload.
5. Run backend quality/full isolated PostgreSQL regression, frontend quality and
   unit/build checks, full compiled browser regression, focused realtime and new
   workflow cases, visible synthetic desktop/mobile/keyboard/zoom review and
   proportional load verification. Preserve failures and corrected evidence.
6. Preserve Riviera, Iconsax, shadcn/Tailwind/Bklit and compact geometry. Apply
   design-system-ops and React/uncodixfy guidance; design-taste's marketing workflow
   excludes these CRM forms/tables. Antislop remains AFTER with unselected
   aesthetic-only findings untouched. ENERGY1/RHYTHM1/MOTION1 follows DESIGN.md.
7. Publish a PR and merge only with actual required CI and exact-candidate manual
   integration success. Inspect the real production graph, apply approved additive
   migrations, explicitly fetch latest main on DigitalOcean, verify API and worker
   source hashes, schema drift, Spaces retention and public WSS/browser behavior.
   A generic Healthy badge or app-spec save is not source-version proof.

## Off-CRM notifications cancelled (owner decision, 2026-10-23)

The owner cancelled VAPID provisioning and all off-CRM notifications. The CRM
account email addresses do not represent monitored inboxes. Do not generate keys,
request an email contact, enable Web Push, or provision SMTP as part of this
release. Keep `WEB_PUSH_ENABLED=false` for both backend and worker. Preserve
WebSocket live updates and the database-backed in-app inbox while the CRM is open;
reminder records remain available in the inbox when an agent returns. This
supersedes the earlier request to configure VAPID. Removing the dormant push
implementation or its database history is not required by this decision.

## Combined candidate evidence

All four recoverable snapshots are integrated by three-way cherry-picks. Shared
facades retain PDF routes, record archives, owner portfolios and project links;
consultation panels retain stable identity/revision handling from live main.
The additive chain is `0031_realtime` (unchanged) ->
`0032_property_listing_details` -> `0033_project_links` -> `0034_proactive_work`.
The frozen project-link timeline vocabulary also preserves existing archive
actions. New project-link changes invalidate both contact and deal live views.

On the isolated loopback55439 test database, upgrade to the combined head and
`alembic check` pass. Python units291/291, frontend units91/91, frontend types,
production build, lint, backend Ruff/format/mypy pass. Dependency audit reports
zero runtime advisories and the existing approved dev-only exception. Repository
indexed-path/size/ignore checks pass. These are scoped results, not release gates.
The first database selection stopped at39 passes on a realtime test that assumed
one task outbox job; tasks now have three. The test now drains all three, asserts
the queue is empty, and retains provider/session/deduplication assertions. The
expanded database rerun, visible browser checks and exact-commit hosted full
integration remain required before merge. No production schema/deployment writes
have been made during this integration.

The expanded isolated selection passes82/82; legacy discovery/qualification/work
migration tests pass7/7 after explicitly asserting the new empty details default
while retaining all pre-existing JSON facts. Visible Chrome passes the seven
owners/project-links/holiday/mobile/archive/calendar journeys. A random synthetic
phone test used unassigned ranges; fixtures now use a valid Moroccan mobile
prefix and assert the creation response. The long form review exposed a real
final-Next/default-submit race, not a backend save failure: keyed button identities
and preventDefault now keep review separate from creation, with an explicit
zero-POST-before-review assertion. Price review uses guarded canonical MAD
formatting, including invalid/over-precision input coverage. Owner portfolio and
owner-directory queries also reconcile inventory invalidations without refreshing
unrelated contact lists. These latest corrections require rerun on the new SHA.

The first100-user attempt overlapped visible Chrome and failed connection setup
(99 users ready, no steady request phase). This is a failed load gate, not a
latency pass. Rerun serially with unchanged100-user/socket and1s/2s limits. Hosted
run39936891171 failed its old preservation assertion after235 backend passes and
was cancelled; it is not release evidence. Final full hosted integration and
production verification will be linked on PR25, not inferred from previous runs.

Record actual commands, results, remaining risks and production read-back here
and in the QA/security registers as the work proceeds; no pass is inferred from
individual feature checkouts' historical evidence.

Final-candidate run39941972537 passed964 backend tests and5 real-WSS browser
tests, but stopped after25 compiled CRM passes on an obsolete conversion-link
count. The conversion remains one Lead event and three Deal events; the test now
asserts their exact actions/context/targets and both dated French descriptions,
instead of expecting the Lead conversion to be a fourth Deal event. Its visible
compiled Chrome rerun passes1/1. The local broad PostgreSQL run also passes948
(recovery excluded locally; covered by the hosted964 run). The full browser gate
now accumulates up to5 failures for useful diagnostics, still requiring zero
failures to release. No business rule or test is skipped to obtain a pass.

Run39944800692 passes964 backend and5 WSS tests; compiled Chromium completes
125/128, with three legacy inventory-test failures. The empty-property lifecycle
fixture deliberately has no initial offering: price-dependent cases now create
their own900000.01 MAD sale draft. Duplicate header/campaign price text is checked
inside its intended tab panel. The project reference test must clear all eight
rendered categories (the empty House category stays hidden), using stable labels
rather than a four-category list or index-based locators during refetch. Local
compiled Chrome reproductions retain all prior price, permission, availability,
privacy, retry and layout assertions. Full local Chrome was stopped after60
completed cases to focus these failures; its developer-only component-guide
failure under production mode is not an application/release pass. Production CI
already excludes that unpublished guide. A final complete hosted rerun remains
required; no production schema/deployment write has occurred.
