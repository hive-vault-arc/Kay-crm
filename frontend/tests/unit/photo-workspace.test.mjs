import assert from "node:assert/strict";
import test from "node:test";
import { File, Blob } from "node:buffer";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { loadServer } from "./load-server.mjs";

const jsx = (type, props, key) => ({ type, props, key }), runtime = { jsx, jsxs: jsx, Fragment: "Fragment" };
const plain = value => JSON.parse(JSON.stringify(value));
function find(node, type) { if (!node || typeof node !== "object") return []; if (Array.isArray(node)) return node.flatMap(child => find(child, type)); return [...(node.type === type ? [node] : []), ...find(node.props?.children, type)]; }
function text(node) { return node == null || typeof node === "boolean" ? "" : Array.isArray(node) ? node.map(text).join(" ") : typeof node === "object" ? text(node.props?.children) : String(node); }
function button(tree, label) { const node = find(tree, "Button").find(item => text(item) === label || item.props["aria-label"] === label); assert.ok(node, label); return node; }
class ApiError extends Error { constructor(code, status) { super(code); Object.assign(this, { code, status }); } }
const contracts = loadServer("src/features/files/contracts.ts");
const requestSignals = loadServer("src/lib/api/request-signal.ts", { globals: { AbortController } });
const previewKey = (id, version) => `${id}:${version}`;
const source = (name = "source.png", type = "image/png") => new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], name, { type, lastModified: 1 });
const photo = (changes = {}) => contracts.documentSchema.parse({ id: randomUUID(), filename: "source.webp", mime_type: "image/webp", purpose: "photo", size_bytes: 4, version: 3, archived: false, can_upload: true, versions: [], ...changes });
const version = state => ({ id: randomUUID(), state, scan_error: null, created_at: "2026-10-20T12:00:00Z" });

function model({ read, command, permit, upload, dimensions = [4000, 2000], canvas = true } = {}) {
  const calls = { reads: [], commands: [], permits: [], uploads: [], drawn: [], encodes: [], conversions: 0, closed: 0 }, stored = new Map();
  const apiGet = async (...args) => { calls.reads.push(args); return read ? read(...args) : stored.get(args[0].split("/").at(-1)); };
  const conversion = loadServer("src/features/files/photo-conversion.ts", { modules: { "@/lib/api/client": { ApiError }, "./contracts": contracts }, globals: { AbortController, File, Blob, createImageBitmap: async () => { calls.conversions++; return { width: dimensions[0], height: dimensions[1], close: () => calls.closed++ }; }, document: { createElement: () => ({ width: 0, height: 0, getContext() { return canvas ? { drawImage: (...args) => calls.drawn.push(args) } : null; }, toBlob(run, type, quality) { if (quality !== undefined) calls.encodes.push({ type, quality, width: this.width, height: this.height }); run(new Blob([new Uint8Array([1, 2, 3, 4])], { type })); } }) } } });
  const loaded = loadServer("src/features/files/photo-upload-model.ts", { modules: {
    "@/lib/api/client": { ApiError, apiGet }, "@/lib/api/command": { apiCommand: async (...args) => { calls.commands.push(args); if (command) return command(...args); const result = photo({ filename: args[1].filename, mime_type: args[1].mime_type, size_bytes: args[1].size_bytes }); stored.set(result.id, result); return result; } }, "./contracts": contracts, "./photo-conversion": conversion,
    "./transfers": { requestFilePermit: async (...args) => { calls.permits.push(args); return permit ? permit(...args) : { version_id: randomUUID() }; }, uploadBytes: async (...args) => { calls.uploads.push(args); if (upload) return upload(...args); } },
  }, globals: { crypto: { randomUUID } } });
  const parentId = randomUUID();
  const run = (attempt = loaded.newPhotoAttempt(), extra = {}) => loaded.sendPhoto({ attempt, file: source(), parentId, parentKind: "property", writable: true, signal: new AbortController().signal, progress() {}, phase() {}, reserved() {}, ...extra });
  return { ...loaded, ...conversion, calls, stored, run };
}

