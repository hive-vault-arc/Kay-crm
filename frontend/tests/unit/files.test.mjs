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
