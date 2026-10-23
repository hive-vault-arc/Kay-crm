import assert from "node:assert/strict";
import test from "node:test";
import { loadServer } from "./load-server.mjs";

const { matchesTopics } = loadServer("src/features/realtime/query-topics.ts");
const { ticketSchema, pushBodySchema } = loadServer("src/features/realtime/contracts.ts");
const contracts = loadServer("src/features/realtime/contracts.ts");
const { currentRecord } = loadServer("src/features/realtime/current-record.ts");

test("authoritative same-version projections replace a local saved snapshot", () => {
  const saved = { id: "one", version: 2, relatedName: "old" };
  const remote = { id: "one", version: 2, relatedName: "current" };
  assert.equal(currentRecord(remote, saved, "one"), remote);
});
test("a newer committed snapshot survives an older in-flight read until reconciliation", () => {
  const local = { id: "one", version: 3 }, old = { id: "one", version: 2 }, latest = { id: "one", version: 4 };
  assert.equal(currentRecord(old, local, "one"), local);
  assert.equal(currentRecord(undefined, local, "one"), local);
  assert.equal(currentRecord(latest, local, "one"), latest);
});
test("route and canonical identities prevent stale local records masking a new target", () => {
  const old = { id: "old", version: 99 }, current = { id: "current", version: 1 };
  assert.equal(currentRecord(current, old, "current"), current);
  assert.equal(currentRecord(current, old, "old"), current);
  assert.equal(currentRecord(undefined, old, "current"), undefined);
});

test("live invalidations reach related views without refreshing unrelated finance", () => {
  assert.ok(matchesTopics("/api/v1/deals?page=3", ["contacts"]));
  assert.ok(matchesTopics("/api/v1/enquiries/example/activities", ["visits"]));
  assert.ok(matchesTopics("/api/v1/notifications", ["tasks"]));
  assert.ok(matchesTopics("/api/v1/reports/dashboard", ["reports"]));
  assert.equal(matchesTopics("/api/v1/properties", ["finance"]), false);
  assert.ok(matchesTopics("/api/v1/properties", ["identity"]));
});
test("live tickets and push bodies reject extra fields and malformed credentials", () => {
  assert.ok(ticketSchema.safeParse({ enabled: false }).success);
  assert.equal(ticketSchema.safeParse({ enabled: true, ticket: "bad", ws_url: "wss://example.test" }).success, false);
  assert.equal(pushBodySchema.safeParse({ operation: "subscribe", endpoint: "https://example.test", user_id: "other" }).success, false);
});

function facade(response, env = {}) {
  const calls = [];
  const route = loadServer("src/app/api/v1/realtime/[operation]/route.ts", { env, modules: {
    "next/headers": { cookies: async () => ({ get: () => ({ value: "synthetic-session" }) }) },
    "@/lib/auth/contracts": { SESSION_COOKIE: "synthetic-cookie" },
    "@/lib/auth/facade": { boundedJson: request => request.json(), frontendOrigin: () => "https://frontend.synthetic.invalid" },
    "@/features/realtime/contracts": contracts,
    "@/lib/api/facade": {
      facadeError: (status, code) => Response.json({ error: { code } }, { status }),
      upstreamRequest: async (...args) => { calls.push(args); return response; },
    },
  } });
  return { ...route, calls };
}
function request(origin = "https://frontend.synthetic.invalid", suffix = "", body = {}) {
  return new Request(`https://frontend.synthetic.invalid/api/v1/realtime/tickets${suffix}`, {
    method: "POST", headers: { Origin: origin, "X-CSRF-Token": "synthetic-csrf" }, body: JSON.stringify(body),
  });
}
const params = { params: Promise.resolve({ operation: "tickets" }) };
test("ticket facade keeps backend credentials server-side and derives only HTTPS WSS", async () => {
  const { POST, calls } = facade({ status: 200, body: { enabled: true, ticket: "x".repeat(43) } }, { API_BASE_URL: "https://api.synthetic.invalid" });
  const result = await POST(request(), params);
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { enabled: true, ticket: "x".repeat(43), ws_url: "wss://api.synthetic.invalid/api/v1/realtime/ws" });
  assert.equal(calls[0][2].token, "synthetic-session");
  assert.equal(calls[0][2].csrf, "synthetic-csrf");
  const insecure = facade({ status: 200, body: { enabled: true, ticket: "x".repeat(43) } }, { API_BASE_URL: "http://api.synthetic.invalid" });
  assert.equal((await insecure.POST(request(), params)).status, 503);
});
test("ticket facade rejects foreign origin, extra fields and query before upstream", async () => {
  const { POST, calls } = facade({ status: 200, body: { enabled: false } });
  assert.equal((await POST(request("https://evil.invalid"), params)).status, 403);
  assert.equal((await POST(request(undefined, "?ticket=bad"), params)).status, 422);
  assert.equal((await POST(request(undefined, "", { session: "not-allowed" }), params)).status, 422);
  assert.equal(calls.length, 0);
});

test("Strict Mode callers share one pending ticket but later connections get fresh proof", async () => {
  let calls = 0, release;
  const { requestTicket } = loadServer("src/features/realtime/ticket-request.ts", { modules: {
    "./contracts": contracts,
    "@/lib/api/command": { apiCommand: () => {
      calls++; return new Promise(resolve => { release = resolve; });
    } },
  } });
  const first = requestTicket("synthetic-first"), second = requestTicket("synthetic-remount");
  assert.equal(first, second); assert.equal(calls, 1);
  release({ enabled: false }); await first;
  const next = requestTicket("synthetic-reconnect");
  assert.equal(calls, 2); release({ enabled: false }); await next;
});
