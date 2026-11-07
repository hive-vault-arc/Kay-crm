# Selected owner directory, preview and record

Status: source integration proposal,2026-10-27. C02/C04/C13/C14; native and owner
review pending. This extends the [owner identity form](owner-forms-local.md)
without introducing an owner identity or legal-link command.

## Directory and quick entry

Frozen `owners.js`, `owner-inline-ui.js` and `owner-workspace.css` supply the
selected columns, ordinary-click preview, header create action, compact identity
sections and right-only portfolio. Existing shared headers, DataTable phone
cards, filters, RecordDrawer, RecordFacts and ContactInlineField implement that
composition. Scoped CSS retains the selected spacing, tonal cards, top labels,
phone field column and natural dossier height. No new kit, theme or dependency.

The current backend directory predicate remains `owner_directory=true`: literal
owner role **or** current/former property/development link. No strict role gate
excludes linked owners. Agent archive requests are forced active, including
stale hidden filter state. Search uses the existing numbered20-row collection;
the server remains authoritative for scope, private phones and archive access.

Ordinary hydrated title clicks open a lazy current Contact read. Modified,
auxiliary, prevented and pre-hydration clicks retain their actual route. Those
links do not prefetch contact details. The current permitted read supplies the
drawer title; cached directory names cannot remain in a denied preview. Closing
returns focus to a surviving row or the header create action. The header create
link uses the same OwnerForm controller as the routed fallback: one title/form,
the same existing/new choice, complete collections and exact retry behavior.

## Shared identity and current authority

Preview and full record use the same per-value Contact editor. Display separates
primary/secondary methods; edits preserve the complete collection, labels, other
roles, assignment and provenance through the existing Contact command. Primary
agent is not a direct inline PATCH. Full management reuses existing impact,
confirmation, current-version and reason controls. Literal role creation does
not create legal property links. Archived identity remains read-only.

Canonical aliases accept only updates for the current canonical Contact. A
newer accepted edit survives a stale read; an equal/newer current read wins.
Foreign-ID replies trigger a fresh read rather than adoption. Definite current
denial hides private identity and assets, including denial from management
preview/commit/follow-up/refresh and portfolio reads. Retry clears old projection
before reread. Departed callbacks cannot reopen/navigate the workspace. Transient
errors remain errors rather than false success or an authorization grant.

## One portfolio location

There are exactly two main tabs: Aperçu and Activités. Patrimoine is only in the
right region, with retained lazy current/past panels and a Projets header action.
Legacy `tab=portfolio` resolves to overview plus the same right region; supported
activity/past deep links are preserved. There is no second portfolio main tab.

The quick preview requests only current page1,size3. Its strict schema rejects
another page, excess rows, historical links or unexpected fields. Counts remain
the actual backend link total, with a remaining-count hint. Full cards preserve
link IDs and lifetimes, property/development routes, archive state, location and
visible link/unlink dates. Multiple historical links to one asset are not
deduplicated into a false history. Numbered paging remains; an empty page after
collection reduction can return to the preceding page. No unnecessary empty
single-page footer or duplicate history shortcut is added. Legal ownership is
still managed only on the asset record.

## Evidence and limits

Twenty new actual-module cases are registered:17 owner workspace/shared boundary
cases and3 drawer-form reuse cases. The complete372-case frontend gate passes,
as do lint/typecheck and the pinned Next16.4.2 build. Two isolated1440/390 browser
journeys are prepared, not executed. Older owner/inventory browser selectors
still need reconciliation. Source/compiled CSS checks and254 frozen hashes are
not native visual, focus, touch, zoom, accessibility or full-stack evidence.

Original-machine mandatory skill files remain unavailable and are not claimed
executed. Dense CRM/forms exclude the marketing design-taste workflow. Existing
shared system/React guidance and AFTER timing remain. Current-role/merge/race/
SQL/native/full-stack/CI/AFTER/owner gates and the wider migration stay open.
No real records, database, service, private configuration, backend route or
schema was accessed or changed. No main promotion, push, merge or deployment.
[Evidence](../03-planning/design-migration-evidence/owner-workspace-2026-10-27.json).
