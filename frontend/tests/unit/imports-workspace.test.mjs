import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { loadServer } from "./load-server.mjs";

const jsx = (type, props, key) => ({ type, props, key });
const runtime = { jsx, jsxs: jsx, Fragment: "Fragment" };
const plain = value => JSON.parse(JSON.stringify(value));
function nodes(node, type) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(child => nodes(child, type));
  return [...(node.type === type ? [node] : []), ...nodes(node.props?.children, type)];
}
function text(node) { return node == null || typeof node === "boolean" ? "" : Array.isArray(node) ? node.map(text).join(" ") : typeof node === "object" ? text(node.props?.children) : String(node); }
function expand(node) {
  if (!node || typeof node !== "object") return node;
  if (Array.isArray(node)) return node.map(expand);
  if (typeof node.type === "function") return expand(node.type(node.props));
  return { ...node, props: { ...node.props, children: expand(node.props?.children) } };
}
function hooks() {
  const slots = [], effects = []; let cursor = 0;
  return {
    react: {
      useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial; return [slots[i], next => { slots[i] = typeof next === "function" ? next(slots[i]) : next; }]; },
      useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
      useId: () => "synthetic-import-agent",
      useCallback(callback) { cursor++; return callback; },
      useEffect(run, deps) { const i = cursor++, previous = slots[i]; if (!previous || deps.some((value, index) => !Object.is(value, previous.deps[index]))) { const current = { deps }; slots[i] = current; effects.push(() => { previous?.cleanup?.(); current.cleanup = run(); }); } },
    },
    render(run) { cursor = 0; return run(); },
    flush() { effects.splice(0).forEach(run => run()); },
    dispose() { slots.forEach(slot => slot?.cleanup?.()); },
  };
}
class ApiError extends Error { constructor(code, status) { super(code); this.code = code; this.status = status; } }
const contracts = loadServer("src/features/imports/contracts.ts");
const reviewModule = loadServer("src/features/imports/approval-review.ts", { modules: { "./contracts": contracts } });
const batch = (changes = {}) => contracts.batchPageSchema.parse({ id: randomUUID(), filename: "contacts-synthetic.csv", size_bytes: 2048, state: "previewed", version: 2, file_hash: "a".repeat(64), preview_hash: "b".repeat(64), fallback_agent_id: null, counts: { eligible: 2, invalid: 0, skipped_existing: 1, committed: 0 }, result: null, created_at: "2026-10-20T15:00:00+01:00", items: [], page: 1, page_size: 25, total: 3, has_next: false, has_previous: false, ...changes });
const committed = source => ({ ...source, state: "committed", result: { batch_id: source.id, committed: 2, skipped_existing: 1, approved_at: "2026-10-20T15:02:00+01:00", approved_by_user_id: randomUUID() } });

function controller(command = async () => { throw new Error("Unexpected synthetic command"); }, initial = batch()) {
  const h = hooks(), calls = [], blocked = [], denied = [], drafts = [];
  let projection = initial, readError, refreshes = 0, uploadBusy = false;
  const blockedChanged = value => blocked.push(value), authorityDenied = failure => denied.push(failure);
  const loaded = loadServer("src/features/imports/use-import-review.ts", { modules: {
    react: h.react, "@/components/shared/dossier-form": { useDossierDraft: (...args) => drafts.push(args) },
    "@/features/contacts/use-query": { useQuery: () => ({ value: projection, error: readError, refresh: () => { refreshes++; projection = undefined; } }) },
    "@/lib/api/client": { ApiError }, "./approval-review": reviewModule, "./contracts": contracts,
    "./client": { importCommand: async (...args) => { calls.push(args); return command(...args); } },
  }, globals: { AbortController, crypto: { randomUUID } } });
  const render = () => { const result = h.render(() => loaded.useImportReview(initial.id, uploadBusy, blockedChanged, authorityDenied)); h.flush(); return result; };
  render(); render();
  return { render, calls, blocked, denied, drafts, dispose: h.dispose, change: next => { projection = next; }, fail: failure => { projection = undefined; readError = failure; }, upload: value => { uploadBusy = value; }, refreshes: () => refreshes };
}

