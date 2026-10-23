# Remaining CRM integration and production release

Status: preparation, not tested or released.

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

## Push provisioning boundary

The owner requests VAPID setup. Do not generate a key into chat, screenshots,
tracked files or public diagnostics. Browser credential creation/entry/submission
requires a human handoff. The technical contact is a monitored team email, not a
notification recipient. `itteam@kayrealestate.ma` was proposed to the owner;
monitoring confirmation remains pending. Keep Web Push off until complete runtime
configuration and consent/provider validation. WSS/in-app inbox remain enabled.

Record actual commands, results, remaining risks and production read-back here
and in the QA/security registers as the work proceeds; no pass is inferred from
individual feature checkouts' historical evidence.
