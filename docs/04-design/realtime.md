# Live updates and browser notifications

Implementation branch: codex/crm-live-updates, based on main de41d5c.

## Protocol and authority

POST /api/v1/realtime/tickets is an ordinary staff-facade command with current
session, exact Origin and CSRF checks. The random ticket expires after 30 seconds,
is stored only as a SHA-256 digest, and is atomically consumed by the first WSS
authentication frame. Neither the URL nor a browser cookie contains that ticket.
The backend session token remains inside the Next.js facade.

The direct WSS route accepts only the configured frontend Origin, waits at most
five seconds for authentication, caps pending connections and session connections,
and rechecks current identity before each dispatch/heartbeat. Application messages
are bounded; the deployment must also enforce transport frame limits.
The websocket carries only topic invalidations and heartbeat frames. Existing
REST projections remain authoritative for every record, count and private field.
The websocket has no business mutation operation.

Committed ORM and bulk DML changes feed a bounded background publisher. Publication
uses PostgreSQL NOTIFY after the business commit, so a transport failure cannot
roll back a business command or report that its committed write failed. Each API
process has one dedicated LISTEN connection, independent of its five-connection
ordinary pool. Socket clients never retain a database connection.

Signals contain topic names only, without record IDs, names, counts or values.
Topic delivery excludes manager-only finance/import/export topics for agents.
Private-topic audiences resolve current contact ownership and collaboration,
including former owners/collaborators captured during the command. Notification
hints target their recipient. Shared inventory and safe calendar invalidations
remain team-wide. Transfers refresh both former and new viewers through their
current REST scope. No private record event is sent in the browser stream.

## Frontend behavior

One websocket is owned by the authenticated shell per tab. Related active queries
refetch after a short debounce, retaining current data, filters and numbered page.
Reconnect/focus and a staggered two-minute safety reconciliation recover missing
hints and changes caused by passage of time. Hidden tabs defer refetching.
Dirty forms/dialogs defer detail-record replacement and display a French notice;
lists and history remain eligible for updates. A successful command clears the
corresponding draft marker. Versioned local snapshots no longer permanently mask
newer query results.

Ordinary refresh controls are explicitly marked liveRefresh. They disappear only
after an authenticated websocket is ready AND the frontend was built with
NEXT_PUBLIC_KAY_REALTIME_RELEASED=1. Error retries and conflict/availability
review controls are retained. Keep this release flag off until hosted WSS gates
pass. The public website intake form is outside this feature.

## Opt-in push

The service worker handles push/click only and never caches CRM responses.
Agents opt in from the inbox. A generic notification opens /notifications,
where the existing workspace/session guard requires authentication.

Subscriptions are private, tied to a revocable seven-day staff session and
rechecked with current inbox scope immediately before sending. Only notifications
created after opt-in are eligible. The existing PostgreSQL worker dispatches
durable deliveries, waits 90 seconds to account for tab presence, skips foreground
sessions, and uses bounded leases/retries and per-notification/subscription dedupe.
Expired/revoked sessions cannot send. HTTP 404/410 disables obsolete subscriptions.
Browser display tags collapse duplicate deliveries after interrupted acknowledgments.
An alert already accepted by the external provider cannot be recalled at logout;
it can still arrive later, always without client data. Delivery remains best-effort.

Provider URLs accept HTTPS and an exact allowlist (FCM, Mozilla and Apple), never
credentials, alternate ports, fragments or redirects. Additional push providers
require a reviewed allowlist extension. Endpoints, encryption keys, VAPID secrets,
payloads and exception bodies must never be logged.

## Migration and rollout

0031_realtime adds tickets, tab presence, subscriptions and delivery bookkeeping.
It preserves business records. Apply only after inspecting the actual target and
the integrated migration graph: other active branches also add migrations.
An intentional downgrade is allowed only when all four new bookkeeping tables
are empty; otherwise it refuses without discarding subscriptions or deliveries.

Backend/worker flags default off:

- REALTIME_ENABLED=true enables publication, listener and ticket issuance.
- WEB_PUSH_ENABLED=true additionally requires VAPID_PRIVATE_KEY,
  VAPID_PUBLIC_KEY and VAPID_SUBJECT=mailto:an-operated-address.
- NEXT_PUBLIC_KAY_REALTIME_RELEASED=1 hides ordinary refresh controls after a
  successful socket authentication; build it only after hosted acceptance.

Deploy additive schema/backend/worker compatibility first with flags off.
Then verify real DigitalOcean WSS through the public hostname, idle connections,
reconnects, proxy frame limits and multiple API processes before enabling live
traffic. Verify Vercel's same-origin ticket facade and the browser's trusted TLS.
Enable push only after a consent/provider test and operational key provisioning.

The production API command must include the bounded websocket transport:
`./.heroku/python/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8080}" --no-access-log --ws wsproto --ws-max-size 512 --ws-max-queue 4`.
Keep proxy access logs free of query credentials and websocket payloads.

The final populated100-user/four-process benchmark passes:7,007/7,007 requests,
zero errors,100 minimum steady sockets, no unexpected disconnects,
ordinary p95 at most350.968ms and dashboard p95 495.097ms. Limits remain1,000ms/
2,000ms. Maximum sampled listener lag is302.320ms, with4 LISTEN connections and
34 total database connections including benchmark/maintenance connections.
Push backlog was zero; actual generic Chrome push delivery passes separately.

GET /api/v1/realtime/status is a facade-secret-protected, administrator-only
aggregate probe. It exposes connection/backlog counts and this API process's
listener lag/reconnect counters, never IDs or endpoints. It is not browser-relayed.
`python -m app.cli.realtime_status` supplies database-wide counts and oldest
due push-job age from the approved operator runtime.

Hosted WSS, actual migration-graph inspection and production VAPID provisioning
remain release gates. Keep production flags off and retain refresh controls
until those gates pass. See the [execution record](../03-planning/realtime-execution.md).

Sources: [OWASP WebSockets](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html),
[PostgreSQL NOTIFY](https://www.postgresql.org/docs/current/sql-notify.html),
[Next.js PWA](https://nextjs.org/docs/app/guides/progressive-web-apps),
[pywebpush](https://github.com/web-push-libs/pywebpush).
