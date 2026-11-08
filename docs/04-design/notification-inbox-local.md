# Selected compact notification inbox

Date:2026-10-28. Source implementation on `codex/redesign`; native and real-stack
acceptance remain pending. Frozen `work-reports.js`, `popovers.js` and active
`app.css` notification rules supply the composition. The existing
[personal notification contract](tasks-reminders-local.md#reads-and-interface)
remains authoritative.

## Header preview and complete list

The header bell opens a shadcn/Radix Popover rather than the older large Sheet.
Its360px maximum width,12px collision clearance,9px offset,16px padding,24px
radius and420px/available-viewport height cap follow the selected source. Title,
unread count, close, three quick filters and compact tonal entries occupy the
panel. Each entry has one native dossier link, title/context, and a44px icon read
action or Lue label. The selected five-pixel attention dot replaces the large
numeric bell pill; its accessible status retains the full real unread count.

The server supplies the first ten current items for all/unread/read. Counts are
never inferred from those ten rows and no incomplete-page browser filtering is
introduced. An empty state is specific to the active filter. The list has the
selected bounded scroll owner; a short-window fallback makes all controls
reachable rather than clipping the heading/filter/footer. Existing menu motion,
theme and reduced-motion tokens apply.

Tout voir opens the shared record drawer with that filter and the existing
twenty-row complete inbox. The existing `/notifications` route remains. Full
entries retain kind/status, dossier, context, due/created times, pagination and
PushControl. No permission is requested or system subscription enabled by the
preview. The existing configured complete-inbox push controls remain unchanged.

Technical UX proposals within the owner's selected composition: keep Tout voir
even with ten or fewer items so the original complete-inbox/push controls remain
reachable; use44px close/filter targets instead of the prototype's32/36px minima
to satisfy the project's touch rule. These are not new business permissions or
owner claims of final visual approval. No new palette, icon family, dependency,
chart kit, route, backend command or data field.

The Popover and full drawer have separate mounted feed lifetimes; only the
chosen view fetches its collection. Closing/unmount aborts its client mark request
and ignores late completion. Popover close cannot take focus from an opening
drawer; ordinary close returns to the bell. Route/link movement closes the inbox
without stealing destination focus. A completed compact read restores the
selected filter and scroll only while the user has not moved to another control.
These are source/controller guarantees still requiring native acceptance.

## Current data, read state and recovery

Both compositions use one hook over the existing personal GET and strict
versionless POST `notifications/{id}/read` body `{}`. The backend's current
recipient/schedule/contact scope and idempotent once-only read_at remain the
authority. Marking a notification never completes a task, changes a visit or
changes a file. No new server endpoint, worker, grant, migration or delivery
integration is added.

Exact requested page/size, unique row identities and all/unread/read consistency
are checked before displaying entries or totals. A current read/query denial
masks prior private entries/counts, aborts a pending client request and clears its
attempt before fresh retry. A transient failure exposes retry without presenting
an optimistic invented read time. Disabled hydration and synchronous submit locks
cover handlers as well as controls.

An unknown acknowledgement pins its notification ID, empty body, POST and UUID
key. Another row/filter/page/manual refresh cannot replace that operation; the
explicit retry repeats it. The server remains free to reject a now-obsolete or
revoked item. Closing a read-state preview does not claim the server rolled back
the idempotent read; the next opening reads current state.

After an acknowledged read, the feed refreshes and emits only the existing
`notifications` invalidation topic. Other inbox instances and the bell can thus
refresh through the existing deduplicated subscription even with socket delivery
disabled. The event contains no ID/title/context or private value. No browser
storage, cookie, log, telemetry or new synchronization service is introduced.
Current DTO href validation and protected destination authorization remain.

## Verification and limits

505 frontend units pass. Seventeen new actual hook/render/model tests replace
one older notification-denial test; its privacy/count/empty-body/page-size
coverage is retained and expanded. Cases include duplicate submits, unknown
same-key replay, malformed acknowledgement, current denial during a pending
read, hydration/unmount/late suppression, explicit server filters/pages,
preview/full transitions, all-state entry access, focus/scroll and bell counts.
Lint/typecheck and pinned Next16.4.2 build pass. Inventory:63 semantic glyphs,
102 consumers/341 icon sites,489 Button sites, zero violations.

The production closed history bootstrap still executes standalone. Seven emitted
CSS checks cover the compact width/available height, geometry, two-column entry,
44px read/filter targets and short-window scroll. All254 frozen inputs are
unchanged. These checks do not establish native layout, focus, keyboard, touch,
zoom, reduced motion or product approval.

One new isolated real-stack journey is prepared, not executed, covering the
ten-item preview,320–1440 geometry, committed lost acknowledgement, same-key read
recovery, unchanged read time, full-list filter return, Escape/bell focus and
actual touch context. Two prior notification dialog selectors now use the
current accessible name. Older unrelated native suites still need reconciliation.
No backend tests were rerun and no real stack/service was started for this slice.

The React best-practices skill and its event/listener/transient-ref rules were
read/applied. The existing useQuery/deduplicated event mechanism is retained;
the generic SWR suggestion does not override the approved architecture.
Original-machine mandatory UI skills remain unavailable/not claimed, dense CRM
excludes marketing design-taste and AFTER timing remains. Existing app-access
rejection stays binding; no browser/CUA/CDP/HTTP workaround, database, private
configuration, real records, main, push/merge/deploy. Native/full-stack/current
scope/race/actual CI/AFTER and owner review remain open, as does the full goal.
[Evidence](../03-planning/design-migration-evidence/notification-inbox-2026-10-28.json).
