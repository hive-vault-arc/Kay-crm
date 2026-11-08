import assert from "node:assert/strict";
import test from "node:test";
import { loadServer } from "./load-server.mjs";

const files = loadServer("src/features/files/contracts.ts");
test("photo upload capability is a response-only boolean and older responses remain valid", () => {
  const document = { id: "00000000-0000-4000-8000-000000000001", filename: "synthetic.webp", mime_type: "image/webp", purpose: "photo", size_bytes: 100, version: 1, archived: false, versions: [] };
  assert.equal(files.documentSchema.safeParse(document).success, true);
  for (const can_upload of [true, false]) assert.equal(files.documentSchema.parse({ ...document, can_upload }).can_upload, can_upload);
  assert.equal(files.documentSchema.safeParse({ ...document, can_upload: "true" }).success, false);
  assert.equal(files.documentSchema.safeParse({ ...document, created_by_user_id: document.id }).success, false);
  assert.equal(files.newDocumentSchema.safeParse({ parent_kind: "property", parent_id: document.id, filename: document.filename, mime_type: document.mime_type, size_bytes: 100, purpose: "photo", can_upload: true }).success, false);
});

test("file facade requests capabilities while accepting both old and new backend responses", async () => {
  for (const capability of [undefined, false, true]) {
    const document = { id: "00000000-0000-4000-8000-000000000001", filename: "synthetic.webp", mime_type: "image/webp", purpose: "photo", size_bytes: 100, version: 1, archived: false, versions: [], ...(capability === undefined ? {} : { can_upload: capability }) };
    const calls = [];
    const { relayFiles } = loadServer("src/features/files/facade.ts", { modules: {
      "next/headers": { cookies: async () => ({ get: () => ({ value: "synthetic-session" }) }) },
      "@/lib/auth/facade": { frontendOrigin: () => "https://synthetic.invalid", boundedJson: request => request.json() },
      "@/lib/auth/contracts": { SESSION_COOKIE: "synthetic-cookie" },
      "@/lib/api/facade": { facadeError: status => new Response(null, { status }), upstreamRequest: async (...args) => { calls.push(args); return { status: 200, body: document }; } },
      "@/lib/api/errors": { frenchApiError: code => code },
      "./contracts": files,
    } });
    const response = await relayFiles(`documents/${document.id}`, new Request(`https://synthetic.invalid/api/v1/documents/${document.id}`), "synthetic-request");
    assert.equal(response.status, 200);
    assert.equal((await response.json()).can_upload, capability);
    assert.equal(calls[0][2].photoCapabilities, true);
    assert.equal(calls[0][2].token, "synthetic-session");
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
});

test("A current upload-owner guard runs before a file permit is issued, with its cancellation signal and own session proof", async () => {
  const calls = [], identity = { user: { id: "00000000-0000-4000-8000-000000000003", role: "manager" }, must_change_password: false, csrf_token: "synthetic-current-proof" };
  class ApiError extends Error { constructor(code, status) { super(code); Object.assign(this, { code, status }); } }
  const result = { permit_id: "00000000-0000-4000-8000-000000000004", version_id: "00000000-0000-4000-8000-000000000005", token: "a".repeat(43), document_version: 2, expires_at: "2026-10-29T12:02:00Z", transfer_url: "https://files.synthetic.invalid/api/v1/transfers/synthetic" };
  const service = loadServer("src/features/files/transfers.ts", { modules: { "@/lib/api/client": { ApiError, apiGet: async (...args) => { calls.push(args); return args[0].endsWith("/auth/me") ? identity : files.permitSchema.parse(result); } }, "@/lib/auth/contracts": { meSchema: {} }, "./contracts": files, "@/lib/api/request-signal": {} } });
  const body = { action: "upload", document_id: "00000000-0000-4000-8000-000000000001", expected_version: 1 }, controller = new AbortController();
  await assert.rejects(service.requestFilePermit(body, controller.signal, () => { throw new ApiError("FORBIDDEN", 403); }), { code: "FORBIDDEN" }); assert.equal(calls.some(value => value[0].endsWith("/files/permits")), false);
  const cancelled = new AbortController(); cancelled.abort(); await assert.rejects(service.requestFilePermit(body, cancelled.signal, () => { throw Error("Cancelled guard must not run"); })); assert.equal(calls.some(value => value[0].endsWith("/files/permits")), false);
  const permit = await service.requestFilePermit(body, controller.signal, value => assert.equal(value, identity)); assert.equal(permit.binding, identity.csrf_token);
  const sent = calls.find(value => value[0].endsWith("/files/permits")); assert.equal(sent[2], controller.signal); assert.equal(sent[3].body, body); assert.equal(sent[3].csrf, identity.csrf_token);
});
