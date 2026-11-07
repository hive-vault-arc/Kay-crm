import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { componentHarness } from "./entry-fixtures.mjs";
import { loadServer } from "./load-server.mjs";

const jsx = (type, props, key) => ({ type, props, key }), runtime = { jsx, jsxs: jsx, Fragment: "Fragment" };
const files = loadServer("src/features/files/contracts.ts");
class ApiError extends Error { constructor(code, status) { super(code); Object.assign(this, { code, status }); } }
function find(node, type) { if (!node || typeof node !== "object") return []; if (Array.isArray(node)) return node.flatMap(value => find(value, type)); return [...(node.type === type ? [node] : []), ...find(node.props?.children, type)]; }
function fileRecord(changes = {}) { return files.documentSchema.parse({ id: randomUUID(), filename: "synthetic-row.png", mime_type: "image/png", size_bytes: 100, purpose: "attachment", version: 7, archived: false, versions: [{ id: randomUUID(), state: "clean", scan_error: null, created_at: "2026-10-30T12:00:00Z" }], ...changes }); }
function fixture({ source = fileRecord(), command, download, read, permit, refresh } = {}) {
  const h = componentHarness(), actorId = randomUUID(), parentId = randomUUID(), calls = [], urls = [], revoked = [], clicks = [], timers = new Map(), receipts = new Map(); let server = source, timerId = 0;
  let identity = { user: { id: actorId, role: "manager" }, must_change_password: false }, hydrated = true, commits = 0;
  const query = { value: { items: [source], total: 1, page: 1, page_size: 20, has_previous: false, has_next: false }, error: undefined, refreshQuietly() { calls.push({ type: "refresh" }); return refresh?.(); } };
  class Element { isConnected = true; focus() {} }
  function commit(args) { if (receipts.has(args[3])) { assert.equal(receipts.get(args[3]), JSON.stringify([args[0], args[1]])); return files.documentSchema.parse(server); } if (args[1].expected_version !== server.version) throw new ApiError("FILE_VERSION_CONFLICT", 409); const archive = args[0].endsWith("/archive"); server = { ...server, archived: archive || server.archived, version: server.version + 1, versions: archive ? server.versions : server.versions.map((value, index) => index ? value : { ...value, scan_error: null }) }; const value = files.documentSchema.parse(server); receipts.set(args[3], JSON.stringify([args[0], args[1]])); commits++; return value; }
  const modules = {
    react: { ...h.react, useCallback: run => run }, "react/jsx-runtime": runtime, "next/image": { default: "Image" }, "@/components/icons": {}, "@/components/ui/button": { Button: "Button" },
    "@/components/ui/sheet": Object.fromEntries(["Sheet", "SheetContent", "SheetHeader", "SheetTitle", "SheetDescription"].map(name => [name, name]).concat([["useInSheet", () => false]])),
    "@/components/shared/file-picker": { FilePicker: "Picker", fileSizeLabel: value => String(value) }, "@/components/shared/unsaved-guard": { useUnsavedGuard: () => ({ request: run => run(), dialog: null }) },
    "@/components/ui/alert-dialog": Object.fromEntries(["AlertDialog", "AlertDialogCancel", "AlertDialogContent", "AlertDialogDescription", "AlertDialogTitle"].map(name => [name, name])),
    "@/components/shared/protected-file-state": { ProtectedFileState: "FileState" }, "@/features/contacts/record-states": { RecordError: "RecordError" }, "@/features/contacts/numbered-pages": { NumberedPages: "Pages" },
    "@/features/contacts/use-query": { useQuery: () => query }, "@/hooks/use-hydrated": { useHydrated: () => hydrated }, "@/lib/auth/contracts": { meSchema: {} },
    "@/lib/api/client": { ApiError, apiGet: async (path, schema, signal) => { calls.push({ type: "read", path, signal }); return path.endsWith("/auth/me") ? identity : schema.parse(read ? await read({ path, signal, server }) : server); } },
    "@/lib/api/command": { apiCommand: async (...args) => { args[7]?.beforeDispatch?.(identity); args[6]?.throwIfAborted(); args[7]?.dispatched?.(); calls.push({ type: "command", args }); return args[2].parse(command ? await command({ args, commit: () => commit(args) }) : commit(args)); } },
    "./contracts": files, "./transfers": { requestFilePermit: async (body, signal, authorize) => { authorize?.(identity); calls.push({ type: "permit", body, signal }); const result = { permit_id: randomUUID(), version_id: body.version_id, document_version: body.expected_version, token: "synthetic-token", binding: "synthetic-binding", expires_at: "2026-10-30T12:02:00Z", transfer_url: "https://files.synthetic.invalid/api/v1/transfers/synthetic" }; return permit ? await permit({ body, signal, result }) : result; }, downloadBytes: async (permit, signal) => { calls.push({ type: "bytes", permit, signal }); return download ? download({ permit, signal }) : new Blob([new Uint8Array(source.size_bytes)], { type: source.mime_type }); }, uploadBytes() {} },
  };
  const globals = { AbortController, Blob, File, structuredClone, crypto: { randomUUID }, HTMLElement: Element, URL: { createObjectURL: blob => { const url = `blob:synthetic-${urls.length}`; urls.push({ url, blob }); return url; }, revokeObjectURL: url => revoked.push(url) }, setTimeout: run => { const id = ++timerId; timers.set(id, run); return id; }, clearTimeout: id => timers.delete(id), setInterval: () => 0, clearInterval() {}, window: { document: { activeElement: new Element(), getElementById: () => ({}), createElement: () => ({ click() { clicks.push(this); } }) } }, document: { getElementById: () => ({}) } };
  const actions = loadServer("src/features/files/use-file-row-actions.ts", { globals, modules }), row = loadServer("src/features/files/file-row.tsx", { globals, modules: { ...modules, "./use-file-row-actions": actions } });
  const loaded = loadServer("src/features/files/file-panel.tsx", { globals, modules: { ...modules, "./file-row": row, "./photo-conversion": loadServer("src/features/files/photo-conversion.ts", { modules: { "@/lib/api/client": { ApiError }, "./contracts": files } }) } }), props = { parentKind: "contact", parentId, actorId, role: "manager", writable: true }, render = () => h.render(() => loaded.FilePanel(props)); render();
  return { ...h, render, props, actorId, calls, urls, revoked, clicks, timers, source, query, commits: () => commits, identity: value => { identity = value; }, hydrated: value => { hydrated = value; }, server: () => server, setServer: value => { server = files.documentSchema.parse(value); }, serverVersion(value) { server = { ...server, version: value }; }, sync() { query.value = { ...query.value, items: server.archived ? [] : [server], total: server.archived ? 0 : 1 }; }, click(label) { const button = find(render(), "Button").find(node => node.props["aria-label"] === label || node.props.children === label); assert.ok(button, `Missing ${label}`); button.props.onClick(); } };
}

