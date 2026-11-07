# Selected CSV import resume and batch ownership

Date:2026-10-28. Branch:`codex/redesign`.
Status: source integration; actual stack/native/product review pending.
[SP-18 contract](contact-import-local.md) remains authoritative.

## Selected field/action map

The frozen `src/data-operations.js` provides file/fallback choice, all-batch
preview, row-agent mapping and explicit approval. The real interface retains
that selected organization with the existing file picker, shadcn controls,
section-top actions, responsive rows/cards and guarded drafts. It exposes all
eight CSV cells through each logical row's details; no CSV fields are dropped.

| Field or action | Current home and preserved meaning |
| --- | --- |
| File name/size/native selection/progress | FilePicker in ImportComposer; UTF-8 comma CSV,20MiB/50,000 rows, current protected transfer |
| New-lot fallback | AgentPicker; only blank agent_email without a row override |
| Resume an awaiting/uploading batch | BatchReview action; select matching name/size, use its existing UUID and rotate the authorized upload permit |
| Explicit new lot after resume choice | Existing file/fallback form; clears only unsubmitted resume selection, never the previous batch |
| Preview and per-logical-row overrides | Existing BatchReview/ImportRows, all eight values and skip/error meanings, re-preview before approval |
| Approve/unknown retry/result refresh | Original preview hash/fallback/key, atomic contact creation, current permanent result and true actor |

Previously a reopened interrupted batch could not resume through the chooser;
choosing a file reserved a new batch. Changing a batch URL could retain the
previous composer selection. The composer now has a private route-keyed lifetime.
Known-ID failures can publish their existing batch URL; reopening shows either
Resume for awaiting/uploading states, or preview/result actions for later states.
Completed batches never acquire a resume action.

## Exact operation and lifetime ownership

Resume stores only the authorized current batch UUID and file metadata, not rows
or private transfer credentials. The chooser checks name and declared size,
including through an already-rendered callback. This is metadata matching, not
a claim of identical original bytes: backend generation, file hash and preview
checks remain decisive. If the batch has already advanced, the existing upload
client sends no replacement bytes. No public raw-CSV URL is introduced.

If a sent metadata-create response is unknown before its UUID is known, the
original File, fallback and key stay pinned. Replacement and sibling review
actions are locked. Only the same-file retry can recover that batch. It owns the
child review lock, so it retries directly rather than being blocked by its own
unsaved guard; a new upload still uses the existing review-draft guard. Failure
before dispatch permits correction. Known-ID interruptions retain the ordinary
same-batch preview/resume behavior.

Upload ownership is checked synchronously by review handlers, preventing an
already-rendered approval/mapping/page handler from overlapping a new transfer.
Approval distinguishes failed preflight from a dispatched unknown result, keeps
an earlier unknown through another preflight failure, and refuses stale repeat
approval after acknowledgement. A current committed read resolves the original
uncertainty. Ordinary result refresh remains available after acknowledgement.

Every import command/transfer pipeline refreshes identity and proof, permits
only an unrestricted M/A actor and binds its original operation to that actor.
This is client operation coherence, not creator-only batch authorization: the
backend intentionally retains shared M/A batch access, and an authorized person
can explicitly reopen/resume a batch in a fresh workspace. Origin/CSRF, issuing
session/generation, current roles, permanent approval replay and atomicity remain
authoritative on the server. Foreign reads/metadata/results are not projected.
Disposal aborts work and refuses late progress, preview, navigation or stale
handlers; denial clears file/resume data and masks the report.

## Verification boundary

612 frontend units pass, including14 added route/resume/file/metadata/guard/
proof/review/disposal cases in the already-registered import suite. Lint, types,
production build, history and static Frontend Taste checks are recorded in the
QA register. The original hook dependency warning was fixed by observing the
actual query authority error, without suppressing hook rules.

Three cases in `frontend/tests/e2e/import-resume.spec.ts` are prepared/typechecked,
not run: reopen awaiting_upload/uploading and resume without a metadata create;
then recover a committed-but-lost new metadata acknowledgement through the
previous report's lock using the same file/key/batch. They use synthetic CSV,
no fallback and preview only; no contact approval or worker is invoked. Trace,
video and screenshots are disabled, comparisons are safe booleans, and actor
contexts detach before isolated cleanup. These cases are not native acceptance.

No backend/schema rule changed; no actual app/browser/HTTP/DB/account/config
access or workaround, transfer/worker, migration, SQL/native/device/CI/AFTER/
product acceptance or main promotion is claimed. Intake and remaining detail/
legacy-selector coverage continue separately in the
[coverage map](../03-planning/design-migration-coverage-2026-10-28.md).
