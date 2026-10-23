import assert from "node:assert/strict";
import test from "node:test";
import { loadServer } from "./load-server.mjs";

const vocabulary = loadServer("src/features/contacts/qualification-contracts.ts");
const contacts = loadServer("src/features/contacts/contracts.ts", { modules: { "./qualification-contracts": vocabulary } });
const owners = loadServer("src/features/owners/contracts.ts", { modules: { "@/features/contacts/contracts": contacts } });
const id = "00000000-0000-4000-8000-000000000001";
const origin = "https://frontend.synthetic.invalid";
const empty = { items: [], page: 1, page_size: 20, total: 0, has_next: false, has_previous: false };

test("owner routes and portfolio contract are bounded", () => {
  assert.equal(contacts.contactRoute(`contacts/${id}/portfolio`, "GET"), true);
  assert.equal(contacts.contactRoute(`contacts/${id}/portfolio`, "POST"), false);
  assert.equal(owners.ownerPortfolioSchema.safeParse(empty).success, true);
  assert.equal(owners.ownerPortfolioQuerySchema.safeParse({ page_size: "51" }).success, false);
  assert.equal(owners.ownerPortfolioQuerySchema.safeParse({ status: "deleted" }).success, false);
  assert.equal(contacts.listQuerySchema.safeParse({ owner_directory: "true" }).success, true);
});

function facade(upstreamBody = empty) {
  const calls = [];
  const loaded = loadServer("src/features/contacts/facade.ts", { modules: {
    "next/headers": { cookies: async () => ({ get: () => ({ value: "synthetic-session" }) }) },
    "@/lib/auth/facade": { boundedJson: request => request.json(), frontendOrigin: () => origin },
    "@/lib/auth/contracts": { SESSION_COOKIE: "synthetic-cookie" },
    "@/lib/api/facade": { facadeError: (status, code) => Response.json({ error: { code } }, { status }), upstreamRequest: async (...args) => { calls.push(args); return { status: 200, body: upstreamBody }; } },
    "@/lib/api/errors": { frenchApiError: code => code },
    "./contracts": contacts,
    "./ownership-contracts": {},
    "./qualification-contracts": vocabulary,
    "@/features/owners/contracts": owners,
  } });
  return { relay: loaded.relayContacts, calls };
}

test("owner portfolio facade forwards only validated scoped reads", async () => {
  const { relay, calls } = facade();
  const key = `contacts/${id}/portfolio`;
  const response = await relay(key, new Request(`${origin}/api/v1/${key}?status=past&page=2`), "synthetic-request");
  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], `/api/v1/${key}?status=past&page=2`);
  for (const path of [
    `${key}?status=missing`, `${key}?page_size=51`, `${key}?status=past&status=current`,
    `${key}?owner_directory=true`,
  ]) {
    const denied = await relay(key, new Request(`${origin}/api/v1/${path}`), "synthetic-request");
    assert.equal(denied.status, 422);
  }
  assert.equal(calls.length, 1);
  assert.equal((await relay("enquiries", new Request(`${origin}/api/v1/enquiries?owner_directory=true`), "synthetic-request")).status, 422);
});

test("unexpected private fields in portfolio fail closed", async () => {
  const { relay } = facade({ ...empty, phone: "+212600000001" });
  const response = await relay(`contacts/${id}/portfolio`, new Request(`${origin}/api/v1/contacts/${id}/portfolio`), "synthetic-request");
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, "DEPENDENCY_UNAVAILABLE");
});