test("Selected photo conversion scales and sanitizes names while always releasing the decoded bitmap", async () => {
  const m = model(), converted = await m.convertPropertyPhoto(source("bad:name.png"));
  assert.equal(converted.name, "bad-name.webp"); assert.equal(converted.type, "image/webp"); assert.equal(m.calls.closed, 1);
  assert.deepEqual(plain(m.calls.encodes), [{ type: "image/webp", quality: 0.82, width: 2560, height: 1280 }]);
  for (const options of [{ dimensions: [0, 4] }, { dimensions: [6000, 5000] }, { canvas: false }]) { const bad = model(options); await assert.rejects(bad.convertPropertyPhoto(source()), error => error.code === "PHOTO_CONVERSION_FAILED"); assert.equal(bad.calls.closed, 1); }
  const invalid = model(); await assert.rejects(invalid.convertPropertyPhoto(source("bad.pdf", "image/png")), error => error.code === "UNSUPPORTED_MEDIA_TYPE"); assert.equal(invalid.calls.conversions, 0);
});

test("Photo writes use exact current metadata and fresh private permits for both parent kinds", async () => {
  for (const parentKind of ["property", "development"]) {
    const m = model(), parentId = randomUUID(), signal = new AbortController().signal, phases = []; let reservations = 0;
    const result = await m.run(undefined, { parentKind, parentId, signal, phase: value => phases.push(value), reserved: () => reservations++ });
    assert.deepEqual(plain(m.calls.commands[0][1]), { parent_kind: parentKind, parent_id: parentId, purpose: "photo", filename: "source.webp", mime_type: "image/webp", size_bytes: 4 });
    assert.equal(m.calls.commands[0][6], signal); assert.equal(m.calls.reads[0][0], `/api/v1/documents/${result.documentId}`); assert.equal(m.calls.reads[0][2], signal); assert.equal(m.calls.permits[0][1], signal); assert.equal(m.calls.uploads[0][3], signal);
    assert.equal(result.state, "pending_scan"); assert.equal(result.recovered, false); assert.ok(reservations >= 1); assert.deepEqual(phases, ["preparing", "authorizing", "uploading"]);
  }
});

test("Unknown metadata acknowledgement retries keep the same key and converted file, without accepting another source", async () => {
  let fail = true; const current = photo(), m = model({ command: async () => { if (fail) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return current; }, read: async () => current }), attempt = m.newPhotoAttempt(), file = source();
  await assert.rejects(m.run(attempt, { file }), error => error.code === "DEPENDENCY_UNAVAILABLE"); assert.equal(attempt.started, true); assert.equal(attempt.documentId, ""); fail = false;
  await m.run(attempt, { file }); assert.equal(m.calls.conversions, 1); assert.equal(m.calls.commands[0][3], m.calls.commands[1][3]); assert.deepEqual(plain(m.calls.commands[0][1]), plain(m.calls.commands[1][1]));
  await assert.rejects(m.run(attempt, { file: source() }), error => error.code === "FILE_SIZE_MISMATCH"); assert.equal(m.calls.commands.length, 2);
  await assert.rejects(m.run(attempt, { file, parentId: randomUUID() }), error => error.code === "INVALID_RESPONSE"); assert.equal(m.calls.commands.length, 2);
});

test("Lost transfer acknowledgement is recovered from current pending/clean/rejected state without another version", async () => {
  for (const state of ["pending_scan", "clean", "rejected"]) {
    const m = model({ upload: async () => { const current = [...m.stored.values()][0]; m.stored.set(current.id, { ...current, version: 4, versions: [version(state)] }); throw new ApiError("FILE_TRANSFER_INTERRUPTED", 503); } }), attempt = m.newPhotoAttempt(), file = source();
    await assert.rejects(m.run(attempt, { file })); const result = await m.run(attempt, { file });
    assert.equal(result.recovered, true); assert.equal(result.state, state); assert.equal(m.calls.commands.length, 1); assert.equal(m.calls.permits.length, 1); assert.equal(m.calls.uploads.length, 1);
  }
});

