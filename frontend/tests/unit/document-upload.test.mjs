import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { componentHarness } from "./entry-fixtures.mjs";
import { loadServer } from "./load-server.mjs";

const jsx = (type, props, key) => ({ type, props, key }), runtime = { jsx, jsxs: jsx, Fragment: "Fragment" };
const contracts = loadServer("src/features/files/contracts.ts");
class ApiError extends Error { constructor(code, status) { super(code); Object.assign(this, { code, status }); } }
function find(node, type) { if (!node || typeof node !== "object") return []; if (Array.isArray(node)) return node.flatMap(value => find(value, type)); return [...(node.type === type ? [node] : []), ...find(node.props?.children, type)]; }

function fixture({ metadata, bytes, read } = {}) {
  const h = componentHarness(), calls = [], cancellations = [], receipts = new Map(), actorId = randomUUID(), parentId = randomUUID(); let current;
  let identity = { user: { id: actorId, role: "manager" }, must_change_password: false };
  const list = { items: [], total: 0, page: 1, page_size: 20, has_previous: false, has_next: false };
  class Element { isConnected = true; focus() {} }
  function commit(args) { if (receipts.has(args[3])) return receipts.get(args[3]); const body = args[1]; current = contracts.documentSchema.parse({ id: randomUUID(), filename: body.filename, mime_type: body.mime_type, size_bytes: body.size_bytes, purpose: "attachment", version: 1, archived: false, versions: [] }); receipts.set(args[3], current); return current; }
  const loaded = loadServer("src/features/files/file-panel.tsx", { globals: { AbortController, File, structuredClone, crypto: { randomUUID }, HTMLElement: Element, window: { document: { activeElement: new Element(), getElementById: () => ({}) } }, document: { getElementById: () => ({}) } }, modules: {
    react: h.react, "react/jsx-runtime": runtime, "next/image": { default: "Image" }, "@/components/icons": {}, "@/components/ui/button": { Button: "Button" },
    "@/components/ui/sheet": Object.fromEntries(["Sheet", "SheetContent", "SheetHeader", "SheetTitle", "SheetDescription"].map(name => [name, name]).concat([["useInSheet", () => false]])),
    "@/components/shared/file-picker": { FilePicker: "Picker", fileSizeLabel: value => String(value) }, "@/components/shared/unsaved-guard": { useUnsavedGuard: () => ({ request: run => cancellations.push(run), dialog: null }) },
    "@/components/ui/alert-dialog": Object.fromEntries(["AlertDialog", "AlertDialogCancel", "AlertDialogContent", "AlertDialogDescription", "AlertDialogTitle"].map(name => [name, name])),
    "@/components/shared/protected-file-state": { ProtectedFileState: "FileState" }, "@/features/contacts/record-states": { RecordError: "RecordError" }, "@/features/contacts/numbered-pages": { NumberedPages: "Pages" },
    "@/features/contacts/use-query": { useQuery: () => ({ value: list, refreshQuietly() { calls.push({ type: "refresh" }); } }) }, "@/hooks/use-hydrated": { useHydrated: () => true },
    "@/lib/auth/contracts": { meSchema: {} }, "@/lib/api/client": { ApiError, apiGet: async (path, schema, signal) => { calls.push({ type: "read", path, signal }); return path.endsWith("/auth/me") ? identity : schema.parse(read ? await read({ path, current, signal }) : current); } },
    "@/lib/api/command": { apiCommand: async (...args) => { args[7]?.beforeDispatch?.(identity); args[6]?.throwIfAborted(); args[7]?.dispatched?.(); calls.push({ type: "metadata", args }); return args[2].parse(metadata ? await metadata({ args, commit: () => commit(args) }) : commit(args)); } },
    "./file-row": { FileRow: "FileRow" }, "./contracts": contracts, "./transfers": { requestFilePermit: async (body, signal, authorize) => { authorize?.(identity); calls.push({ type: "permit", body, signal }); const versionId = randomUUID(); current = { ...current, version: current.version + 1, versions: [{ id: versionId, state: "awaiting_upload", scan_error: null, created_at: "2026-10-29T12:00:00Z" }, ...current.versions] }; return { permit_id: randomUUID(), version_id: versionId, document_version: current.version, token: "synthetic-token", binding: "synthetic-binding", expires_at: "2026-10-29T12:02:00Z", transfer_url: "https://files.synthetic.invalid/api/v1/transfers/synthetic" }; }, uploadBytes: async (...args) => { calls.push({ type: "bytes", args }); const commit = () => { current = { ...current, versions: current.versions.map((value, index) => index ? value : { ...value, state: "pending_scan" }) }; }; if (bytes) await bytes({ args, commit }); else commit(); }, downloadBytes() {} },
  } });
  const props = { parentKind: "deal", parentId, writable: true, actorId, role: "manager" }, render = () => h.render(() => loaded.FilePanel(props)); render();
  return { ...h, props, calls, render, cancellations, identity: next => { identity = next; }, current: () => current, open() { find(render(), "Button").find(value => value.props.children === "Ajouter un document").props.onClick(); }, choose(value) { find(render(), "Picker")[0].props.choose(value); }, submit() { find(render(), "form")[0].props.onSubmit({ preventDefault() {} }); } };
}

