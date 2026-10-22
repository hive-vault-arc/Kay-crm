# Live updates implementation,2026-10-22

## Scope and isolation

Owner-approved WebSocket invalidations and opt-in Web Push implement the
[contract](../04-design/realtime.md). Work starts at integrated main de41d5c in
the separate managed worktree/branch codex/crm-live-updates. The owner's dirty
primary checkout is not reset, modified or incorporated.

All fixtures use a newly initialized loopback PostgreSQL18 cluster on55439,
separate test/benchmark identities, guarded cleanup and the existing exclusive
test lease. Database writers and browser supervision stay serial on the test
target. No real records, development migration, production migration, production
flag or deployment is changed by this implementation.

## Implemented

- Thirty-second, hash-stored, atomically consumed facade tickets; direct WSS
  first-frame authentication. Current identity, exact Origin, quotas and bounded
  frames/queues/waits preserve the existing revocable-session authority.
- Post-commit bounded publisher, one PostgreSQL listener/API process, current/
  former ownership audiences and private inbox recipients. Transport faults
  cannot undo business commits. No socket holds a database connection.
- Shared query-topic invalidation, debounce/in-flight coalescing, reconnect/
  focus/staggered reconciliation and retained pages. Dirty details defer live
  replacement, including responses racing with new input. Local versioned
  snapshots no longer mask later query data.
- Notification bell/inbox, opt-in push control, generic service worker and
  standalone manifest. Durable claims/retries/dedupe, current inbox scope,
  session expiry/revocation and visible presence across the user's sessions.
- Additive0031_realtime and default-off flags. Ordinary refresh controls hide
  only after authenticated readiness with the release flag; disconnect restores
  them. Retry/conflict/availability-review controls remain.

## Recorded checks

Fresh focused PostgreSQL realtime/capacity tests pass16/16: ticket replay,
concurrency/expiry, Origin/CSRF, revoked sockets, cross-process commit/rollback,
former/new-owner delivery without an outsider, hidden-tab quotas, genuine
payload encryption/decryption, expiry/revocation/foreground push suppression,
concurrent claims, retry and provider410 deactivation. Earlier combined auth/
work/foundation selection passes48/48. DB-independent regression passes262/262.
The final combined realtime/auth/work/foundation run passes51/51; additive
migration/legacy PDF/photo/commercial-stock reruns are recorded in the QA register.
Those final reruns pass31/31; the real scanner's six clean formats/controlled
rejection plus encryption check pass8/8. A stopped local scanner initially kept
a photo pending, as designed; starting the pinned isolated ClamAV service fixed
the prerequisite without changing product scan behavior. Guarded empty-schema
downgrade/upgrade and refusal with realtime state are tested; legacy lossy-
downgrade assertions now compare the unchanged integrated head rather than0030.
Frontend units pass80/80. Lint/types/build, Ruff/format/mypy and runtime audits
pass; mypy covers200 source modules. Both runtime audit closures have0 known
vulnerabilities. The existing nine npm dev-tool advisories retain their approved
temporary exception, not a claimed clean full audit. Next/eslint-config-next
move together16.4.0 to16.4.2 for the runtime advisory found during this work.
The final expanded Python audits found four inherited pypdf6.20.1 advisories;
the dependency is pinned to6.21.1, both locks are regenerated, PDF/unit tests
are rerun, and both direct hash-locked audits then report0 vulnerabilities.

Final compiled visible Chrome passes3/3 in2.9m, including the15-route desktop/
mobile smoke and actual API-stop/reconnect. Development-mode route smoke also
passes after fixing Strict Mode abandoned-ticket issuance.80 frontend units
include pending-ticket coalescing. No session quota is raised to hide that bug.

Visible Chrome WSS detail updates, colleague-edit draft preservation and390px
no-page-overflow pass. Real browser push opt-in/out and actual generic provider
delivery also pass, after leaving the CRM for the90-second presence delay.
Push uses a disposable persistent profile because Chrome's incognito contexts
do not support it. No user profile, real account, endpoint or credential is
captured. Final expanded route/reconnect results are in the QA register.

Populated Locust:100 distinct accounts,90 agents/9 managers/1 administrator,
200,000 contacts/enquiries,20,000 properties/deals,4 API processes,100 WSS,
15-second warm-up and60.397-second steady window.7,007 starts/completions/samples,
zero errors; unchanged weighted read/write mix and latency limits.

| Route | p95 ms | Limit ms |
|---|---:|---:|
| Contact detail |161.571|1,000|
| Contacts |238.034|1,000|
| Enquiries |350.968|1,000|
| Properties |210.526|1,000|
| Note write |194.510|1,000|
| Dashboard |495.097|2,000|

Observed:1,603 client invalidations,100 minimum sockets,0 unexpected disconnects,
0 observed listener reconnects,302.320ms maximum sampled listener lag,
4 LISTEN connections,34 total database connections and0 pending push jobs.
Lag/reconnect counters are process-local samples, not exhaustive every-process
telemetry; database counts and client disconnects cover the whole load run.
This is an API/write/socket benchmark, not100 full browser UIs refetching all
widgets. Ignored reports and synthetic browser images remain local.

## Release gates

Source is published as [draft PR24](https://github.com/hive-vault-arc/Kay-crm/pull/24),
not merged. The dc372df candidate passes actual automatic GitHub CI; full hosted
database/browser integration was dispatched separately. Follow-up changes and
their exact-commit checks are visible in that PR, not assumed passed from this
earlier CI result. Local final follow-up checks preserve fresh contact data,
route-scoped draft notices and disabled-feature rollback behavior.

Not production-enabled. Accessible DigitalOcean sessions require login; the
owner was asked to authenticate without sharing credentials. Do not merge or
hide production refresh controls before hosted WSS idle/reconnect, the actual
migration graph, proxy/runtime limits and secret provisioning pass. Other active
branches also define a0031 migration: inspect integration before target upgrades,
never stamp past an unknown head.

Hosted CI and complete manual integration remain distinct gates. The manual
workflow now includes real WSS/push after its existing serial browser suite.
Physical iOS/Home Screen, Safari/Firefox providers, OS notification-click
integration, full-product acceptance and Khalid's product/design review remain
pending. No local scoped check establishes those outcomes.