test("Current metadata binding, archive and upload capability prevail over stale role props", async () => {
  const resume = photo();
  for (const change of [{ id: randomUUID() }, { filename: "foreign.webp" }, { size_bytes: 8 }, { purpose: "attachment" }, { archived: true }, { can_upload: false }]) {
    const m = model({ read: async () => ({ ...resume, ...change }) }); await assert.rejects(m.run(undefined, { resume, writable: true })); assert.equal(m.calls.permits.length, 0); assert.equal(m.calls.uploads.length, 0);
  }
  const own = model({ read: async () => resume }); await own.run(undefined, { resume, writable: false }); assert.equal(own.calls.permits.length, 1);
  const missing = model({ read: async () => ({ ...resume, can_upload: undefined }) }); await assert.rejects(missing.run(undefined, { resume, writable: false }), error => error.code === "FORBIDDEN");
  const ownCreation = model({ command: async () => ({ ...resume, can_upload: undefined }), read: async () => ({ ...resume, can_upload: undefined }) }); await ownCreation.run(undefined, { writable: false }); assert.equal(ownCreation.calls.permits.length, 1);
});

test("Legacy photo resume preserves the original JPEG bytes and requires exact original metadata", async () => {
  const file = source("legacy.jpg", "image/jpeg"), resume = photo({ filename: file.name, mime_type: file.type, size_bytes: file.size, can_upload: undefined }), m = model({ read: async () => resume });
  await m.run(undefined, { file, resume }); assert.equal(m.calls.conversions, 0); assert.equal(m.calls.commands.length, 0); assert.equal(m.calls.uploads[0][1], file);
  const mismatch = model(); await assert.rejects(mismatch.run(undefined, { file: source("other.jpg", "image/jpeg"), resume }), error => error.code === "FILE_SIZE_MISMATCH"); assert.equal(mismatch.calls.reads.length, 0);
});

test("Photo cancellation stops before byte publication while preserving an already reserved document for retry", async () => {
  const abort = new AbortController(), current = photo(), m = model({ command: async () => { abort.abort(); return current; } }), attempt = m.newPhotoAttempt();
  await assert.rejects(m.run(attempt, { signal: abort.signal }), error => error.name === "AbortError"); assert.equal(attempt.documentId, current.id); assert.equal(attempt.started, true); assert.equal(m.calls.permits.length, 0); assert.equal(m.calls.uploads.length, 0);
  const cold = model(), stopped = new AbortController(); stopped.abort(); await assert.rejects(cold.run(undefined, { signal: stopped.signal })); assert.equal(cold.calls.conversions, 0);
});

test("Managed forms retain dirty markers across metadata commands; legacy forms still clear on success and signals propagate", async () => {
  for (const managed of [true, false]) {
    const calls = [], events = [], signal = new AbortController().signal, form = { dataset: { liveDirty: "true" }, hasAttribute: name => managed && name === "data-draft-managed" };
    const loaded = loadServer("src/lib/api/command.ts", { modules: { "./client": { apiGet: async (...args) => { calls.push(args); return args[0].endsWith("/me") ? { csrf_token: "synthetic-proof" } : { id: "synthetic" }; } }, "@/lib/auth/contracts": { meSchema: {} } }, globals: { document: { activeElement: { closest: () => form } }, window: { dispatchEvent: event => events.push(event.type) }, Event } });
    await loaded.apiCommand("/api/v1/documents", { filename: "synthetic.webp" }, {}, "synthetic-key", "POST", 123, signal);
    assert.equal(form.dataset.liveDirty, managed ? "true" : undefined); assert.equal(calls[0][2], signal); assert.equal(calls[1][2], signal); assert.equal(calls[1][3].csrf, "synthetic-proof"); assert.equal(calls[1][3].timeoutMs, 123); assert.deepEqual(events, ["kay:command-saved"]);
  }
});