test("Unknown document metadata keeps the original file/body/key and refuses replacement input", async () => {
  let fail = true; const s = fixture({ metadata: async ({ commit }) => { const value = commit(); if (fail) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return value; } });
  const original = new File([new Uint8Array(100)], "synthetic-original.pdf", { type: "application/pdf" }); s.open(); s.choose(original); s.submit(); await delay(0);
  assert.equal(find(s.render(), "Picker")[0].props.disabled, true);
  s.choose(new File([new Uint8Array(200)], "synthetic-replacement.pdf", { type: "application/pdf" })); fail = false; s.submit(); await delay(0);
  const metadata = s.calls.filter(value => value.type === "metadata"); assert.equal(metadata.length, 2); assert.equal(metadata[0].args[3], metadata[1].args[3]); assert.deepEqual(metadata[0].args[1], metadata[1].args[1]);
  assert.equal(s.calls.find(value => value.type === "bytes").args[1], original); s.dispose();
});

test("Disposing the document panel aborts pending metadata and refuses late private transfer or state updates", async () => {
  let release; const s = fixture({ metadata: ({ commit }) => new Promise(resolve => { release = () => resolve(commit()); }) }); s.open(); s.choose(new File([new Uint8Array(100)], "synthetic-late.pdf", { type: "application/pdf" })); s.submit(); await delay(0);
  s.dispose(); release(); await delay(0); const metadata = s.calls.find(value => value.type === "metadata");
  assert.equal(metadata.args[6]?.aborted, true); assert.equal(s.calls.some(value => ["permit", "bytes"].includes(value.type)), false); assert.equal(s.lateUpdates(), 0);
});

test("A published upload with a lost response completes from its exact current version without another metadata/grant/byte write", async () => {
  const s = fixture({ bytes: async ({ commit }) => { commit(); throw new ApiError("FILE_TRANSFER_INTERRUPTED", 503); } }); s.open(); s.choose(new File([new Uint8Array(100)], "synthetic-published.pdf", { type: "application/pdf" })); s.submit(); await delay(0);
  assert.equal(find(s.render(), "Sheet")[0].props.open, true); s.submit(); await delay(0);
  for (const type of ["metadata", "permit", "bytes"]) assert.equal(s.calls.filter(value => value.type === type).length, 1);
  assert.equal(find(s.render(), "Sheet")[0].props.open, false); assert.equal(s.current().versions[0].state, "pending_scan"); s.dispose();
});

