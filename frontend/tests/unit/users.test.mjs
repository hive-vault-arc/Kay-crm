import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { loadServer } from "./load-server.mjs";

const contracts = loadServer("src/features/users/contracts.ts");
const id = "00000000-0000-4000-8000-000000000001";
const origin = "https://frontend.synthetic.invalid";
const named = { display_name: "Personnel synthétique", email: "staff@example.com", role: "agent" };
const password = randomBytes(24).toString("base64url");
const user = { ...named, id, version: 1, state: "active", must_change_password: true, temporary_expires_at: null, handoff_confirmed_at: null };

test("staff creation/reset accept chosen passwords, never profile edits or secret responses", () => {
  assert.equal(contracts.newUserSchema.safeParse({ ...named, temporary_password: password }).success, true);
  for (const temporary_password of ["", "short", " ".repeat(12), "x".repeat(1025)])
    assert.equal(contracts.newUserSchema.safeParse({ ...named, temporary_password }).success, false);
  assert.equal(contracts.newUserSchema.safeParse(named).success, false);
  assert.equal(contracts.resetUserSchema.safeParse({ expected_version: 1, admin_password: password, temporary_password: password }).success, true);
  assert.equal(contracts.editUserSchema.safeParse({ ...named, expected_version: 1, temporary_password: password }).success, false);
  assert.equal(contracts.commandSchema.safeParse({ user, temporary_password: password }).success, false);
  for (const [key, method, allowed] of [[`users/${id}`, "DELETE", true], [`users/${id}/reset-password`, "POST", true], [`users/${id}/disable`, "POST", false], [`users/${id}/confirm-handoff`, "POST", false], ["users", "DELETE", false]])
    assert.equal(contracts.userRoute(key, method), allowed);
});

function facade(response = { status: 200, body: { user } }) {
  const calls = [];
  const { relayUsers: relay } = loadServer("src/features/users/facade.ts", { modules: {
    "next/headers": { cookies: async () => ({ get: () => ({ value: "synthetic-session" }) }) },
    "@/lib/auth/facade": { boundedJson: request => request.json(), frontendOrigin: () => origin },
    "@/lib/auth/contracts": { SESSION_COOKIE: "synthetic-cookie" },
    "@/lib/api/facade": { facadeError: (status, code) => Response.json({ error: { code } }, { status }), upstreamRequest: async (...args) => { calls.push(args); return response; } },
    "./contracts": contracts,
  } });
  return { relay, calls };
}
function request(key, method, body, headers = {}) {
  return new Request(`${origin}/api/v1/${key}`, { method, headers: { Origin: origin, "Content-Type": "application/json", "Idempotency-Key": id, "X-CSRF-Token": "synthetic-csrf", ...headers }, body: JSON.stringify(body) });
}

test("staff facade DELETE relays proof/version, rejects ambiguous queries and removed actions", async () => {
  const { relay, calls } = facade();
  const result = await relay(`users/${id}`, request(`users/${id}`, "DELETE", { expected_version: 1 }), "request");
  assert.equal(result.status, 200);
  assert.equal(calls[0][2].method, "DELETE");
  assert.equal(calls[0][2].token, "synthetic-session");
  assert.equal(calls[0][2].csrf, "synthetic-csrf");
  assert.equal(calls[0][2].idempotencyKey, id);
  for (const [key, suffix, method, status] of [[`users/${id}`, "?extra=1", "DELETE", 422], [`users/${id}/confirm-handoff`, "", "POST", 404], [`users/${id}/disable`, "", "POST", 404]])
    assert.equal((await relay(key, request(key + suffix, method, { expected_version: 1 }), "request")).status, status);
  assert.equal((await relay(`users/${id}`, request(`users/${id}`, "DELETE", { expected_version: 1 }, { Origin: "null" }), "request")).status, 403);
  assert.equal(calls.length, 1);
});

test("staff facade rejects credential-bearing success and redacts unknown upstream errors", async () => {
  for (const response of [{ status: 200, body: { user, temporary_password: password } }, { status: 500, body: { error: { code: password } } }]) {
    const { relay } = facade(response);
    const result = await relay("users", request("users", "POST", { ...named, temporary_password: password }), "request");
    assert.equal(result.status, 503);
    assert.equal((await result.json()).error.code, "DEPENDENCY_UNAVAILABLE");
  }
});
