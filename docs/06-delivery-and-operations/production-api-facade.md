# Server-only API facade: Vercel to DigitalOcean

2026-10-16. Owner-authorized production HTTPS repair and publication. The previous
transport required `localhost` and a local `API_CA_FILE` for every request, making
a correctly configured remote production API return a safe but unusable503.

## Deployment settings

Set these as server-only Vercel environment variables for the intended deployment:

| Variable | Value |
|---|---|
| `API_BASE_URL` | The actual DigitalOcean backend HTTPS origin, optionally ending in `/`, without `/api/v1`, credentials, query or fragment. |
| `FACADE_SECRET` | The same private secret configured for the API, at least32 characters. Never put it in source or a `NEXT_PUBLIC_` variable. |
| `FRONTEND_ORIGIN` | The exact HTTPS frontend origin authorized for writes; match the API configuration. Preview origins are not automatically trusted. |
| `API_CA_FILE` | Omit for the remote production API. It is only needed for the local loopback HTTPS workflow. |

Redeploy after updating Vercel configuration. No production URL, credentials,
trust roots, infrastructure or deployment setting is changed by this source task.

## Transport and security

- Remote HTTPS omits the `ca` option, retaining Node's normal trusted roots and
  hostname checks with explicit `rejectUnauthorized: true`. A stale local CA path
  is not read for remote requests. No global trust-store modification, insecure
  agent, custom hostname verifier or TLS-disable environment variable is added.
- Local `localhost`, `127.0.0.1` and IPv6 loopback HTTPS require the configured CA;
  localhost retains its IPv4 preference. This is independent of `NODE_ENV`, so the
  existing compiled local test/start workflow remains CA-verified.
- The base must still be a credential-free HTTPS origin. Request paths must stay
  under `/api/v1/` on that exact origin. Redirects are not followed; facade and
  session authority cannot be forwarded to an alternate request target.
- `server-only`, per-request headers, private no-store/error shaping, facade
  secret, secure HttpOnly host-only session cookie, origin checks, CSRF forwarding,
  JSON limits and request timeout remain. All backend authorization is unchanged.
  No UI, API contract, database, migration, permission or dependency change.

Node documents that an explicit `ca` replaces default trust, while omission uses
the defaults: [Node24 TLS](https://nodejs.org/download/release/v24.20.0/docs/api/tls.html).
The Vercel server-side skill informed conditional local I/O, request-local state
and keeping sensitive configuration outside server/client serialization.

## Actual verification

From `frontend/`:

```powershell
npm.cmd run test:unit
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
node scripts/scan-client-secrets.mjs
npm.cmd run security:check
```

Final units: **39 passed,0 skipped in857.52ms**. The harness compiles the actual
server TypeScript in memory; only Next's request-cookie context and selected
transport observations are substituted. Real TLS cases use disposable loopback
servers with synthetic DNS names and ephemeral OpenSSL-generated certificates.
The isolated test child alone uses a synthetic `NODE_EXTRA_CA_CERTS` root to
exercise the default-trust path without contacting any external endpoint or
installing a trust root. Untrusted certificates and wrong hostnames must fail.
OpenSSL is required for the test runner (system OpenSSL on Linux, Git's OpenSSL
fallback on Windows); absence fails the suite, not a skipped or passing test.
Generated keys/certificates are removed from a validated owned temporary path.

Coverage: remote unset/stale local CA, valid local CA, missing/wrong CA, malformed
origin and missing/short facade secret, target escapes, real TLS trust/name
failures, redirect non-following, malformed/oversized/interrupted replies and
timeout. Auth tests retain foreign-origin denial, cookie flags/session secrecy,
logout clearing and session/CSRF/origin forwarding. Backend CSRF/permission rules
are unchanged, not reimplemented by these tests.

Lint, typecheck and production build pass. Initial harness lint naming failure
was fixed without a rule exception. Secret scan: 4 roots,349 browser JS files,
0 configured facade/signing-secret occurrences. Runtime audit0; inherited full
audit9 uses only the owner's existing dev-only exception expiring2026-11-15.
No new package, lockfile or exception. Automatic frontend CI now runs these
DB-independent units; existing job count, aggregate and main protections remain.

Full database/browser integration is **not executed, not passed** for this patch;
it remains required on disposable synthetic targets before real customer data,
never production. This is not a live Vercel/DigitalOcean handshake/login or a
whole-product production certification. No local API/database/scanner is started.
Hosted candidate CI must pass before the protected-main merge.