test("Import approval freezes validated file/hash/fallback/counts and detects every changed preview", () => {
  const source = batch({ fallback_agent_id: randomUUID() }), snapshot = reviewModule.approvalReview(source);
  assert.ok(snapshot); assert.ok(reviewModule.sameApprovalReview(snapshot, source));
  source.counts.eligible = 7; assert.equal(snapshot.counts.eligible, 2); assert.equal(reviewModule.sameApprovalReview(snapshot, source), false);
  for (const change of [{ id: randomUUID() }, { version: 3 }, { file_hash: "c".repeat(64) }, { preview_hash: "d".repeat(64) }, { fallback_agent_id: null }, { state: "committed" }]) assert.equal(reviewModule.sameApprovalReview(snapshot, { ...source, counts: snapshot.counts, ...change }), false);
  for (const change of [{ state: "uploaded" }, { file_hash: null }, { preview_hash: null }, { counts: {} }, { counts: { ...source.counts, invalid: 1 } }]) assert.equal(reviewModule.approvalReview(batch(change)), undefined);
});

test("A changed live preview cannot silently replace the confirmed scope or create an approval request", async () => {
  const source = batch(), s = controller(undefined, source);
  s.render().openReview(); assert.equal(s.render().review.body.preview_hash, source.preview_hash);
  s.change({ ...source, version: 3, preview_hash: "c".repeat(64) });
  assert.equal(s.render().staleReview, true); await s.render().approve(); assert.equal(s.calls.length, 0);
  s.render().closeReview(); s.render().openReview(); assert.equal(s.render().review.version, 3);
});

test("Unknown approvals lock uploads/mapping/page changes and retry the exact key/body despite a missing live hash", async () => {
  const source = batch(); let fail = true, resolve;
  const s = controller(async () => { if (fail) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return new Promise(done => { resolve = done; }); }, source);
  s.render().openReview(); await s.render().approve(); assert.equal(s.render().uncertain, true); assert.equal(s.blocked.at(-1), true);
  s.render().changeFallback(randomUUID()); s.render().changeRow(3, randomUUID()); s.render().changePage(2); await s.render().preview();
  assert.equal(s.render().fallback, ""); assert.deepEqual(plain(s.render().overrides), {}); assert.equal(s.render().page, 1); assert.equal(s.calls.length, 1);
  s.change({ ...source, state: "repreview_required", preview_hash: null, version: 4 }); fail = false;
  const current = s.render(), retry = current.approve(); current.approve(); await delay(0);
  assert.equal(s.calls.length, 2); assert.equal(s.calls[0][3], s.calls[1][3]); assert.deepEqual(plain(s.calls[0][1]), plain(s.calls[1][1]));
  resolve(committed(source)); await retry; assert.equal(s.render().uncertain, false); assert.equal(s.blocked.at(-1), false);
});

test("Pending mapping changes require preview, send true logical row identities and release the managed draft only after success", async () => {
  const source = batch(), agent = randomUUID(), s = controller(async (path, body) => ({ ...source, fallback_agent_id: body.fallback_agent_id, version: 3 }), source);
  s.render().changeFallback(agent); s.render().changeRow(50001, agent); s.render().changeRow(3, null);
  const dirty = s.render(); assert.equal(dirty.dirty, true); assert.equal(dirty.canApprove, false); dirty.changePage(2); dirty.openReview();
  assert.equal(s.render().page, 1); assert.equal(s.render().review, undefined);
  await s.render().preview(); assert.deepEqual(plain(s.calls[0][1]), { fallback_agent_id: agent, row_agents: [{ row_number: 3, agent_id: null }, { row_number: 50001, agent_id: agent }] });
  s.change({ ...source, fallback_agent_id: agent, version: 3 }); assert.equal(s.render().dirty, false); assert.deepEqual(plain(s.render().overrides), {});
  s.render().changePage(2); assert.equal(s.render().page, 2); assert.ok(s.drafts.some(([dirty]) => dirty));
});

