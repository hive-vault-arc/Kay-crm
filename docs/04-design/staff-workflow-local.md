# Selected staff account workflow

Date:2026-10-28. Branch:`codex/redesign`.
Status: source integration; actual stack/native/product review pending.

## Selected surface and preserved contract

Frozen `src/settings-pages.js` and `src/settings-operations.js` retain Settings
navigation, numbered users, name/e-mail/role, chosen initial password, profile
save and confirmed reset/delete. They do not specify additional staff-directory
filters. The selected Settings workspace, top form actions, identity/access
grouping and natural-height security support remain unchanged. Standard controls
stay shadcn/Tailwind with the existing typed semantic icons.

[D37](../03-planning/staff-onboarding-deletion.md) remains authoritative: new and
reset accounts are active, the chosen initial password expires after24 hours,
the recipient must choose a different own password and log in again, reset needs
the current administrator password, and confirmed Delete retains CRM identity/
history. Backend current authority, version, last-administrator and receipt
checks are unchanged. No activation, disable, delivery or replacement identity
workflow is introduced.

## Original operation and editor ownership

Previously the profile/security forms retained a serialized body fingerprint but
allowed edited fields to generate a new key after a lost response. The editor
could also continue showing the former account while loading a new target.

The real frontend now has one staff-operation scope shared by the profile and
security dialog. Profile validation reserves it synchronously. Only its owner
can dispatch, complete or recover an operation; the sibling cannot overlap it,
including through an already-rendered handler. Profile dirtiness still prevents
starting a security action.

Every mutation first refreshes identity/CSRF under the same AbortSignal, requires
the original actor and administrator role, and refuses restricted-password
identity before dispatch. This is an additional frontend coherence check;
backend authorization remains decisive. Failure before dispatch permits ordinary
correction. A dispatched unknown result pins the original path/method/body/key
and expected version. Inputs, sibling operations, cancel, Escape and reload stay
blocked; the explicit retry uses that original operation. A retry preflight
failure does not erase an earlier unknown outcome.

After acknowledgement, only the safe result/operation metadata are retained;
the request body is dropped. If completion fails, recovery completes that result
without another mutation. An authoritative rejection before acknowledgement
releases an ordinary attempt; an already-unknown attempt stays pinned until its
result is recovered or authority is lost. Denial masks prior content and clears
credentials. A known wrong administrator password clears that input and permits
correction with a new operation. Self profile/delete success goes directly to
fresh login because the command revokes that session.

Staff editors have private React lifetimes keyed by actor and target. A changed
target begins loading without projecting the old account, aborts the old read/
command and ignores late replies. Detail and mutation facade responses must match
the requested account UUID; a foreign success becomes a safe503 with no account
projection. The browser command also checks acknowledgement target identity.

## Credential and verification boundary

Passwords remain only in their transient input/request owner. Draft baselines
contain a presence boolean, not a password or serialized fingerprint. Dismissal,
denial, acknowledgement and disposal clear the appropriate input/request
references. No password enters storage, URLs, logs, evidence or GET responses.

The synthetic unit suite covers shared ownership, validation reservation,
immutable retry identity/body/version, preflight versus dispatch failure,
acknowledged completion, denial, aborted transport, late replies, foreign
targets, hydration, wrong-password correction, self-session revocation and safe
facade projection. The new command suite is explicitly registered in the
frontend unit runner. Selected-label selectors in the older staff browser suite
are updated to the current required labels.

Two new real-stack browser cases are prepared in
`frontend/tests/e2e/staff-recovery.spec.ts`: commit then drop the profile/reset
response, verify locked sibling/actions and recover exactly the same request.
They use isolated synthetic staff, transient private fills, disabled trace/video/
screenshots, safe boolean assertions and cleanup. They have **not** been run.
No actual app/DB/account access, migration, service/worker, credential config,
access workaround, native visual/focus/device acceptance or main promotion is
claimed. See [coverage](../03-planning/design-migration-coverage-2026-10-28.md).