function harness() {
  const slots = [], effects = []; let cursor = 0;
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial; return [slots[i], next => { slots[i] = typeof next === "function" ? next(slots[i]) : next; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; }, useId() { const i = cursor++; return slots[i] ??= `photo-${i}`; },
    useCallback(run, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((value, n) => !Object.is(value, old.deps[n]))) slots[i] = { deps, run }; return slots[i].run; },
    useEffect(run, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((value, n) => !Object.is(value, old.deps[n]))) { const current = { deps }; slots[i] = current; effects.push(() => { old?.cleanup?.(); current.cleanup = run(); }); } },
  };
  return { react, render(run) { cursor = 0; const view = run(); effects.splice(0).forEach(effect => effect()); return view; }, unmount() { slots.forEach(slot => slot?.cleanup?.()); } };
}
const shared = { "react/jsx-runtime": runtime, "@/components/icons": { RefreshIcon: "RefreshIcon", CameraIcon: "CameraIcon", ShowPasswordIcon: "Eye" }, "@/components/shared/file-picker": { FilePicker: "Picker", fileSizeLabel: value => String(value) }, "@/components/shared/record-workspace": { RecordSection: "Section" }, "@/components/ui/button": { Button: "Button" }, "@/features/contacts/record-states": { RecordError: "Error" }, "@/hooks/use-hydrated": { useHydrated: () => true }, "@/lib/api/client": { ApiError }, "./contracts": contracts };
function formSetup({ total = 0, resume, send, uploadable = true } = {}) {
  const h = harness(), decisions = [], sent = [], saved = [], denied = [], m = model(), props = { parentId: randomUUID(), parentKind: "property", writable: true, uploadable, total, resume, saved: result => saved.push(result), cancel() {}, denied: error => denied.push(error) };
  const draft = loadServer("src/components/shared/dossier-form.tsx", { modules: { react: h.react, "react/jsx-runtime": runtime, "./record-header": {} }, globals: { window: { dispatchEvent() {} }, Event } });
  const loaded = loadServer("src/features/files/photo-upload-form.tsx", { modules: { ...shared, react: h.react, "@/components/shared/dossier-form": draft, "@/components/shared/unsaved-guard": { useUnsavedGuard: () => ({ request: run => decisions.push(run) }) }, "./photo-conversion": m, "./photo-upload-model": { ...m, sendPhoto: async args => { sent.push(args); return send ? send(args) : m.sendPhoto(args); } } }, globals: { AbortController } });
  const render = () => h.render(() => loaded.PhotoUploadForm(props)); render();
  return { ...h, render, props, sent, saved, denied, decisions, pick(file) { find(render(), "Picker")[0].props.choose(file); }, submit() { find(render(), "form")[0].props.onSubmit({ preventDefault() {} }); } };
}

test("The focused photo form stages a real dirty file, submits explicitly and guards returning to the gallery", async () => {
  const s = formSetup(); assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], undefined); s.pick(source()); assert.equal(s.sent.length, 0); assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], "true");
  button(s.render(), "Retour à la galerie").props.onClick(); assert.equal(s.decisions.length, 1); assert.equal(find(s.render(), "Picker")[0].props.selected.name, "source.png");
  s.submit(); await delay(0); assert.equal(s.saved.length, 1); assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], undefined);
});

test("Unknown photo attempts freeze selection, lock duplicates and can retry their reserved slot even at ten photos", async () => {
  let resolve; const s = formSetup({ send: args => { args.attempt.started = true; args.reserved(); return new Promise(done => { resolve = done; }); } }), file = source();
  s.pick(file); s.submit(); s.submit(); assert.equal(s.sent.length, 1); assert.equal(find(s.render(), "form")[0].props["aria-busy"], true); s.pick(source("other.png")); assert.equal(find(s.render(), "Picker")[0].props.selected, file);
  resolve({ documentId: randomUUID(), state: "pending_scan", recovered: false }); await delay(0); assert.equal(s.saved.length, 1);
  let fail = true; const retry = formSetup({ send: async args => { args.attempt.started = true; args.reserved(); if (fail) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return { documentId: randomUUID(), state: "pending_scan", recovered: false }; } }); retry.pick(file); retry.submit(); await delay(0); retry.props.total = 10; fail = false; retry.submit(); await delay(0); assert.equal(retry.saved.length, 1); assert.equal(retry.sent[0].file, retry.sent[1].file); assert.equal(retry.sent[0].attempt, retry.sent[1].attempt);
  const full = formSetup({ total: 10 }); full.pick(file); full.submit(); await delay(0); assert.equal(full.sent.length, 0);
});

