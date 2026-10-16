import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { loadServer, serverEnvironment } from "./load-server.mjs";

function auth(upstream) {
  const calls = [], writes = [];
  const env = serverEnvironment({ FRONTEND_ORIGIN: "https://frontend.synthetic.invalid" });
  const jar = { get: () => ({ value: "synthetic-existing-session" }), set: (...args) => writes.push(args) };
  const facade = loadServer("src/lib/auth/facade.ts", { env, modules: {
    "next/headers": { cookies: async () => jar },
    "@/lib/api/facade": {
      ...loadServer("src/lib/api/facade.ts", { env }),
      upstreamRequest: async (...args) => { calls.push(args); return upstream; },
    },
  } });
  return { ...facade, calls, writes, origin: env.FRONTEND_ORIGIN };
}

test("foreign-origin login is denied before upstream or cookie writes", async () => {
  const { relayAuth, calls, writes } = auth({ status: 200, body: {} });
  const response = await relayAuth("auth/login", new Request("https://frontend.synthetic.invalid/api/v1/auth/login", {
    method: "POST", headers: { Origin: "https://foreign.synthetic.invalid", "Content-Type": "application/json" }, body: "{}",
  }), "synthetic-id");
  assert.equal(response.status, 403);
  assert.equal(calls.length + writes.length, 0);
});

test("login retains secure host-only cookie options without serializing the session token", async () => {
  const token = randomBytes(32).toString("base64url");
  const { relayAuth, calls, writes, origin } = auth({ status: 200, body: {
    session_token: token, expires_at: new Date(Date.now() + 3600000).toISOString(),
  } });
  const response = await relayAuth("auth/login", new Request(`${origin}/api/v1/auth/login`, {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ email: "synthetic@example.invalid", password: randomBytes(24).toString("hex") }),
  }), "synthetic-id");
  assert.equal(response.status, 200);
  assert.equal((await response.json()).signed_in, true);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  const [name, value, options] = writes[0];
  assert.equal(name, "__Host-kay_session");
  assert.ok(value === token);
  assert.equal(options.httpOnly && options.secure && options.sameSite === "lax" && options.path === "/", true);
  assert.equal(Object.hasOwn(options, "domain"), false);
  assert.equal(calls[0][2].token, undefined);
});

test("logout forwards the session, CSRF and exact origin and clears the secure cookie", async () => {
  const { relayAuth, calls, writes, origin } = auth({ status: 200, body: { signed_out: true } });
  const response = await relayAuth("auth/logout", new Request(`${origin}/api/v1/auth/logout`, {
    method: "POST", headers: { Origin: origin, "X-CSRF-Token": "synthetic-csrf" },
  }), "synthetic-id");
  assert.equal(response.status, 200);
  assert.ok(calls[0][2].token === "synthetic-existing-session");
  assert.ok(calls[0][2].csrf === "synthetic-csrf");
  assert.equal(calls[0][2].origin, origin);
  assert.equal(writes[0][2].maxAge, 0);
  assert.equal(writes[0][2].httpOnly && writes[0][2].secure, true);
});
