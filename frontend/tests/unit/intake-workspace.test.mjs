import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { loadServer } from "./load-server.mjs";

const jsx = (type, props) => ({ type, props }), runtime = { jsx, jsxs: jsx, Fragment: "Fragment" };
const plain = value => JSON.parse(JSON.stringify(value));
function nodes(node, type) { if (!node || typeof node !== "object") return []; if (Array.isArray(node)) return node.flatMap(child => nodes(child, type)); return [...(node.type === type ? [node] : []), ...nodes(node.props?.children, type)]; }
function text(node) { return node == null || typeof node === "boolean" ? "" : Array.isArray(node) ? node.map(text).join(" ") : typeof node === "object" ? text(node.props?.children) : String(node); }
function hooks() {
  const slots = [], effects = []; let cursor = 0;
  return { react: {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial; return [slots[i], next => { slots[i] = typeof next === "function" ? next(slots[i]) : next; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useEffect(run, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((value, n) => !Object.is(value, old.deps[n]))) { const current = { deps }; slots[i] = current; effects.push(() => { old?.cleanup?.(); current.cleanup = run(); }); } },
  }, render(run) { cursor = 0; const result = run(); effects.splice(0).forEach(run => run()); return result; }, dispose() { slots.forEach(slot => slot?.cleanup?.()); } };
}
function controller(request) {
  const h = hooks(), calls = [];
  const loaded = loadServer("src/features/intake/use-website-request.ts", { modules: { react: h.react, "./website-client": { websiteRequest: async (...args) => { calls.push(args); return request(...args); } } }, globals: { Error, AbortController, crypto: { randomUUID } } });
  const render = () => h.render(() => loaded.useWebsiteRequest());
  return { render, calls, dispose: h.dispose, fill() { const current = render(); for (const [key, value] of Object.entries({ name: "Synthetic submitted name", phone: "+212600000001", email: "", message: "Synthetic request" })) current.change(key, value); } };
}
const receipt = (state = "queued", receipt_id = randomUUID()) => ({ receipt_id, state });

test("Unknown intake acknowledgement freezes exact source bytes and identity across retries and blocks edits/duplicate events", async () => {
  let resolve, fail = true; const result = receipt();
  const s = controller(async () => { if (fail) throw new Error("503"); return new Promise(done => { resolve = done; }); }); s.fill();
  const before = s.render(); await before.send(); const first = s.calls[0][1]; before.change("name", "Must not replace frozen body");
  assert.equal(s.render().draft.name, "Synthetic submitted name"); assert.equal(s.render().locked, true);
  fail = false; const current = s.render(), retry = current.send(); current.send(); await delay(0);
  assert.equal(s.calls.length, 2); assert.equal(s.calls[1][1], first); const body = JSON.parse(first);
  assert.deepEqual(Object.keys(body), ["name", "phone", "email", "message", "submission_id", "submitted_at"]); assert.equal(body.email, null); assert.ok(body.submission_id); assert.ok(!Number.isNaN(Date.parse(body.submitted_at)));
  resolve(result); await retry; await current.send(); assert.equal(s.calls.length, 2); assert.deepEqual(plain(s.render().draft), { name: "", phone: "", email: "", message: "" }); assert.equal(s.render().receipt.receipt_id, result.receipt_id);
});

test("Definitive intake validation/body rejection preserves editable fields and creates a fresh identity only for the corrected send", async () => {
  for (const status of ["422", "413"]) {
    let fail = true; const s = controller(async () => { if (fail) throw new Error(status); return receipt(); }); s.fill(); await s.render().send();
    assert.equal(s.render().locked, false); assert.equal(s.render().receipt, null); assert.equal(s.render().draft.phone, "+212600000001");
    s.render().change("message", "Corrected synthetic request"); fail = false; await s.render().send();
    const [original, corrected] = s.calls.map(call => JSON.parse(call[1])); assert.notEqual(original.submission_id, corrected.submission_id); assert.equal(corrected.message, "Corrected synthetic request");
  }
});

test("Rate limits preserve one submission and refreshing a receipt never submits or reveals CRM identity", async () => {
  const result = receipt(); let limited = true, state = "queued";
  const s = controller(async path => { if (path === "/receipt") return { ...result, state }; if (limited) throw new Error("429"); return result; }); s.fill(); await s.render().send();
  assert.equal(s.render().locked, true); assert.ok(s.render().error.includes("une minute")); limited = false; await s.render().send(); assert.equal(s.calls[0][1], s.calls[1][1]);
  s.render().restart(); assert.equal(s.render().receipt.state, "queued"); await s.render().refresh(); assert.deepEqual(JSON.parse(s.calls[2][1]), { receipt_id: result.receipt_id });
  state = "processed"; await s.render().refresh(); assert.equal(s.calls.filter(call => call[0] === "/submit").length, 2); s.render().restart(); assert.equal(s.render().receipt, null); assert.equal(s.render().locked, false);
});

test("Failed or foreign receipt refresh retains only the known reference and disallows restart of queued/failed work", async () => {
  const result = receipt("failed"); let foreign = true;
  const s = controller(async path => path === "/submit" ? result : foreign ? receipt("processed") : Promise.reject(new Error("503"))); s.fill(); await s.render().send();
  s.render().restart(); assert.equal(s.render().receipt.state, "failed"); await s.render().refresh(); assert.equal(s.render().receipt.receipt_id, result.receipt_id); assert.ok(s.render().error.includes("reçu est conservé"));
  foreign = false; await s.render().refresh(); assert.equal(s.render().receipt.receipt_id, result.receipt_id); assert.equal(s.calls.filter(call => call[0] === "/submit").length, 1);
});

test("Unmount aborts intake work without publishing a late receipt or resetting it as a confirmed failure", async () => {
  let resolve; const s = controller(async () => new Promise(done => { resolve = done; })); s.fill(); const sending = s.render().send(); await delay(0);
  assert.equal(s.calls[0][2].aborted, false); s.dispose(); assert.equal(s.calls[0][2].aborted, true); resolve(receipt()); await sending; assert.equal(s.render().receipt, null); assert.equal(s.render().error, "");
});

test("The public intake client sends only no-store, cookies-omitted relative POSTs with exact bytes and rejects private/invalid receipt projections", async () => {
  const calls = [], valid = receipt(); let response = { ok: true, json: async () => valid };
  const { websiteRequest } = loadServer("src/features/intake/website-client.ts", { globals: { AbortSignal, fetch: async (...args) => { calls.push(args); return response; } } });
  const abort = new AbortController(), raw = '{"name":"Synthetic exact bytes"}'; assert.deepEqual(plain(await websiteRequest("/submit", raw, abort.signal)), valid);
  const [path, options] = calls[0]; assert.equal(path, "/submit"); assert.equal(options.body, raw); assert.equal(options.credentials, "omit"); assert.equal(options.cache, "no-store"); assert.equal(options.redirect, "error"); assert.equal(options.referrerPolicy, "no-referrer"); assert.deepEqual(plain(options.headers), { "Content-Type": "application/json" });
  abort.abort(); assert.equal(options.signal.aborted, true);
  for (const payload of [{ ...valid, contact_id: randomUUID() }, { ...valid, agent: "must not appear" }, { ...valid, state: "complete" }, { receipt_id: "not-a-uuid", state: "queued" }]) { response = { ok: true, json: async () => payload }; await assert.rejects(websiteRequest("/receipt", "{}", new AbortController().signal)); }
  response = { ok: false, status: 422 }; await assert.rejects(websiteRequest("/submit", "{}", new AbortController().signal), error => error.message === "422");
});

test("The selected public card keeps labelled optional fields, one primary submit and receipt-only status without staff navigation", () => {
  const h = hooks(); let model = { draft: { name: "", phone: "", email: "", message: "" }, receipt: null, busy: false, locked: false, error: "", change() {}, send() {}, refresh() {}, restart() {} };
  const loaded = loadServer("src/features/intake/website-form.tsx", { modules: { react: h.react, "react/jsx-runtime": runtime, "@/components/shared/brand": { Brand: "Brand" }, "@/components/ui/badge": { Badge: "Badge" }, "@/components/ui/button": { Button: "Button" }, "@/components/ui/input": { Input: "Input" }, "@/components/ui/label": { Label: "Label" }, "@/components/ui/textarea": { Textarea: "Textarea" }, "@/hooks/use-hydrated": { useHydrated: () => true }, "./use-website-request": { useWebsiteRequest: () => model } } });
  const render = () => h.render(() => loaded.WebsiteForm()); let view = render();
  assert.equal(view.props.className, "kay-auth"); assert.equal(nodes(view, "Brand")[0].props.className, "w-21"); assert.equal(nodes(view, "form").length, 1); assert.equal(nodes(view, "Input").length, 3); assert.equal(nodes(view, "Textarea")[0].props.required, undefined); assert.equal(nodes(view, "Textarea")[0].props.maxLength, 4000); assert.equal(nodes(view, "Button").filter(button => button.props.type === "submit").length, 1);
  for (const state of ["queued", "failed", "processed"]) { model = { ...model, receipt: receipt(state), busy: false }; view = render(); assert.equal(nodes(view, "form").length, 0); assert.equal(nodes(view, "Input").length, 0); assert.equal(nodes(view, "Badge")[0].props.variant, state === "queued" ? "info" : state === "failed" ? "danger" : "success"); assert.equal(nodes(view, "Button").some(button => text(button) === "Nouvelle demande"), state === "processed"); assert.equal(nodes(view, "a").length, 0); }
});