test("Photo upload denial clears the file, interrupted work retains it and unmount aborts without late success", async () => {
  const denied = formSetup({ send: async () => { throw new ApiError("FORBIDDEN", 403); } }); denied.pick(source()); denied.submit(); await delay(0); assert.equal(denied.denied[0].code, "FORBIDDEN"); assert.equal(find(denied.render(), "Picker")[0].props.selected, undefined);
  let resolve; const late = formSetup({ send: () => new Promise(done => { resolve = done; }) }); late.pick(source()); late.submit(); late.unmount(); assert.equal(late.sent[0].signal.aborted, true); resolve({ documentId: randomUUID(), state: "pending_scan", recovered: false }); await delay(0); assert.equal(late.saved.length, 0);
});

test("Gallery keeps upload entry separate, permits authorized resume at capacity and clears composer/preview on denial", () => {
  const h = harness(), m = model(), selected = photo(), uploadable = true, props = { propertyId: randomUUID(), writable: false, uploadable, onChanged() {} }, requests = [];
  let result = { value: { items: [selected], total: 10, page: 1, page_size: 10, has_next: false, has_previous: false }, refresh() {}, refreshQuietly() {} };
  const loaded = loadServer("src/features/files/property-photos.tsx", { modules: { ...shared, react: h.react, "@/features/contacts/numbered-pages": { NumberedPages: "Pages" }, "@/features/contacts/use-query": { useQuery: path => { requests.push(path); return result; } }, "./photo-previews": { photoPreviewKey: previewKey }, "./photo-gallery-media": { PhotoCard: "Card", PhotoViewer: "Viewer" }, "./photo-upload-form": { PhotoUploadForm: "Uploader" }, "./photo-upload-model": m }, globals: { AbortController, setInterval: () => 1, clearInterval() {}, requestAnimationFrame: run => run() } });
  const render = () => h.render(() => { const root = loaded.PropertyPhotos(props); return root.type(root.props); });
  let view = render(); assert.equal(find(view, "Uploader").length, 0); assert.equal(find(view, "Pages").length, 0); assert.equal(find(view, "Button").length, 0); assert.equal(typeof find(view, "Card")[0].props.resume, "function");
  const actions = find(view, "Card")[0].props; assert.equal(actions.begin(), true); assert.equal(actions.begin(), false); assert.equal(find(render(), "form")[0].props["aria-busy"], true); actions.end();
  find(view, "Card")[0].props.resume({}); view = render(); assert.equal(find(view, "Uploader")[0].props.total, 10); find(view, "Uploader")[0].props.denied(new ApiError("FORBIDDEN", 403)); view = render(); assert.equal(find(view, "Card").length, 0); assert.equal(find(view, "Uploader").length, 0);
  result = { ...result, value: { ...result.value, items: [], total: 0 } }; find(view, "Error")[0].props.retry(); view = render(); button(view, "Ajouter une photo").props.onClick({ currentTarget: {} }); assert.equal(find(render(), "Uploader")[0].props.resume, undefined); assert.ok(requests.every(path => path.includes("purpose=photo")));
});