test("A disposed file row cannot hand a late private blob to preview or download", async () => {
  for (const preview of [false, true]) {
    let release; const s = fixture({ download: () => new Promise(resolve => { release = () => resolve(new Blob([new Uint8Array(100)], { type: "image/png" })); }) }); s.click(`${preview ? "Afficher" : "Télécharger"} ${s.source.filename}`); await delay(0); s.dispose(); release(); await delay(0);
    assert.equal(s.calls.find(value => value.type === "bytes").signal?.aborted, true); assert.equal(s.urls.length, 0); assert.equal(s.clicks.length, 0); assert.equal(s.lateUpdates(), 0);
  }
});

test("Archive recovery survives a newer list projection and later409 without changing its original body/key", async () => {
  let first = true; const s = fixture({ command: async () => { if (first) { first = false; throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } throw new ApiError("FILE_VERSION_CONFLICT", 409); } });
  s.click(`Archiver ${s.source.filename}`); s.click("Confirmer l’archivage"); await delay(0); s.serverVersion(8); s.sync(); const current = s.render();
  assert.equal(find(current, "AlertDialog")[0].props.open, true); assert.equal(find(current, "li")[0].props["data-write-recovery"], true);
  s.click("Réessayer la même opération"); await delay(0); const attempts = s.calls.filter(value => value.type === "command"); assert.equal(attempts.length, 2); assert.equal(attempts[0].args[3], attempts[1].args[3]); assert.equal(attempts[1].args[1].expected_version, 7); assert.equal(find(s.render(), "li")[0].props["data-write-recovery"], true); s.dispose();
});

