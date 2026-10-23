import assert from "node:assert/strict";
import test from "node:test";
import { loadServer } from "./load-server.mjs";

const id = "00000000-0000-4000-8000-000000000001";
const origin = "https://frontend.synthetic.invalid";
const contacts = loadServer("src/features/contacts/contracts.ts", {
  modules: { "./qualification-contracts": loadServer("src/features/contacts/qualification-contracts.ts") },
});
const contracts = loadServer("src/features/project-links/contracts.ts", {
  modules: { "@/features/contacts/contracts": contacts },
});

function facade(response = { status: 200, body: { id } }) {
  const calls = [];
  const { relayProjectLinks: relay } = loadServer("src/features/project-links/facade.ts", { modules: {
    "next/headers": { cookies: async () => ({ get: () => ({ value: "synthetic-session" }) }) },
    "@/lib/auth/facade": { boundedJson: request => request.json(), frontendOrigin: () => origin },
    "@/lib/auth/contracts": { SESSION_COOKIE: "synthetic-cookie" },
    "@/lib/api/facade": { facadeError: (status, code) => Response.json({ error: { code } }, { status }), upstreamRequest: async (...args) => { calls.push(args); return response; } },
    "./contracts": contracts,
  } });
  return { relay, calls };
}

function request(method, suffix = "", value = { kind: "visited", development_id: id }, headers = {}) {
  return new Request(`${origin}/api/v1/enquiries/${id}/project-links${suffix}`, {
    method, headers: { Origin: origin, "Content-Type": "application/json", "Idempotency-Key": id, "X-CSRF-Token": "synthetic-csrf", ...headers },
    body: method === "GET" ? undefined : JSON.stringify(value),
  });
}

test("project links require exactly one catalogue target and bounded numbered pages", () => {
  assert.equal(contracts.newProjectLinkSchema.safeParse({ kind: "visited", development_id: id }).success, true);
  for (const value of [{ kind: "visited" }, { kind: "visited", development_id: id, property_id: id }, { kind: "unknown", property_id: id }, { kind: "visited", external_name: "Private" }])
    assert.equal(contracts.newProjectLinkSchema.safeParse(value).success, false);
  assert.equal(contracts.projectLinkQuerySchema.safeParse({ kind: "discussed", page: "41", page_size: "25" }).success, true);
  assert.equal(contracts.projectLinkQuerySchema.safeParse({ kind: "discussed", page_size: "51" }).success, false);
});

test("project link facade forwards protected commands and denies ambiguous requests", async () => {
  const { relay, calls } = facade();
  const route = `enquiries/${id}/project-links`;
  assert.equal((await relay(route, request("POST"), "synthetic-request")).status, 200);
  assert.equal(calls[0][0], `/api/v1/${route}`);
  assert.equal(calls[0][2].token, "synthetic-session");
  assert.equal(calls[0][2].csrf, "synthetic-csrf");
  assert.equal(calls[0][2].origin, origin);
  assert.equal(calls[0][2].idempotencyKey, id);
  for (const [req, status] of [
    [request("POST", "", undefined, { Origin: "null" }), 403],
    [request("POST", "?kind=visited"), 422],
    [request("POST", "", { kind: "visited", development_id: id, property_id: id }), 422],
    [request("POST", "", { kind: "visited", development_id: id }, { "Idempotency-Key": "bad" }), 422],
    [request("GET", "?kind=visited&kind=discussed"), 422],
    [request("GET", "?kind=visited&unknown=x"), 422],
  ]) assert.equal((await relay(route, req, "synthetic-request")).status, status);
  assert.equal(calls.length, 1);
});

test("project link facade hides invalid upstream data and private error codes", async () => {
  for (const response of [{ status: 200, body: { items: [] } }, { status: 500, body: { error: { code: "PRIVATE_DATABASE_DETAIL" } } }]) {
    const { relay } = facade(response);
    const result = await relay(`enquiries/${id}/project-links`, request("GET", "?kind=visited"), "synthetic-request");
    assert.equal(result.status, 503);
    assert.equal((await result.json()).error.code, "DEPENDENCY_UNAVAILABLE");
  }
});
