import assert from "node:assert/strict";
import test from "node:test";
import { loadServer } from "./load-server.mjs";

const vocabulary = loadServer("src/features/contacts/qualification-contracts.ts");
const contacts = loadServer("src/features/contacts/contracts.ts", { modules: { "./qualification-contracts": vocabulary } });
const contracts = loadServer("src/features/activities/contracts.ts", { modules: { "@/features/contacts/contracts": contacts } });
const id = "00000000-0000-4000-8000-000000000001";
const origin = "https://frontend.synthetic.invalid";
const body = { kind: "call", body: "Note synthétique", duration_minutes: 5, direction: "outbound", projects: ["Projet synthétique"] };

test("activity contracts allow only bounded explicit context and metadata", () => {
  assert.equal(contracts.newActivitySchema.safeParse(body).success, true);
  for (const patch of [{ body: " " }, { projects: ["A", "a"] }, { projects: ["A", "B", "C", "D"] }, { duration_minutes: true }, { duration_minutes: 0 }, { duration_minutes: 1.5 }, { direction: "sideways" }, { actor: id }, { occurred_at: "2020-01-01" }, { deal_id: id }])
    assert.equal(contracts.newActivitySchema.safeParse({ ...body, ...patch }).success, false);
  for (const [key, method, allowed] of [[`enquiries/${id}/activities`, "POST", true], [`deals/${id}/origin-activities`, "GET", true], [`enquiries/${id}/origin-activities`, "GET", false], [`deals/${id}/origin-activities`, "POST", false], [`deals/${id}/activities`, "PATCH", false], ["deals/private/activities", "GET", false]])
    assert.equal(contracts.activityRoute(key, method), allowed);
});

function facade(response = { status: 200, body: { id } }) {
  const calls = [];
  const { relayActivities: relay } = loadServer("src/features/activities/facade.ts", { modules: {
    "next/headers": { cookies: async () => ({ get: () => ({ value: "synthetic-session" }) }) },
    "@/lib/auth/facade": { boundedJson: request => request.json(), frontendOrigin: () => origin },
    "@/lib/auth/contracts": { SESSION_COOKIE: "synthetic-cookie" },
    "@/lib/api/facade": { facadeError: (status, code) => Response.json({ error: { code } }, { status }), upstreamRequest: async (...args) => { calls.push(args); return response; } },
    "./contracts": contracts,
  } });
  return { relay, calls };
}
function request(suffix = "", headers = {}, value = body) {
  return new Request(`${origin}/api/v1/enquiries/${id}/activities${suffix}`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json", "Idempotency-Key": id, "X-CSRF-Token": "synthetic-csrf", ...headers }, body: JSON.stringify(value) });
}

test("activity facade forwards current session, CSRF, origin and stable retry key", async () => {
  const { relay, calls } = facade();
  const result = await relay(`enquiries/${id}/activities`, request(), "synthetic-request");
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { id });
  assert.equal(calls[0][0], `/api/v1/enquiries/${id}/activities`);
  assert.deepEqual(JSON.parse(calls[0][2].body), body);
  assert.equal(calls[0][2].token, "synthetic-session");
  assert.equal(calls[0][2].csrf, "synthetic-csrf");
  assert.equal(calls[0][2].origin, origin);
  assert.equal(calls[0][2].idempotencyKey, id);
});

test("activity facade rejects foreign origin, invalid payload and ambiguous query before upstream", async () => {
  const { relay, calls } = facade();
  for (const [req, status] of [[request("", { Origin: "null" }), 403], [request("?page=1"), 422], [request("", { "Idempotency-Key": "bad" }), 422], [request("", {}, { ...body, actor: id }), 422]])
    assert.equal((await relay(`enquiries/${id}/activities`, req, "synthetic-request")).status, status);
  for (const query of ["?page=1&page=2", "?unknown=x", "?kind=private", "?page_size=101"])
    assert.equal((await relay(`deals/${id}/origin-activities`, new Request(`${origin}/api/v1/deals/${id}/origin-activities${query}`), "synthetic-request")).status, 422);
  assert.equal(calls.length, 0);
});

test("activity facade rejects malformed upstream history and hides unknown error codes", async () => {
  for (const response of [{ status: 200, body: { items: [] } }, { status: 500, body: { error: { code: "PRIVATE_DATABASE_DETAIL" } } }]) {
    const { relay } = facade(response);
    const result = await relay(`deals/${id}/activities`, new Request(`${origin}/api/v1/deals/${id}/activities`), "synthetic-request");
    assert.equal(result.status, 503);
    assert.equal((await result.json()).error.code, "DEPENDENCY_UNAVAILABLE");
  }
});