test("An archived row stays available for an unknown receipt replay after it leaves the server page", async () => {
  let fail = true; const s = fixture({ command: async ({ commit }) => { const result = commit(); if (fail) { fail = false; throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } return result; } });
  s.click(`Archiver ${s.source.filename}`); s.click("Confirmer l’archivage"); await delay(0); s.sync(); assert.equal(find(s.render(), "li").length, 1); assert.equal(find(s.render(), "AlertDialog")[0].props.open, true);
  s.click("Réessayer la même opération"); await delay(0); assert.equal(s.commits(), 1); const attempts = s.calls.filter(value => value.type === "command"); assert.equal(attempts.length, 2); assert.equal(attempts[0].args[3], attempts[1].args[3]); assert.equal(find(s.render(), "li").length, 0); s.dispose();
});

test("Acknowledged archive retries only current read and original completion, retaining its portal until both finish", async () => {
  let readFails = true, parentFails = true; const s = fixture({ read: ({ server }) => { if (readFails) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return server; }, refresh: () => { if (parentFails) throw Error("Synthetic refresh failure"); } });
  s.click(`Archiver ${s.source.filename}`); s.click("Confirmer l’archivage"); await delay(0); s.sync(); assert.equal(find(s.render(), "li").length, 1);
  readFails = false; s.click("Actualiser le résultat"); await delay(0); assert.equal(find(s.render(), "AlertDialog")[0].props.open, true); assert.equal(find(s.render(), "li")[0].props["data-write-recovery"], true);
  parentFails = false; s.click("Actualiser le résultat"); await delay(0); assert.equal(s.calls.filter(value => value.type === "command").length, 1); assert.equal(s.commits(), 1); assert.equal(find(s.render(), "li").length, 0); s.dispose();
});

test("Analysis retry keeps its original operation after current scan status changes and never fabricates a clean verdict", async () => {
  const source = fileRecord({ versions: [{ id: randomUUID(), state: "pending_scan", scan_error: "ANTIVIRUS_UNAVAILABLE", created_at: "2026-10-30T12:00:00Z" }] }); let first = true;
  const s = fixture({ source, command: async ({ commit }) => { const result = commit(); if (first) { first = false; throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } return result; } });
  s.click(`Réessayer l’analyse de ${source.filename}`); await delay(0); s.sync(); assert.equal(find(s.render(), "li")[0].props["data-write-recovery"], true);
  s.click(`Réessayer l’analyse de ${source.filename}`); await delay(0); const commands = s.calls.filter(value => value.type === "command"); assert.equal(commands.length, 2); assert.equal(commands[0].args[3], commands[1].args[3]); assert.equal(commands[1].args[1].expected_version, 7); assert.equal(s.commits(), 1); assert.equal(s.server().versions[0].state, "pending_scan"); assert.equal(s.server().versions[0].scan_error, null); s.dispose();
});

test("Current list read failure cancels held bytes, retains its row and refuses stale or unhydrated delivery handlers", async () => {
  let release; const s = fixture({ download: () => new Promise(resolve => { release = () => resolve(new Blob([new Uint8Array(100)], { type: "image/png" })); }) });
  const stale = find(s.render(), "Button").find(value => value.props["aria-label"] === `Télécharger ${s.source.filename}`).props.onClick;
  s.hydrated(false); s.render(); stale(); await delay(0); assert.equal(s.calls.some(value => value.type === "permit"), false); s.hydrated(true); s.render(); s.click(`Télécharger ${s.source.filename}`); await delay(0);
  s.query.error = new ApiError("DEPENDENCY_UNAVAILABLE", 503); s.query.value = undefined; assert.equal(find(s.render(), "li").length, 1); stale(); release(); await delay(0);
  assert.equal(s.calls.filter(value => value.type === "permit").length, 1); assert.equal(s.calls.find(value => value.type === "bytes").signal.aborted, true); assert.equal(s.urls.length, 0); assert.equal(s.clicks.length, 0); s.dispose();
});