test("Definitive conflicts require current reread; malformed approval results remain unknown; denied reads and commands reach the privacy boundary", async () => {
  const source = batch();
  const conflict = controller(async () => { throw new ApiError("IMPORT_REPREVIEW_REQUIRED", 409); }, source);
  conflict.render().openReview(); await conflict.render().approve(); assert.equal(conflict.render().uncertain, false); assert.equal(conflict.refreshes(), 1);
  const invalid = controller(async () => source, source); invalid.render().openReview(); await invalid.render().approve(); assert.equal(invalid.render().uncertain, true);
  const denied = controller(async () => { throw new ApiError("FORBIDDEN", 403); }, source); denied.render().openReview(); await denied.render().approve(); assert.equal(denied.denied[0].status, 403);
  const read = controller(undefined, source); read.fail(new ApiError("NOT_FOUND", 404)); read.render(); assert.equal(read.denied[0].status, 404);
  const pending = controller(async () => new Promise(() => {}), source); pending.render().openReview(); pending.render().approve(); await delay(0); const signal = pending.calls[0][4]; pending.dispose(); assert.equal(signal.aborted, true);
});

test("A current committed read resolves an interrupted approval and never permits another approval or preview", async () => {
  const source = batch(), s = controller(async () => { throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); }, source);
  s.render().openReview(); await s.render().approve(); s.change(committed(source)); s.render();
  const current = s.render(); assert.equal(current.uncertain, false); assert.equal(current.committed, true); assert.equal(current.canApprove, false); assert.equal(s.blocked.at(-1), false);
  await current.approve(); await current.preview(); assert.equal(s.calls.length, 1);
});

test("The batch report keeps actions above rows, hides stale counts during approval and renders frozen confirmation effects", () => {
  const source = batch(), h = hooks();
  let model = { data: source, counts: { success: true, data: source.counts }, operation: "preview", canPreview: true, canApprove: true, fallback: "", overrides: {}, page: 1, review: reviewModule.approvalReview(source) };
  const loaded = loadServer("src/features/imports/batch-review.tsx", { modules: {
    react: h.react, "react/jsx-runtime": runtime, "@/components/ui/badge": { Badge: "Badge" }, "@/components/ui/button": { Button: "Button" }, "@/components/ui/alert-dialog": Object.fromEntries(["AlertDialog", "AlertDialogCancel", "AlertDialogContent", "AlertDialogDescription", "AlertDialogTitle"].map(name => [name, name])),
    "@/components/shared/record-workspace": { RecordSection: "RecordSection" }, "@/components/shared/file-picker": { fileSizeLabel: () => "2 Ko" }, "@/features/contacts/agent-picker": { AgentPicker: "AgentPicker" }, "@/features/contacts/numbered-pages": { NumberedPages: "NumberedPages" }, "@/features/contacts/record-states": { RecordError: "RecordError" }, "@/lib/format": { formatInstant: value => value }, "./use-import-review": { useImportReview: () => model }, "./import-rows": { ImportRows: "ImportRows" },
  } });
  const render = () => h.render(() => loaded.BatchReview({ id: source.id, uploadBusy: false, blockedChanged() {}, authorityDenied() {} }));
  let view = render(); assert.equal(nodes(nodes(view, "RecordSection")[0].props.action, "Button").length, 3); assert.equal(nodes(view, "ImportRows").length, 1); assert.equal(nodes(view, "Badge").length, 4);
  model = { ...model, data: { ...source, counts: { ...source.counts, eligible: 999 } }, staleReview: true }; view = render();
  assert.ok(text(nodes(view, "AlertDialogDescription")[0]).includes("2 nouveau(x)")); assert.ok(!text(nodes(view, "AlertDialogDescription")[0]).includes("999"));
  assert.equal(nodes(view, "Button").find(button => text(button) === "Confirmer l’import").props.disabled, true);
  for (const pending of [{ uncertain: true }, { uncertain: false, busy: true, operation: "approval" }]) { model = { ...model, ...pending }; view = render(); assert.equal(nodes(view, "ImportRows").length, 0); assert.equal(nodes(view, "Badge").length, 0); assert.equal(nodes(view, "AgentPicker").length, 0); assert.ok(text(view).includes("aucun résultat définitif")); }
});

