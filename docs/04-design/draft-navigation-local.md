# Selected draft navigation integration

Status: source implementation proposal,2026-10-27. Native verification and owner
acceptance pending. This document does not narrow the existing browser baseline
or declare all P2/history work complete.

## Existing boundary

Managed forms own `data-live-dirty` from actual editable values and `aria-busy`
from outstanding commands. Ordinary legacy business forms receive only a boolean
dirty marker on input/change; readonly filters/picker queries are excluded. No
input value is read, copied, logged, submitted or stored by the navigation guard.
Same-page anchors, new-tab/modifier clicks, downloads and non-page protocols keep
their existing behavior. A page link during a managed pending command is blocked.

The shared discard dialog keeps edits on cancel. Confirmation rechecks the actual
scope for an outstanding command, then recollects its current dirty nodes rather
than trusting the original list. Synchronous actions remain supported. Approved
asynchronous navigation signals a released draft only after settlement; failure
restores markers on surviving nodes. It never changes the actual field values.
Reload/cross-document native unload protection now also covers a clean-but-busy
managed form. Browser-controlled prompts depend on the user agent and activation;
they do not guarantee that a user cannot leave an outstanding operation.

Scope checks include the root element itself as well as descendants, so passing
the actual form cannot bypass its own dirty/busy markers. This is exercised in
the existing shared-guard case, including busy state changing after dialog open.

## Same-document history integration

Feature detection enables the new path when `window.navigation.currentEntry`
and `traverseTo` exist. It listens to the standard navigation/current-entry events
and a capture-phase popstate listener. It does not write session history, add
sentinel entries, wrap history methods, copy Next's internal state or change URLs.
The installed Next16.4.2 source currently restores via one non-capture popstate
listener; an AST integration unit pins this assumption for dependency review.

Cancelable dirty traversals retain the live entry and use the same discard
dialog. Uncancelable same-document traversal is caught before Next restores its
tree; the browser returns to the live editor's existing entry before asking.
Confirmation resumes only the reviewed destination key. A pending command blocks
both paths without discarding. Current protection is rechecked at resume time.
New history attempts invalidate older confirmation callbacks, including a
cancelable prompt superseded by an uncancelable move. Settled movement closes
obsolete history prompts without dismissing a same-entry framework update.
Rapid opposite actions keep the latest requested destination; restoration targets
the original absolute entry key. Push/replace entry changes remain framework-owned.
Hash-only movement remains allowed, while distinct entries with an identical URL
still require a decision. Cleanup removes listeners and suppresses late prompts.

Return traversal is bounded to three automatic attempts, proposed pending native
review. Failure keeps the editor mounted and offers an explicit retry of that
same return, without treating the changed address as a successful router restore.
An eventual settled navigation clears the failure notice. This is not evidence
that every browser UI/gesture/stop/history-menu race has been verified.

The normative [WHATWG navigation contract](https://html.spec.whatwg.org/multipage/nav-history-apis.html#the-navigate-event)
explains why cancelability cannot be assumed. Installed Next source and concrete
controller tests supply the local integration evidence; platform documentation
does not replace a native browser run.

## Open compatibility and verification

Browsers without this API retain the existing link/unload guards only. Their
same-document Back/Forward fallback remains explicit unfinished work. Do not
raise the browser minimum, silently drop older devices or claim this feature
detection closes that gap. Final P2 also requires real form drafts, keyboard/
touch/back gestures/history menus, popup focus, reload/stop/interruption, zoom,
browser-cache restoration and supported-browser/physical-device cases.

Fifteen new frontend units cover history, cancellation/replay, pending commands,
rapid movement, hash/identical URL entries, return failures/retry, cleanup,
marker settlement, actual unload/input tracking and the installed router source.
One isolated browser integration source is prepared with synthetic DOM drafts
and real Next entry movement; it is not executed and does not replace actual
business-form CRUD/focus cases. No backend/API/permission or data change.
[Evidence](../03-planning/design-migration-evidence/history-drafts-2026-10-27.json).