test("Wrong metadata and changed actor responses cannot redirect an owned upload", async () => {
  let wrong = true; const s = fixture({ metadata: async ({ commit }) => { const value = commit(); return wrong ? { ...value, filename: "synthetic-wrong.pdf" } : value; } }); s.open(); s.choose(new File([new Uint8Array(100)], "synthetic-reviewed.pdf", { type: "application/pdf" })); s.submit(); await delay(0);
  assert.equal(s.calls.some(value => value.type === "permit"), false); assert.equal(find(s.render(), "Picker")[0].props.disabled, true); wrong = false; s.submit(); await delay(0); assert.equal(s.calls.filter(value => value.type === "metadata").length, 2); assert.equal(s.calls.filter(value => value.type === "bytes").length, 1); s.dispose();
  const actor = fixture({ metadata: async ({ commit }) => { commit(); throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } }); actor.open(); actor.choose(new File([new Uint8Array(100)], "synthetic-bound.pdf", { type: "application/pdf" })); actor.submit(); await delay(0);
  actor.identity({ user: { id: randomUUID(), role: "manager" }, must_change_password: false }); actor.submit(); await delay(0); assert.equal(actor.calls.filter(value => value.type === "metadata").length, 1); assert.equal(actor.calls.some(value => value.type === "permit"), false); assert.equal(find(actor.render(), "Picker").length, 0); actor.dispose();
  const opening = fixture(); opening.identity({ user: { id: randomUUID(), role: "manager" }, must_change_password: false }); opening.open(); opening.choose(new File([new Uint8Array(100)], "synthetic-opening-owner.pdf", { type: "application/pdf" })); opening.submit(); await delay(0); assert.equal(opening.calls.some(value => ["metadata", "permit"].includes(value.type)), false); assert.equal(find(opening.render(), "Picker").length, 0); opening.dispose();
});

test("A changed scoped document ID and current writability withdrawal stop private upload completion", async () => {
  const s = fixture({ bytes: async () => { throw new ApiError("FILE_TRANSFER_INTERRUPTED", 503); }, read: ({ current }) => ({ ...current, id: randomUUID() }) }); s.open(); s.choose(new File([new Uint8Array(100)], "synthetic-scope.pdf", { type: "application/pdf" })); s.submit(); await delay(0); s.submit(); await delay(0);
  assert.equal(s.calls.filter(value => value.type === "permit").length, 1); assert.equal(find(s.render(), "Picker").length, 0); s.dispose();
  let release; const withdrawn = fixture({ metadata: ({ commit }) => new Promise(resolve => { release = () => resolve(commit()); }) }); withdrawn.open(); withdrawn.choose(new File([new Uint8Array(100)], "synthetic-withdrawn.pdf", { type: "application/pdf" })); withdrawn.submit(); await delay(0); withdrawn.props.writable = false; withdrawn.render(); release(); await delay(0);
  assert.equal(withdrawn.calls.find(value => value.type === "metadata").args[6].aborted, true); assert.equal(withdrawn.calls.some(value => value.type === "permit"), false); assert.equal(find(withdrawn.render(), "Sheet")[0].props.open, false); assert.equal(find(withdrawn.render(), "Picker")[0].props.selected, undefined); withdrawn.dispose();
});

test("An explicit guarded discard clears an unknown upload before a different file operation can begin", async () => {
  let fail = true; const s = fixture({ metadata: async ({ commit }) => { const value = commit(); if (fail) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return value; } }); s.open(); s.choose(new File([new Uint8Array(100)], "synthetic-discarded.pdf", { type: "application/pdf" })); s.submit(); await delay(0);
  assert.equal(find(s.render(), "form")[0].props["data-write-recovery"], true); find(s.render(), "Sheet")[0].props.onOpenChange(false); assert.equal(find(s.render(), "Sheet")[0].props.open, true); s.cancellations[0](); assert.equal(find(s.render(), "Sheet")[0].props.open, false);
  fail = false; s.open(); s.choose(new File([new Uint8Array(200)], "synthetic-new-choice.pdf", { type: "application/pdf" })); s.submit(); await delay(0); const metadata = s.calls.filter(value => value.type === "metadata"); assert.notEqual(metadata[0].args[3], metadata[1].args[3]); assert.equal(metadata[1].args[1].filename, "synthetic-new-choice.pdf"); s.dispose();
});