function row(changes = {}) { return contracts.rowSchema.parse({ row_number: 3, values: { name: "Synthetic quoted\nCSV contact", primary_phone: "+212600111001", other_phones: "+33612345678", primary_email: "synthetic@example.invalid", other_emails: "other@example.invalid", roles: "buyer|tenant", agent_email: "agent@example.invalid", notes: "Synthetic CSV note" }, values_truncated: true, status: "eligible", errors: [], agent_id: randomUUID(), agent_name: "Synthetic agent", contact_id: null, ...changes }); }
function rowSetup() {
  const h = hooks(), loaded = loadServer("src/features/imports/import-rows.tsx", { modules: { react: h.react, "react/jsx-runtime": runtime, "next/link": { default: "Link" }, "@/components/icons": { FileIcon: "FileIcon" }, "@/components/ui/badge": { Badge: "Badge" }, "@/components/ui/button": { Button: "Button" }, "@/components/ui/sheet": { Sheet: "Sheet", SheetContent: "SheetContent", SheetDescription: "SheetDescription", SheetHeader: "SheetHeader", SheetTitle: "SheetTitle" }, "@/components/shared/data-table": { DataTable: "DataTable" }, "@/components/shared/record-entry": { RecordEntry: "RecordEntry" }, "@/features/contacts/agent-picker": { AgentPicker: "AgentPicker" }, "./contracts": contracts } });
  return props => h.render(() => loaded.ImportRows(props));
}
test("Import rows use exact logical identity, disclose all eight CSV fields, preserve provenance links and share compact mobile cards", () => {
  const value = row({ contact_id: randomUUID(), status: "committed" }), render = rowSetup(), view = render({ rows: [value], editable: false, overrides: {}, change() {}, authorityDenied() {} });
  const table = nodes(view, "DataTable")[0].props; assert.equal(table.getRowId(value), "3"); assert.deepEqual(plain(table.columns.map(column => column.header)), ["Ligne", "Contact", "Agent", "État"]);
  const desktop = expand(table.columns[1].cell({ row: { original: value } })), card = expand(table.mobileCard(value));
  for (const raw of Object.values(value.values)) { assert.ok(text(desktop).includes(raw)); assert.ok(text(card).includes(raw)); }
  assert.equal(nodes(card, "dt").length, 8); assert.ok(text(card).includes("Affichage abrégé"));
  const link = nodes(card, "Link")[0]; assert.equal(link.props.href, `/contacts/${value.contact_id}`); assert.equal(link.props.prefetch, false);
  assert.equal(nodes(view, "Sheet").length, 1); assert.equal(nodes(card, "Sheet").length, 0);
});

test("Skipped import rows cannot be assigned and the single agent drawer preserves the line number through selection/CSV reset", () => {
  const skipped = row({ status: "skipped_existing" }), value = row({ row_number: 50001 }), render = rowSetup(), changes = [], props = { rows: [skipped, value], editable: true, overrides: {}, change: (...args) => changes.push(args), authorityDenied() {} };
  const view = render(props), table = nodes(view, "DataTable")[0].props;
  assert.equal(nodes(expand(table.columns[2].cell({ row: { original: skipped } })), "Button").length, 0);
  nodes(expand(table.columns[2].cell({ row: { original: value } })), "Button")[0].props.onClick({ currentTarget: {} });
  const editor = render(props), picker = nodes(editor, "AgentPicker")[0], agent = randomUUID(); picker.props.change(agent); assert.deepEqual(changes[0], [50001, agent]);
  nodes(editor, "Button").find(button => text(button) === "Revenir au CSV").props.onClick(); assert.deepEqual(changes[1], [50001, null]); assert.equal(nodes(render(props), "Sheet")[0].props.open, false);
});

test("An agent lookup denial hides the previously selected name and reports lost authority without exposing cached options", () => {
  const h = hooks(), denied = [], selected = randomUUID(); let error;
  const loaded = loadServer("src/features/contacts/agent-picker.tsx", { modules: { react: h.react, "react/jsx-runtime": runtime, "@/components/ui/button": { Button: "Button" }, "@/components/ui/input": { Input: "Input" }, "@/components/ui/label": { Label: "Label" }, "@/components/ui/native-select": { NativeSelect: "NativeSelect" }, "./contracts": {}, "./use-query": { queryPath: () => "synthetic", useQuery: () => ({ value: error ? undefined : { items: [{ id: selected, display_name: "Private synthetic agent" }], total: 1 }, error, refresh() {} }) }, "./record-states": { RecordError: "RecordError" } } });
  const props = { value: selected, selectedLabel: "Private synthetic agent", change() {}, denied: failure => denied.push(failure) }, render = () => h.render(() => loaded.AgentPicker(props));
  assert.ok(text(render()).includes("Private synthetic agent")); h.flush(); error = new ApiError("FORBIDDEN", 403);
  const view = render(); h.flush(); assert.equal(nodes(view, "NativeSelect").length, 0); assert.ok(!text(view).includes("Private synthetic agent")); assert.equal(denied[0].status, 403);
});