function mediaSetup({ viewer = false, read, command, value = photo({ versions: [version("clean")] }) } = {}) {
  const h = harness(), reads = [], commands = [], urls = [], revoked = [], denied = [], changes = [], completed = []; let held = false, endings = 0;
  const props = { cache: { current: new Map() }, previewAbort: { current: new AbortController() }, photo: value, writable: true, disabled: false, begin: () => { if (held) return false; held = true; return true; }, end: () => { held = false; endings++; }, denied: error => denied.push(error), refresh: () => completed.push("refresh"), resume() {}, onChanged: () => completed.push("changed"), restoreFocus: () => completed.push("focus"), openPreview() {}, photos: [value], index: 0, change: index => changes.push(index), close() {}, returnFocus: { current: { isConnected: false } }, fallbackFocus: { current: { focus: () => completed.push("focus") } } };
  const loaded = loadServer("src/features/files/photo-gallery-media.tsx", { modules: { ...shared, react: h.react, "next/image": { default: "Image" }, "@/components/shared/protected-file-state": { ProtectedFileState: "State" }, "@/components/ui/alert-dialog": { AlertDialog: "Alert", AlertDialogContent: "AlertContent", AlertDialogTitle: "AlertTitle", AlertDialogDescription: "AlertDescription", AlertDialogCancel: "AlertCancel" }, "@/components/ui/dialog": { Dialog: "Dialog", DialogContent: "DialogContent", DialogDescription: "Description", DialogTitle: "Title" }, "@/lib/api/command": { apiCommand: async (...args) => { commands.push(args); return command ? command(...args) : value; } }, "./photo-previews": loadServer("src/features/files/photo-previews.ts", { modules: { "./transfers": { requestFilePermit: async (...args) => { reads.push(args); return { document_id: args[0].document_id }; }, downloadBytes: async (...args) => read ? read(...args) : new Blob(["synthetic image"]) } } }), "./photo-upload-model": model() }, globals: { crypto: { randomUUID }, AbortController, URL: { createObjectURL: () => { const url = `blob:synthetic-${urls.length}`; urls.push(url); return url; }, revokeObjectURL: url => revoked.push(url) } } });
  const render = () => h.render(() => viewer ? loaded.PhotoViewer(props) : loaded.PhotoCard(props)); render();
  return { ...h, render, props, reads, commands, urls, revoked, denied, changes, completed, endings: () => endings };
}

test("Photo cards read only clean versions, discard departed reads and revoke every created private URL", async () => {
  const pending = mediaSetup({ value: photo({ versions: [version("pending_scan")] }) }); await delay(0); assert.equal(pending.reads.length, 0); assert.equal(find(pending.render(), "Image").length, 0);
  const clean = mediaSetup(); await delay(0); assert.equal(clean.reads[0][0].action, "download"); assert.equal(find(clean.render(), "Image").length, 1); clean.unmount(); assert.deepEqual(clean.revoked, clean.urls);
  let finish; const late = mediaSetup({ read: () => new Promise(resolve => { finish = resolve; }) }); await delay(0); late.unmount(); finish(new Blob(["synthetic late image"])); await delay(0); assert.equal(late.urls.length, 0);
});

test("Private preview denial reaches the gallery boundary instead of retaining a stale photo", async () => {
  for (const viewer of [true, false]) { const s = mediaSetup({ viewer, read: async () => { throw new ApiError("FORBIDDEN", 403); } }); await delay(0); assert.equal(s.denied[0].code, "FORBIDDEN"); assert.equal(s.urls.length, 0); }
});

test("Photo archive locks rapid confirmation, keeps its retry identity and releases the gallery busy boundary", async () => {
  let finish, fail; const s = mediaSetup({ command: () => new Promise((resolve, reject) => { finish = resolve; fail = reject; }) }); await delay(0);
  button(s.render(), "Archiver").props.onClick(); const confirm = button(s.render(), "Confirmer l’archivage").props.onClick; confirm(); confirm(); assert.equal(s.commands.length, 1); assert.equal(find(s.render(), "li")[0].props["aria-busy"], true);
  fail(new ApiError("DEPENDENCY_UNAVAILABLE", 503)); await delay(0); assert.equal(s.endings(), 1); button(s.render(), "Confirmer l’archivage").props.onClick(); assert.equal(s.commands.length, 2); assert.equal(s.commands[0][3], s.commands[1][3]);
  finish({ ...s.props.photo, archived: true }); await delay(0); assert.equal(s.endings(), 2); assert.deepEqual(s.completed, ["refresh", "changed"]); find(s.render(), "AlertContent")[0].props.onCloseAutoFocus({ preventDefault() {} }); assert.equal(s.completed.at(-1), "focus");
});

