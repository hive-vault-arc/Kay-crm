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

Feature detection prefers the Navigation API path when `window.navigation.currentEntry`
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

## Classic History API fallback,2026-10-27

Browsers without native entry keys now receive the same controller through a
classic adapter. A closed first-party inline Script in the root layout executes
before hydration; the protected workspace also attempts idempotent installation
if that startup step was missed. This follows the [Next Script contract](https://nextjs.org/docs/app/api-reference/components/script)
and is checked against the installed16.4.2 bootstrap source. No remote loader,
new dependency or framework upgrade is involved. The modern path skips the
classic instrumentation entirely.

The adapter adds only `__kayHistoryEntryV1:{scope,position,id}` to ordinary
history-state records: UUID scope/entry identifiers and an integer position.
Initial replace adds no session entry; normal pushes get distinct identities,
including duplicate URLs, while replace preserves identity. No sentinel entry,
artificial push, history-stack truncation or URL rewrite is introduced by setup
or restoration. An ordinary application push keeps its existing native behavior.
Next's opaque owned fields pass through unchanged and are never interpreted or
copied into the KAY marker. No form value, record, credential or private tree
is collected into a separate registry/storage/log. Metadata tracking lasts for
the document; the protected editor's guard listener still cleans up on unmount.

The adapter translates reviewed entry keys to relative traversal only when
current/target markers have the same scope and valid positions. It never calls
go(0). A settled matching popstate resolves the attempt; a different destination,
write interruption or two-second timeout rejects it. The existing three-attempt
return limit and manual recovery notice retain the live editor. Untracked,
non-record or failed-initial-write entries fail closed rather than inventing a
direction or releasing a dirty entry into Next. Returning to a known entry with
browser history can recover the held return. Native fragment entries receive
their own marker and leave the current React editor in place; fragment movement
does not trigger a false dirty-navigation prompt or incomplete Next restoration.

This necessarily differs from the no-history-writes implementation of the
Navigation API path above. It is a scoped compatibility proposal within the
existing draft guard, not a new permission or business rule. The [History API
contract](https://html.spec.whatwg.org/multipage/nav-history-apis.html#the-history-interface)
and [popstate ordering](https://developer.mozilla.org/en-US/docs/Web/API/Window/popstate_event)
explain the marker/return requirement. Native recovery, history menus, nested
frame/joint-session movement, startup blocking/CSP, browser-cache restoration,
stop/interruption, real forms/keyboard/touch/zoom and supported physical devices
remain verification work. Positions describe app-owned main-frame writes;
synthetic tests do not prove every browser/subframe history race.

## Evidence and remaining verification

The [classic follow-up evidence](../03-planning/design-migration-evidence/classic-history-2026-10-27.json)
records17 added frontend cases, including actual generated-script execution,
installed Next wrapper nesting in both orders, installed pre-hydration bootstrap
ordering, failed writes, retained/reloaded metadata, exact destinations, rapid
movement, timeout/retry, pending commands, hashes, unknown entries, cleanup and
actual workspace interface selection. Compiled function extraction/standalone
execution checks the emitted bootstrap's closure independently of source tests;
it is not a browser/app run. No backend/API/permission/data change. The prepared
native integration source now covers both preferred native and forced-classic
paths, still with synthetic DOM drafts and real Next entry movement. It has not
run and does not replace business-form CRUD/focus/gesture cases or owner review.

The earlier checkpoint's fifteen frontend units cover history, cancellation/replay, pending commands,
rapid movement, hash/identical URL entries, return failures/retry, cleanup,
marker settlement, actual unload/input tracking and the installed router source.
Its original [evidence](../03-planning/design-migration-evidence/history-drafts-2026-10-27.json)
remains historical. No browser minimum is raised; native, full-stack, AFTER and
owner gates and the full redesign goal remain open.
