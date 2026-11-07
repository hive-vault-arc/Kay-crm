# Contact alias projection reconciliation

Date:2026-10-29. Branch:`codex/redesign`.
[Canonical editing](contact-edit-recovery-local.md) ·
[Evidence](../03-planning/design-migration-evidence/contact-alias-projection-2026-10-29.json).

The existing backend resolves merged Contact links to their final readable
survivor and checks that survivor's current scope. An alias grants no additional
authority. Contact and Owner URLs may therefore differ from the actual Contact
ID returned by the scoped read. Canonical edit commands still target that actual
ID; a changed alias during a confirmed edit is not silently retargeted.

Two actual Contact workspace regressions initially fail: a completed full edit
through a merged URL leaves the old name visible, and management archive leaves
the old active state visible. The generic `currentRecord` helper correctly
rejects local snapshots whose ID differs from its requested identity. The Contact
caller was supplying the old URL ID rather than the authorized canonical ID.
An older management fixture stubbed this helper and could not reveal the gap.

The Contact caller now uses the current scoped read's canonical ID, matching the
existing Owner caller. Full/inline canonical edits display their newer committed
projection immediately; an authoritative same-counter read still wins. The
management completion installs a read only when both operation target and read
ID match the active canonical Contact. A different survivor invalidates the
local projection and refreshes the original scoped route; it is not installed
behind the old URL from a completion alone. Current query denial still hides
the record. No generic reconciliation rule, redirect, URL, alias/merge authority,
API/schema, selected layout or style changes.

Focused ownership/owner/realtime checks pass46, including the two regressions.
The first draft of one regression failed to descend into the tab content; after
fixing that test traversal, both failures show the actual stale name/archive
state before the production correction. Final951 frontend units and frontend
lint/types/build/history/static app lint1 pass. One additional390px isolated
browser case creates a real synthetic merge, retains its initial authorized
alias response, edits the canonical Contact and checks immediate heading plus
current canonical readback. It is prepared/typechecked, not run. Captures,
traces and videos are off; fixture cleanup remains isolated.

Backend production is unchanged; prior573 connection-forbidden units are
retained, not rerun. No actual app/browser/HTTP/DB/account/private configuration/
service access or workaround, migration/main/push/merge/deploy. All254 frozen
inputs and unrelated work remain preserved. Actual SQL/native/device/security/
CI/AFTER/product gates, migrations0036/0037 and other exact field/job/legacy
selector reconciliation remain pending. This is source and synthetic evidence,
not actual alias/merge acceptance or full-branch completion.