function uploadSetup(overrides = {}) {
  const source = batch({ state: "uploaded" }), calls = [], transfers = [], identity = { csrf_token: "synthetic-session-proof" };
  const permit = { batch_id: source.id, token: "s".repeat(43), expires_at: "2026-10-20T15:02:00+01:00", transfer_url: `https://api.synthetic.invalid/api/v1/transfers/imports/${source.id}` };
  class Xhr {
    constructor() { this.upload = {}; this.headers = {}; transfers.push(this); }
    open(...args) { this.opened = args; }
    setRequestHeader(key, value) { this.headers[key] = value; }
    send(file) { this.file = file; this.status = 200; this.responseText = JSON.stringify({ batch_id: permit.batch_id, state: "uploaded" }); this.onload(); }
    abort() { this.onabort(); }
  }
  const apiGet = async (path, schema, signal, options) => {
    calls.push({ path, signal, options });
    const value = path.endsWith("/me") ? identity : path.endsWith("/upload-permit") ? { ...permit, ...overrides.permit } : path.includes("?") ? { ...source, ...overrides.batch } : source;
    return path.endsWith("/me") ? value : schema.parse(path === "/api/v1/imports" ? Object.fromEntries(Object.entries(value).filter(([name]) => !["items", "page", "page_size", "total", "has_next", "has_previous"].includes(name))) : value);
  };
  const loaded = loadServer("src/features/imports/client.ts", { modules: { "@/lib/api/client": { apiGet, ApiError }, "@/lib/auth/contracts": { meSchema: {} }, "@/features/files/transfers": { transferError: () => new ApiError("FILE_TRANSFER_INTERRUPTED", 503) }, "./contracts": contracts }, globals: { XMLHttpRequest: Xhr } });
  return { ...loaded, source, calls, transfers, file: { name: source.filename, size: source.size_bytes }, attempt: { key: randomUUID(), batchId: source.id } };
}
test("Private CSV upload rejects aborted/resumed foreign metadata and permits before sending any bytes", async () => {
  const stopped = uploadSetup(), abort = new AbortController(); abort.abort();
  await assert.rejects(stopped.uploadImport(stopped.file, stopped.attempt, () => {}, abort.signal), error => error.code === "FILE_TRANSFER_INTERRUPTED"); assert.equal(stopped.calls.length, 0);
  for (const override of [{ batch: { id: randomUUID() } }, { batch: { filename: "other-synthetic.csv" } }, { batch: { size_bytes: 99 } }, { permit: { batch_id: randomUUID() } }]) {
    const s = uploadSetup(override); s.source.state = "awaiting_upload";
    await assert.rejects(s.uploadImport(s.file, s.attempt, () => {}, new AbortController().signal), ApiError); assert.equal(s.transfers.length, 0);
  }
  const s = uploadSetup(); s.source.state = "awaiting_upload"; const signal = new AbortController().signal;
  assert.equal(await s.uploadImport(s.file, s.attempt, () => {}, signal), s.source.id);
  const transfer = s.transfers[0]; assert.equal(transfer.withCredentials, false); assert.deepEqual(transfer.opened, ["PUT", `https://api.synthetic.invalid/api/v1/transfers/imports/${s.source.id}`]);
  assert.deepEqual(transfer.headers, { "Content-Type": "text/csv", "X-File-Permit": "s".repeat(43), "X-File-Session": "synthetic-session-proof" }); assert.equal(transfer.file, s.file); assert.ok(s.calls.every(call => call.signal === signal));
});

