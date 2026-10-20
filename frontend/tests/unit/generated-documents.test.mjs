import assert from "node:assert/strict";
import test from "node:test";
import { loadServer } from "./load-server.mjs";

const contracts = loadServer("src/features/generated/contracts.ts");
const id = "00000000-0000-4000-8000-000000000001";
const origin = "https://frontend.synthetic.invalid";
const body = { parent_kind: "enquiry", parent_id: id, template_code: "01", values: { client_name: "Client synthétique" } };
const item = { id, template_code: "01", filename: "KAY-01-12345678.pdf", size_bytes: 1024, version: 1, version_id: id, created_at: "2026-10-20T15:00:00+01:00" };

function facade(response = { status: 200, body: item }) {
  const calls = [];
  const { relayGenerated: relay } = loadServer("src/features/generated/facade.ts", { modules: {
    "next/headers": { cookies: async () => ({ get: () => ({ value: "synthetic-session" }) }) },
    "@/lib/auth/facade": { boundedJson: request => request.json(), frontendOrigin: () => origin },
    "@/lib/auth/contracts": { SESSION_COOKIE: "synthetic-cookie" },
    "@/lib/api/facade": { facadeError: (status, code) => Response.json({ error: { code } }, { status }), upstreamRequest: async (...args) => { calls.push(args); return response; } },
    "@/lib/api/errors": { frenchApiError: code => code },
    "./contracts": contracts,
  } });
  return { relay, calls };
}

function post(headers = {}, value = body, suffix = "") {
  return new Request(`${origin}/api/v1/generated-documents${suffix}`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json", "Idempotency-Key": id, "X-CSRF-Token": "synthetic-csrf", ...headers },
    body: JSON.stringify(value),
  });
}

test("generated document contracts reject unknown parents, fields and oversized values", () => {
  assert.equal(contracts.generateBodySchema.safeParse(body).success, true);
  for (const patch of [{ parent_kind: "contact" }, { template_code: "13" }, { actor: id }, { values: { note: "x".repeat(1001) } }])
    assert.equal(contracts.generateBodySchema.safeParse({ ...body, ...patch }).success, false);
});

test("generation forwards bounded body, session, CSRF and idempotency key", async () => {
  const { relay, calls } = facade();
  const result = await relay("generated-documents", post(), "synthetic-request");
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), item);
  assert.equal(calls[0][0], "/api/v1/generated-documents");
  assert.deepEqual(JSON.parse(calls[0][2].body), body);
  assert.equal(calls[0][2].token, "synthetic-session");
  assert.equal(calls[0][2].csrf, "synthetic-csrf");
  assert.equal(calls[0][2].idempotencyKey, id);
});

test("generated facade rejects foreign writes, ambiguous reads and malformed upstream data", async () => {
  const { relay, calls } = facade();
  for (const request of [post({ Origin: "null" }), post({ "Idempotency-Key": "bad" }), post({}, body, "?page=1"), post({}, { ...body, actor: id })])
    assert.notEqual((await relay("generated-documents", request, "synthetic-request")).status, 200);
  for (const suffix of [`?parent_kind=enquiry&parent_id=${id}&page=1&page=2`, `?parent_kind=contact&parent_id=${id}`, `?parent_kind=deal&parent_id=${id}&private=1`])
    assert.equal((await relay("generated-documents", new Request(`${origin}/api/v1/generated-documents${suffix}`), "synthetic-request")).status, 422);
  assert.equal(calls.length, 0);
  const malformed = facade({ status: 200, body: { ...item, unexpected: true } });
  assert.equal((await malformed.relay("generated-documents", post(), "synthetic-request")).status, 503);
});
