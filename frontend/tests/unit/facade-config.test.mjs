import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import test from "node:test";
import { loadServer, serverEnvironment } from "./load-server.mjs";

function transport(env) {
  const calls = [], files = [];
  const facade = loadServer("src/lib/api/facade.ts", { env, modules: {
    "node:fs/promises": { readFile: async file => { files.push(file); return Buffer.from("synthetic CA"); } },
    "node:https": { request: (url, options, callback) => {
      calls.push({ url, options });
      const outgoing = new EventEmitter();
      outgoing.end = () => queueMicrotask(() => {
        const incoming = new EventEmitter();
        incoming.statusCode = 200;
        callback(incoming);
        incoming.emit("data", Buffer.from('{"status":"ready"}'));
        incoming.emit("end"); outgoing.emit("close");
      });
      outgoing.destroy = error => { outgoing.emit("error", error); outgoing.emit("close"); };
      return outgoing;
    } },
  } });
  return { facade, calls, files };
}

for (const hostname of ["localhost", "127.0.0.1", "[::1]"]) {
  test(`local HTTPS ${hostname} requires its CA even in a compiled production build`, async () => {
    const { facade, calls, files } = transport(serverEnvironment({ API_BASE_URL: `https://${hostname}:8000`, NODE_ENV: "production" }));
    await assert.rejects(facade.upstreamRequest("/api/v1/health/ready", "synthetic-id"), /INVALID_SERVER_CONFIGURATION/);
    assert.equal(calls.length + files.length, 0);
  });
}

test("local HTTPS keeps explicit CA verification and localhost IPv4 resolution", async () => {
  const env = serverEnvironment({ API_BASE_URL: "https://localhost:8000", API_CA_FILE: "synthetic-local-ca.pem" });
  const { facade, calls, files } = transport(env);
  await facade.upstreamRequest("/api/v1/health/ready", "synthetic-id");
  assert.deepEqual(files, ["synthetic-local-ca.pem"]);
  assert.equal(calls[0].options.rejectUnauthorized, true);
  assert.equal(calls[0].options.family, 4);
  assert.ok(Buffer.isBuffer(calls[0].options.ca));
});

for (const staleFile of [undefined, "/nonexistent/stale-local-ca.pem"]) {
  test(`remote HTTPS uses default roots without local CA I/O (${staleFile ? "stale file" : "unset file"})`, async () => {
    const env = serverEnvironment({ API_CA_FILE: staleFile, NODE_ENV: "production" });
    const { facade, calls, files } = transport(env);
    await facade.upstreamRequest("/api/v1/contacts?page=2", "synthetic-id", {
      method: "PATCH", body: "{}", token: "synthetic-session", csrf: "synthetic-csrf",
      origin: "https://frontend.synthetic.invalid", idempotencyKey: "synthetic-key",
    });
    const { url, options } = calls[0];
    assert.equal(url.origin, "https://api.synthetic.invalid");
    assert.equal(url.pathname + url.search, "/api/v1/contacts?page=2");
    assert.equal(files.length, 0);
    assert.equal(Object.hasOwn(options, "ca"), false);
    assert.equal(Object.hasOwn(options, "family"), false);
    assert.equal(options.rejectUnauthorized, true);
    assert.equal(options.method, "PATCH");
    assert.ok(options.headers["X-Kay-Facade-Secret"] === env.FACADE_SECRET);
    assert.ok(options.headers["X-Kay-Session"] === "synthetic-session");
    assert.ok(options.headers["X-CSRF-Token"] === "synthetic-csrf");
    assert.equal(options.headers.Origin, "https://frontend.synthetic.invalid");
    assert.equal(options.headers["Idempotency-Key"], "synthetic-key");
  });
}

for (const [index, base] of ["", "private-marker", "http://api.synthetic.invalid", "https://api.synthetic.invalid/api/v1",
  "https://private-marker@api.synthetic.invalid", "https://user:private-marker@api.synthetic.invalid",
  "https://api.synthetic.invalid/?secret=private-marker", "https://api.synthetic.invalid/#private-marker"].entries()) {
  test(`invalid origin ${index + 1} is rejected without I/O or value-bearing diagnostics`, async () => {
    const { facade, calls, files } = transport(serverEnvironment({ API_BASE_URL: base }));
    await assert.rejects(facade.upstreamRequest("/api/v1/health/ready", "synthetic-id"), error => error.message === "INVALID_SERVER_CONFIGURATION");
    assert.equal(calls.length + files.length, 0);
    const response = await facade.relayHealth("/api/v1/health/ready", "synthetic-id");
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error.code, "DEPENDENCY_UNAVAILABLE");
  });
}

for (const secret of [undefined, "", "synthetic-short"]) {
  test("remote HTTPS still requires the server facade secret", async () => {
    const { facade, calls } = transport(serverEnvironment({ FACADE_SECRET: secret }));
    await assert.rejects(facade.upstreamRequest("/api/v1/auth/me", "synthetic-id"), /INVALID_SERVER_CONFIGURATION/);
    assert.equal(calls.length, 0);
  });
}

for (const target of ["https://elsewhere.invalid/api/v1/auth/me", "//elsewhere.invalid/api/v1/auth/me",
  "/\\elsewhere.invalid/api/v1/auth/me", "/api/v1/../../private", "/api/v1/%2e%2e/private", "/api/v1/auth/me#secret", "auth/me"]) {
  test("request targets cannot escape the configured API origin and prefix", async () => {
    const { facade, calls, files } = transport(serverEnvironment());
    await assert.rejects(facade.upstreamRequest(target, "synthetic-id"), /INVALID_UPSTREAM_TARGET/);
    assert.equal(calls.length + files.length, 0);
  });
}

test("facade source retains its server-only import and no public configuration prefix", () => {
  const source = readFileSync(new URL("../../src/lib/api/facade.ts", import.meta.url), "utf8");
  assert.match(source, /^import "server-only";/);
  assert.equal(source.includes("NEXT_PUBLIC_"), false);
  assert.equal(source.includes("rejectUnauthorized: false"), false);
});