test("New import metadata creation keeps its original key, sends only file metadata and propagates the abort signal throughout", async () => {
  const s = uploadSetup(), signal = new AbortController().signal; s.source.state = "awaiting_upload"; s.attempt.batchId = "";
  await s.uploadImport(s.file, s.attempt, () => {}, signal);
  const creation = s.calls.find(call => call.path === "/api/v1/imports");
  assert.deepEqual(plain(creation.options.body), { filename: s.file.name, size_bytes: s.file.size }); assert.equal(creation.options.key, s.attempt.key); assert.equal(creation.options.timeoutMs, 70000); assert.equal(s.attempt.batchId, s.source.id);
  assert.ok(s.calls.every(call => call.signal === signal)); assert.equal(s.transfers.length, 1);
});

test("Import facade preserves current-session/CSRF/key boundaries and rejects mismatched batch results or transfer targets", async () => {
  const source = batch(), calls = [], origin = "https://frontend.synthetic.invalid"; let upstream = { status: 200, body: source };
  const { relayImports } = loadServer("src/features/imports/facade.ts", { env: { API_BASE_URL: "https://api.synthetic.invalid" }, modules: { "./contracts": contracts, "next/headers": { cookies: async () => ({ get: () => ({ value: "synthetic-cookie" }) }) }, "@/lib/auth/contracts": { SESSION_COOKIE: "synthetic-session" }, "@/lib/auth/facade": { frontendOrigin: () => origin, boundedJson: request => request.json() }, "@/lib/api/facade": { facadeError: (status, code) => Response.json({ error: { code } }, { status }), upstreamRequest: async (...args) => { calls.push(args); return upstream; } } } });
  const key = randomUUID(), request = (action = "approve", body = { preview_hash: source.preview_hash }, headers = {}, query = "") => new Request(`${origin}/api/v1/imports/${source.id}/${action}${query}`, { method: "POST", headers: { Origin: origin, "Idempotency-Key": key, "X-CSRF-Token": "synthetic-proof", ...headers }, body: JSON.stringify(body) });
  upstream.body = contracts.batchSchema.parse(Object.fromEntries(Object.entries(source).filter(([name]) => !["items", "page", "page_size", "total", "has_next", "has_previous"].includes(name))));
  assert.equal((await relayImports(`imports/${source.id}/approve`, request(), "synthetic-request")).status, 200);
  assert.equal(calls[0][2].token, "synthetic-cookie"); assert.equal(calls[0][2].csrf, "synthetic-proof"); assert.equal(calls[0][2].idempotencyKey, key); assert.equal(calls[0][2].timeoutMs, 60000);
  for (const req of [request("approve", {}, {}), request("approve", { preview_hash: source.preview_hash }, { Origin: "https://foreign.synthetic.invalid" }), request("approve", { preview_hash: source.preview_hash }, { "Idempotency-Key": "invalid" }), request("approve", { preview_hash: source.preview_hash }, {}, "?page=2")]) { const before = calls.length; assert.notEqual((await relayImports(`imports/${source.id}/approve`, req, "id")).status, 200); assert.equal(calls.length, before); }
  const valid = upstream.body; upstream.body = { ...valid, id: randomUUID() }; assert.equal((await relayImports(`imports/${source.id}/approve`, request(), "id")).status, 503);
  upstream.body = { ...committed(valid), result: { ...committed(valid).result, batch_id: randomUUID() } }; assert.equal((await relayImports(`imports/${source.id}/approve`, request(), "id")).status, 503);
  for (const transfer_url of [`https://foreign.synthetic.invalid/api/v1/transfers/imports/${source.id}`, `https://api.synthetic.invalid/api/v1/transfers/imports/${randomUUID()}`, `https://api.synthetic.invalid/api/v1/transfers/imports/${source.id}?public=true`]) {
    upstream.body = { batch_id: source.id, token: "s".repeat(43), expires_at: "2026-10-20T15:02:00+01:00", transfer_url };
    assert.equal((await relayImports(`imports/${source.id}/upload-permit`, request("upload-permit", {}), "id")).status, 503);
  }
});

