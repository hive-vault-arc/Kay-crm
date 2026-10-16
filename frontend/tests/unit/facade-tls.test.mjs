import assert from "node:assert/strict";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createServer, request } from "node:https";
import path from "node:path";
import test from "node:test";
import { loadServer, serverEnvironment } from "./load-server.mjs";

const certificates = process.env.KAY_FACADE_TEST_CERTS;
if (!certificates) throw new Error("RUN_NPM_TEST_UNIT_FOR_ISOLATED_TLS_FIXTURES");

async function server(t, handler, identity = "trusted") {
  const instance = createServer({
    cert: await readFile(path.join(certificates, `${identity}.pem`)),
    key: await readFile(path.join(certificates, `${identity}.key`)),
  }, handler);
  instance.listen(0, "127.0.0.1");
  await once(instance, "listening");
  t.after(() => new Promise(resolve => { instance.close(resolve); instance.closeAllConnections(); }));
  return instance.address().port;
}

function facadeFor(port, extra = {}, hostname = "api.synthetic.invalid") {
  const observed = [];
  const facade = loadServer("src/lib/api/facade.ts", {
    env: serverEnvironment({ API_BASE_URL: `https://${hostname}:${port}`, ...extra }),
    modules: { "node:https": { request: (url, options, callback) => {
      observed.push(options);
      // The requested hostname remains intact for SNI/verification; only synthetic DNS is mapped.
      return request(url, { ...options, agent: false, lookup: (host, opts, done) => {
        if (!["localhost", "api.synthetic.invalid", "wrong.synthetic.invalid"].includes(host))
          throw new Error("EXTERNAL_NETWORK_FORBIDDEN");
        if (opts.all) done(null, [{ address: "127.0.0.1", family: 4 }]);
        else done(null, "127.0.0.1", 4);
      } }, callback);
    } } },
  });
  return { facade, observed };
}

test("production-style HTTPS succeeds with default trust, no API_CA_FILE, and forwards facade headers", async t => {
  let received = false;
  const port = await server(t, (incoming, response) => {
    received = Boolean(incoming.headers["x-kay-facade-secret"]) && incoming.headers["x-request-id"] === "synthetic-id";
    response.end('{"status":"ready"}');
  });
  const { facade, observed } = facadeFor(port);
  const response = await facade.relayHealth("/api/v1/health/ready", "synthetic-id");
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, "ready");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(received, true);
  assert.equal(Object.hasOwn(observed[0], "ca"), false);
  assert.equal(observed[0].rejectUnauthorized, true);
});

test("local HTTPS accepts the explicit local CA", async t => {
  const port = await server(t, (incoming, response) => response.end('{"status":"live"}'), "untrusted");
  const { facade } = facadeFor(port, { API_CA_FILE: path.join(certificates, "untrusted.pem") }, "localhost");
  assert.equal((await facade.relayHealth("/api/v1/health/live", "synthetic-id")).status, 200);
});

for (const scenario of ["untrusted certificate", "wrong hostname", "wrong local CA", "missing local CA file"]) {
  test(`TLS remains fail-closed: ${scenario}`, async t => {
    let received = 0;
    const identity = scenario === "untrusted certificate" ? "untrusted" : "trusted";
    const port = await server(t, (incoming, response) => { received++; response.end('{"status":"ready"}'); }, identity);
    const local = scenario.includes("local");
    const { facade } = facadeFor(port, local ? {
      API_CA_FILE: path.join(certificates, scenario.startsWith("missing") ? "missing.pem" : "untrusted.pem"),
    } : {}, local ? "localhost" : scenario === "wrong hostname" ? "wrong.synthetic.invalid" : "api.synthetic.invalid");
    assert.equal((await facade.relayHealth("/api/v1/health/ready", "synthetic-id")).status, 503);
    assert.equal(received, 0);
  });
}

test("redirects are not followed or given a second credential-bearing request", async t => {
  let received = 0;
  const port = await server(t, (incoming, response) => {
    received++; response.writeHead(302, { Location: "https://elsewhere.invalid/api/v1/health/ready" });
    response.end('{"error":{"code":"REDIRECT"}}');
  });
  const { facade } = facadeFor(port);
  assert.equal((await facade.relayHealth("/api/v1/health/ready", "synthetic-id")).status, 503);
  assert.equal(received, 1);
});

for (const scenario of ["invalid JSON", "response limit", "timeout", "interrupted response"]) {
  test(`bounded upstream failures remain safe: ${scenario}`, async t => {
    const port = await server(t, (incoming, response) => {
      if (scenario === "timeout") return;
      if (scenario === "interrupted response") { response.writeHead(200, { "Content-Length": 1000 }); response.write("{"); response.destroy(); return; }
      response.end(scenario === "response limit" ? "x".repeat(2048) : "not JSON");
    });
    const { facade } = facadeFor(port);
    await assert.rejects(facade.upstreamRequest("/api/v1/health/ready", "synthetic-id", {
      timeoutMs: 100, maxResponseBytes: 1024,
    }));
  });
}