test("Photo viewer navigation releases the previous preview and restores fallback focus after its card disappears", async () => {
  const s = mediaSetup({ viewer: true }); await delay(0); s.props.photos.push(photo({ versions: [version("clean")] })); button(s.render(), "Suivante").props.onClick(); s.props.index = 1; s.render(); await delay(0);
  assert.equal(s.reads[1][0].document_id, s.props.photos[1].id); assert.equal(s.revoked.length, 1);
  find(s.render(), "DialogContent")[0].props.onCloseAutoFocus({ preventDefault() {} }); assert.ok(s.completed.includes("focus")); s.unmount(); assert.equal(s.revoked.length, 2);
});

test("Shared transfer helpers retain private proof, omitted cookies and bounded cancellation signals", async () => {
  const calls = [], fetched = [], abort = new AbortController(), permit = { version_id: randomUUID(), transfer_url: "https://transfer.synthetic.invalid/transfers/synthetic", token: "synthetic-token", binding: "synthetic-proof" }; let finishBody;
  const loaded = loadServer("src/features/files/transfers.ts", { modules: { "@/lib/api/client": { ApiError, apiGet: async (...args) => { calls.push(args); return args[0].endsWith("/me") ? { csrf_token: "synthetic-proof" } : permit; } }, "@/lib/auth/contracts": { meSchema: {} }, "@/lib/api/request-signal": requestSignals, "./contracts": contracts }, globals: { fetch: async (...args) => { fetched.push(args); return { ok: true, blob: () => new Promise(resolve => { finishBody = resolve; }) }; } } });
  const result = await loaded.requestFilePermit({ action: "download", document_id: randomUUID(), expected_version: 1, version_id: permit.version_id }, abort.signal); assert.equal(calls[0][2], abort.signal); assert.equal(calls[1][2], abort.signal); assert.equal(result.binding, "synthetic-proof");
  const reading = loaded.downloadBytes(result, abort.signal); await delay(0); assert.equal(fetched[0][1].credentials, "omit"); assert.equal(fetched[0][1].cache, "no-store"); abort.abort(); assert.equal(fetched[0][1].signal.aborted, true); finishBody(new Blob(["synthetic"])); await reading;
});

test("Request cancellation needs no AbortSignal.any and releases listeners/timers only after the body finishes", async () => {
  const timers = new Map(), cleared = [], removed = []; let next = 0, listener;
  const bounded = loadServer("src/lib/api/request-signal.ts", { globals: { AbortController, setTimeout: run => { timers.set(++next, run); return next; }, clearTimeout: id => { cleared.push(id); timers.delete(id); } } });
  const parent = { aborted: false, reason: "synthetic abort", addEventListener: (_, run) => { listener = run; }, removeEventListener: (_, run) => removed.push(run) };
  const linked = bounded.boundedRequestSignal(parent, 100); listener(); assert.equal(linked.signal.aborted, true); linked.release(); assert.equal(timers.size, 0); assert.equal(removed.length, 1);
  const timed = bounded.boundedRequestSignal(undefined, 100); [...timers.values()][0](); assert.equal(timed.signal.aborted, true); timed.release();
  let finish; const fetches = [], loaded = loadServer("src/lib/api/client.ts", { modules: { "./request-signal": bounded }, globals: { fetch: async (...args) => { fetches.push(args); return { ok: true, status: 200, json: () => new Promise(resolve => { finish = resolve; }) }; } } });
  const request = loaded.apiGet("/api/v1/synthetic", { safeParse: value => ({ success: true, data: value }) }); await delay(0); assert.equal(timers.size, 1); assert.equal(fetches[0][1].credentials, "same-origin"); finish({ synthetic: true }); await request; assert.equal(timers.size, 0); assert.equal(cleared.length, 3);
});