function composerSetup({ selected = randomUUID(), command } = {}) {
  const h = hooks(), uploads = [], commands = [], navigations = [], scopes = [], baseline = [];
  const source = batch({ id: selected }), loaded = loadServer("src/features/imports/import-panel.tsx", { modules: {
    react: h.react, "react/jsx-runtime": runtime, "next/link": { default: "Link" }, "next/navigation": { useRouter: () => ({ replace: (...args) => navigations.push(args) }) },
    "@/components/ui/button": { Button: "Button" }, "@/components/shared/file-picker": { FilePicker: "FilePicker" }, "@/components/shared/record-workspace": { RecordSection: "RecordSection" },
    "@/components/shared/dossier-form": { useDossierDraft: () => ({ dirty: false, accept: value => baseline.push(value) }) }, "@/components/shared/unsaved-guard": { useUnsavedGuard: () => ({ request: (run, scope) => { scopes.push(scope); run(); }, dialog: null }) },
    "@/features/contacts/agent-picker": { AgentPicker: "AgentPicker" }, "@/features/contacts/record-states": { RecordError: "RecordError" }, "@/lib/api/client": { ApiError }, "@/hooks/use-hydrated": { useHydrated: () => true },
    "./contracts": contracts, "./batch-review": { BatchReview: "BatchReview" }, "./client": { uploadImport: async (file, attempt, progress, signal) => { uploads.push({ file, attempt, signal }); attempt.batchId = selected; progress(100); return selected; }, importCommand: async (...args) => { commands.push(args); if (command) return command(...args); return source; } },
  }, globals: { AbortController, crypto: { randomUUID } } });
  const render = () => h.render(() => { const root = loaded.ImportPanel({ role: "manager", batchId: selected }); return root.type(root.props); });
  let view = render(); nodes(view, "div").find(node => node.props.ref).props.ref.current = { syntheticReviewScope: true }; h.flush();
  return { render, uploads, commands, navigations, scopes, baseline, source, deniedView: () => loaded.ImportPanel({ role: "agent", batchId: selected }), flush: h.flush };
}
test("The importer guards only existing review drafts, sends initial fallback, refreshes the same batch and blocks replacement during unknown approval", async () => {
  const s = composerSetup(), agent = randomUUID(); let view = s.render(); assert.equal(s.deniedView().type, "RecordError");
  nodes(view, "AgentPicker")[0].props.change(agent); nodes(view, "FilePicker")[0].props.choose({ name: "contacts-synthetic.csv", size: 2048, lastModified: 1 });
  view = s.render(); nodes(view, "form")[0].props.onSubmit({ preventDefault() {} }); await delay(0); view = s.render();
  assert.deepEqual(s.scopes, [{ syntheticReviewScope: true }]); assert.equal(s.commands[0][1].fallback_agent_id, agent); assert.equal(s.uploads.length, 1); assert.equal(s.navigations[0][0], `/leads?view=import&batch=${s.source.id}`);
  assert.equal(nodes(view, "FilePicker")[0].props.selected, undefined); assert.equal(nodes(view, "BatchReview")[0].key.endsWith(":1"), true);
  nodes(view, "BatchReview")[0].props.blockedChanged(true); const blocked = s.render(); assert.equal(nodes(blocked, "FilePicker")[0].props.disabled, true);
  nodes(blocked, "FilePicker")[0].props.choose({ name: "replacement.csv", size: 5 }); nodes(blocked, "form")[0].props.onSubmit({ preventDefault() {} }); await delay(0); assert.equal(s.uploads.length, 1);
});

test("Same-batch interrupted previews refresh the review; current denial removes the old file and report before a clean retry", async () => {
  const s = composerSetup({ command: async () => { throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } });
  nodes(s.render(), "FilePicker")[0].props.choose({ name: "contacts-synthetic.csv", size: 2048 }); nodes(s.render(), "form")[0].props.onSubmit({ preventDefault() {} }); await delay(0);
  let view = s.render(); assert.equal(nodes(view, "BatchReview")[0].key.endsWith(":1"), true); assert.ok(nodes(view, "FilePicker")[0].props.selected);
  nodes(view, "BatchReview")[0].props.authorityDenied(new ApiError("FORBIDDEN", 403)); view = s.render(); assert.equal(view.type, "RecordError"); assert.equal(nodes(view, "FilePicker").length, 0); assert.equal(nodes(view, "BatchReview").length, 0);
  view.props.retry(); view = s.render(); assert.equal(nodes(view, "FilePicker")[0].props.selected, undefined); assert.equal(nodes(view, "BatchReview")[0].key.endsWith(":2"), true);
});
