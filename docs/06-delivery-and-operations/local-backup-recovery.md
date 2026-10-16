# Local backup and recovery (SP-21)

Local implementation,2026-10-16. C14/C13, BR02/06/23/24; AT25 and recovery
AT02/26/37. Product review remains Khalid's. This is same-laptop recovery with
synthetic data, not a production deployment or independent disaster-recovery site.

## Protected restore points

From backend/, every operation uses .venv/Scripts/python.exe. PostgreSQL18
pg_dump/pg_restore binaries come from the existing ignored configuration.
Passwords are never arguments/URLs/output: tools use a short-lived private
passfile, fixed argument lists/no shell/no password prompt, bounded execution
and captured/redacted diagnostics. Source and target server/binaries must be18.

Points live outside public/source roots at backend/.local-data/backups/{source}.
A protected Windows DACL grants only current user and SYSTEM. Payloads are
current-user Windows DPAPI authenticated encrypted64KiB chunks, bound to point,
filename and chunk index. The random manifest-HMAC key is itself DPAPI protected.
The manifest contains safe identifiers/counts/digests, never plaintext contact
values, passwords, signing keys or complete database URLs. Secret configuration
and TLS keys are not in the code archive. This same-user/machine dependency and
DPAPI integrity behavior follow the [Microsoft DPAPI contract](https://learn.microsoft.com/en-us/windows/win32/api/dpapi/nf-dpapi-cryptprotectdata).

A point includes the custom-format public-schema database dump, every retained
UUID .blob/.part object, and application.zip (app/migrations, frontend source/
public assets/entry configuration and exact package/requirement locks).
The code bundle is evidence/recovery material, never automatically extracted
over or executed from the working checkout. SHA256 row counts/digests cover
every public table; schema revision, source cluster/OID, WAL LSN, times and a
code/lock fingerprint bind the point. Required file versions/raw imports/ready
exports are checked against their SQL size/hash before publication. Scan states,
history, hierarchy, offering targets, finance originals and import results remain
in the SQL snapshot. The signed manifest is fsynced and atomically published last;
partial points are never a completed recovery point.

## Maintenance and coherence

A fixed per-environment pause intent rejects new API requests and worker cycles.
One shared PostgreSQL admission lease per process spans complete API response
streams or a complete worker cycle; it is not one extra pooled connection per
request. The backup waits for admitted work to drain, takes the exclusive
cross-process lease, then SHARE-locks all public tables to pause database writes.
The same stable committed state supplies dump, row evidence and immutable files.
Liveness stays readable; other API requests return503/no-store/Retry-After.
Source website submissions pass through that API and cannot cross the pause.
File reconciliation CLI also participates. Other operator migrations/direct SQL/
standalone write tools must be stopped during maintenance; this is not a
permission to bypass the gate with an administrative connection.

Normal exceptions release locks and the owned pause. OS process death releases
PostgreSQL locks but intentionally leaves the intent closed. The resume command
checks that the recorded Windows owner is dead and no exclusive owner remains;
it cannot reopen an active backup. A missing recovery-ready marker still blocks
the recovered API/worker after resume. Incomplete/corrupt points are preserved
and counted for operator attention, never blindly expired.

## Commands and schedule

After checking the source environment and protected local configuration:

~~~powershell
.venv/Scripts/python.exe -m app.cli.backup create
.venv/Scripts/python.exe -m app.cli.backup status
.venv/Scripts/python.exe -m app.cli.backup schedule --watch
~~~

Default source is development; isolated exercises explicitly set APP_ENVIRONMENT
to test and restore its previous value afterwards. No real-data backup/export
was executed by the SP21 tests. The scheduler checks every30seconds and creates
a point when the latest snapshot reaches30minutes; failed attempts are reported
without raw errors and retried by watch mode. Run one scheduler per source.
Status reports latest age/one-hour lag and incomplete/invalid counts. Monitor
the process and requires_attention/lagging; no external notification is sent.
Completed points older than30days expire under the real clock; exact30-day
boundary is retained. Corrupt/unpublished points require operator inspection.
Expiry touches only validated, authenticated point directories, not database,
business/financial history, live files or keys. Clock injection is a test-only
function parameter, not a production CLI option.

~~~powershell
.venv/Scripts/python.exe -m app.cli.backup restore --point <point-UUID>
~~~

Restore refuses a populated recovery schema unless the operator explicitly adds
--replace-recovery. It never accepts a database name/URL/path argument, --create,
arbitrary SQL, external archive or development target. Before DDL it re-resolves
kayrealestate_recovery independently from development/test/benchmark by cluster
and OID. Storage is fixed at backend/.local-data/files/recovery, with reparse/
escape guards. Matching code/locks and Alembic head, authenticated manifest and
all encrypted payload/hash checks precede replacement. A missing public schema
from an interrupted restore can safely be retried on the verified target.

Current source authority is checked under its write pause before opening:
bootstrap marker, existing staff/credential states and versions, current contact/
phone scope, collaborator grants, archives and scheduling policy must still match
the point. New unrelated records may be absent within measured RPO, but an old
grant cannot be silently revived. Changed/unavailable current authority returns
CURRENT_AUTHORITY_REVIEW_REQUIRED or a safe dependency failure and keeps recovery
closed. There is no blind offline-opening or automatic security-policy merge.
Choose a suitable newer point or obtain a separately approved security review.
This conservative opening gate is not a claim that total source loss was tested.

All restored table counts/digests must match before security reconciliation.
PostgreSQL restores and validates the original constraints; required object hashes
are rechecked before publication. All restored sessions are revoked, file permits
consumed, and mutable import/export permits cleared. Committed imports remain
wholly immutable; their issuing sessions are revoked. Running jobs lose their old
leases/fences and retry only within existing bounded attempts. Completed effects,
finance facts and approved import results are not replayed. Restored website
sources are disabled pending deliberate reconfiguration/rotation; queued receipts
invalidate safely, completed receipts remain permanent. File scans never promote
unscanned/quarantined bytes to clean. Temporary credential expiry is not extended.

The recovery-ready record appears only after all checks/reconciliation. It binds
target identity and code fingerprint; API/worker fail closed for an absent/stale
record. To inspect compatible source without altering the checkout:

~~~powershell
.venv/Scripts/python.exe -m app.cli.backup extract-code --point <point-UUID>
.venv/Scripts/python.exe -m app.cli.backup resume
~~~

extract-code writes only a new protected ZIP in .local-data/recovery/artifacts.
resume uses the selected environment; it is not an authentication/recovery bypass.
Never bootstrap another administrator over a restored completed installation.
Do not copy old cookies/permits or website secrets into a new active service.

## Restored-stack exercise and objectives

Launch the recovered API with --environment recovery on a separate loopback port
and point a separate local frontend at it. Use an isolated browser profile:
cookies are host-scoped, not port-scoped. Sign in freshly, check scoped dashboard/
contact/deal/project/unit/calendar, download a clean document, deny unscanned
bytes and copied private IDs, and verify old sessions/permits/bootstrap fail.
Do not expose this exercise as the original development service or a production
cutover. Source/test/recovery targets and storage remain separate.

The report separates snapshot age at incident(RPO), restore-phase seconds and the
full incident-to-browser-verification interval(RTO). A deliberately post-point
synthetic enquiry is absent after restoration; all pre-point table digests match.
Retained older points can be inspected/restored within30days, but rpo_objective_met
is false when age exceeds1hour; this must never be called a passing objective.
RTO target is4hours. No workload/clock is silently reduced.

[Execution and exact results](../03-planning/sprints/sp-21-execution.md) names the
actual Dell/CPU/RAM/Windows/PostgreSQL environment and synthetic volume. SP22 owns
cumulative acceptance and intended-volume performance/recovery. DPAPI depends on
this Windows account/profile: losing the laptop/profile or the protected key is
not independent offsite recovery. Real deployment, backup key escrow, cloud,
retention/privacy approval for real data and operational opening remain separate.