test("Current denial and a changed actor before permit or final handoff mask private rows and refuse browser URLs", async () => {
  const opening = fixture(); opening.identity({ user: { id: randomUUID(), role: "manager" }, must_change_password: false }); opening.click(`Télécharger ${opening.source.filename}`); await delay(0); assert.equal(opening.calls.some(value => value.type === "permit"), false); assert.equal(find(opening.render(), "li").length, 0); opening.dispose();
  let release; const s = fixture({ download: () => new Promise(resolve => { release = () => resolve(new Blob([new Uint8Array(100)], { type: "image/png" })); }) }); s.click(`Télécharger ${s.source.filename}`); await delay(0); s.identity({ user: { id: s.actorId, role: "agent" }, must_change_password: false }); release(); await delay(0); assert.equal(s.urls.length, 0); assert.equal(find(s.render(), "li").length, 0); s.dispose();
  let answer; const denied = fixture({ download: () => new Promise(resolve => { answer = () => resolve(new Blob([new Uint8Array(100)], { type: "image/png" })); }) }); denied.click(`Afficher ${denied.source.filename}`); await delay(0); denied.query.error = new ApiError("FORBIDDEN", 403); denied.query.value = undefined; denied.render(); answer(); await delay(0); assert.equal(denied.urls.length, 0); assert.equal(denied.calls.find(value => value.type === "bytes").signal.aborted, true); assert.equal(find(denied.render(), "li").length, 0); denied.dispose();
});

test("Foreign permits, malformed bytes and archived current documents cannot reach preview/download", async () => {
  for (const options of [{ permit: ({ result }) => ({ ...result, version_id: randomUUID() }) }, { download: () => new Blob([new Uint8Array(101)], { type: "image/png" }) }, { download: () => new Blob([new Uint8Array(100)], { type: "application/pdf" }) }, { read: ({ server }) => ({ ...server, archived: true, version: server.version + 1 }) }, { read: ({ server }) => ({ ...server, id: randomUUID() }) }]) {
    const s = fixture(options); s.click(`Afficher ${s.source.filename}`); await delay(0); assert.equal(s.urls.length, 0); assert.equal(s.clicks.length, 0); s.dispose();
  }
});

test("Authorized read-only files still download and preview; a lost readable context revokes only its active preview", async () => {
  const s = fixture(); s.props.writable = false; s.render(); s.click(`Télécharger ${s.source.filename}`); await delay(0); assert.equal(s.urls.length, 1); assert.equal(s.clicks.length, 1); for (const run of s.timers.values()) run(); assert.deepEqual(s.revoked, [s.urls[0].url]);
  s.click(`Afficher ${s.source.filename}`); await delay(0); assert.equal(s.urls.length, 2); assert.equal(find(s.render(), "Image")[0].props.src, s.urls[1].url);
  s.query.error = new ApiError("DEPENDENCY_UNAVAILABLE", 503); s.render(); assert.equal(find(s.render(), "Image").length, 0); assert.equal(s.revoked.filter(value => value === s.urls[1].url).length, 1); s.dispose();
});

test("A fresh analysis result retires an old in-progress error without inventing a new document version", async () => {
  const source = fileRecord({ versions: [{ id: randomUUID(), state: "pending_scan", scan_error: "ANTIVIRUS_UNAVAILABLE", created_at: "2026-10-30T12:00:00Z" }] }), s = fixture({ source, command: async () => { throw new ApiError("FILE_SCAN_IN_PROGRESS", 409); } });
  s.click(`Réessayer l’analyse de ${source.filename}`); await delay(0); assert.equal(find(s.render(), "p").some(value => value.props.role === "alert"), true);
  s.setServer({ ...source, versions: [{ ...source.versions[0], state: "clean", scan_error: null }] }); s.sync(); assert.equal(s.server().version, source.version); assert.equal(find(s.render(), "p").some(value => value.props.role === "alert"), false); assert.equal(s.calls.filter(value => value.type === "command").length, 1); s.dispose();
});
