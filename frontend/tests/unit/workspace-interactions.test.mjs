import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { loadServer } from "./load-server.mjs";

const jsx = (type, props) => ({ type, props });
const runtime = { jsx, jsxs: jsx, Fragment: "Fragment" };
function stateHarness() {
  let cursor = 0;
  const state = [];
  const react = {
    useState(initial) { const index = cursor++; if (!(index in state)) state[index] = typeof initial === "function" ? initial() : initial; return [state[index], next => { state[index] = typeof next === "function" ? next(state[index]) : next; }]; },
    useRef(initial) { const index = cursor++; if (!(index in state)) state[index] = { current: initial }; return state[index]; },
    useCallback(callback) { return callback; },
    useId() { return "synthetic-control"; },
  };
  return { react, render(callback) { cursor = 0; return callback(); } };
}
function find(node, type) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(child => find(child, type));
  return [...(node.type === type ? [node] : []), ...find(node.props?.children, type)];
}

test("Unsaved navigation excludes same-page anchors, new tabs, downloads and non-page protocols", () => {
  const { navigationIntent } = loadServer("src/lib/navigation-intent.ts");
  const current = "https://crm.synthetic.invalid/contacts/record?tab=overview";
  for (const overrides of [{ href: "#identity" }, { href: "/leads", modified: true }, { href: "/leads", target: "_blank" }, { href: "/file", download: true }, { href: "tel:+212600000000" }, { href: "mailto:synthetic@example.invalid" }, { href: "javascript:invalid" }, { href: "http://[invalid" }]) assert.equal(navigationIntent({ current, ...overrides }), null);
  assert.equal(navigationIntent({ current, href: "/leads" }), "https://crm.synthetic.invalid/leads");
  assert.equal(navigationIntent({ current, href: "?tab=activity" }), "https://crm.synthetic.invalid/contacts/record?tab=activity");
});

test("Status menu preserves the reviewed version, immutable lead fields and retry identity after an interrupted response", async () => {
  const harness = stateHarness(), calls = [];
  const qualification = loadServer("src/features/contacts/qualification-contracts.ts");
  const contracts = loadServer("src/features/contacts/contracts.ts", { modules: { "./qualification-contracts": qualification } });
  class ApiError extends Error { constructor(code, status) { super(code); this.code = code; this.status = status; } }
  let interrupted = true, saved = 0;
  const { LeadStatusMenu } = loadServer("src/features/contacts/lead-status-menu.tsx", { globals: { crypto: { randomUUID } }, modules: {
    react: harness.react, "react/jsx-runtime": runtime,
    "@/components/ui/button": { Button: "Button" }, "@/components/ui/input": { Input: "Input" }, "@/components/ui/label": { Label: "Label" },
    "@/components/ui/alert-dialog": { AlertDialog: "Dialog", AlertDialogCancel: "Cancel", AlertDialogContent: "Content", AlertDialogDescription: "Description", AlertDialogTitle: "Title" },
    "@/components/shared/crm-presentation": { CrmStatusBadge: "Badge" }, "@/components/shared/record-status-menu": { RecordStatusMenu: "StatusMenu" },
    "@/hooks/use-hydrated": { useHydrated: () => true }, "@/lib/api/client": { ApiError },
    "@/lib/api/command": { apiCommand: async (path, body, schema, key, method) => { calls.push({ path, body, key, method }); assert.equal(schema, contracts.enquirySchema); if (interrupted) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } },
    "./contracts": contracts, "./record-states": { RecordError: "Error" },
  } });
  const enquiry = { id: randomUUID(), version: 17, contact: { name: "Synthetic contact" }, status: "new", message: "Retain the original request", initial_budget: "1 400 000 MAD", campaign_source: qualification.campaignSchema.options[0], rating: "cold" };
  let current = enquiry;
  const render = () => harness.render(() => LeadStatusMenu({ enquiry: current, writable: true, changed: value => { if (value) saved++; } }));
  find(render(), "StatusMenu")[0].props.choose("qualified");
  find(render(), "form")[0].props.onSubmit({ preventDefault() {} }); await delay(0);
  assert.equal(saved, 0); assert.equal(find(render(), "Dialog")[0].props.open, true);
  current = { ...enquiry, version: 19, message: "Newer authoritative snapshot" };
  interrupted = false; find(render(), "form")[0].props.onSubmit({ preventDefault() {} }); await delay(0);
  assert.equal(calls.length, 2); assert.equal(calls[0].key, calls[1].key); assert.equal(calls[1].method, "PATCH");
  assert.equal(calls[1].path, `/api/v1/enquiries/${enquiry.id}`);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[1].body)), { expected_version: 17, message: enquiry.message, status: "qualified", initial_budget: enquiry.initial_budget, campaign_source: enquiry.campaign_source, rating: enquiry.rating });
  assert.equal(saved, 1); assert.equal(find(render(), "Dialog")[0].props.open, false);
});

test("Dossier tabs retain visited controls and draft objects; unvisited panels stay lazy", () => {
  const harness = stateHarness();
  const { RecordWorkspace } = loadServer("src/components/shared/record-workspace.tsx", { modules: {
    react: harness.react, "react/jsx-runtime": runtime,
    "@/components/ui/tabs": { Tabs: "Tabs", TabsContent: "Panel", TabsList: "List", TabsTrigger: "Tab" },
    "@/hooks/use-hydrated": { useHydrated: () => true },
  } });
  const draft = { value: "synthetic unsaved value" };
  const tabs = [{ id: "overview", label: "Aperçu", content: draft }, { id: "activity", label: "Activités", content: "history" }];
  const render = () => harness.render(() => RecordWorkspace({ tabs, label: "Contact", initialTab: "invalid" }));
  let view = render(); assert.equal(find(view, "Panel").length, 1); assert.equal(find(view, "Panel")[0].props.children, draft);
  find(view, "Tabs")[0].props.onValueChange("activity"); view = render();
  assert.equal(find(view, "Panel").length, 2); assert.equal(find(view, "Panel")[0].props.hidden, true); assert.equal(find(view, "Panel")[0].props.children, draft);
  find(view, "Tabs")[0].props.onValueChange("overview"); view = render();
  assert.equal(find(view, "Panel")[0].props.hidden, false); assert.equal(find(view, "Panel")[0].props.children.value, "synthetic unsaved value");
});

test("Unsaved guard retains drafts on cancel, blocks pending commands and discards only after confirmation", () => {
  const harness = stateHarness();
  class Element { dataset = {}; focus() {} }
  const dirty = new Element(); dirty.dataset.liveDirty = "true";
  let busy = false, ran = 0;
  const scope = { querySelector: () => busy ? {} : null, querySelectorAll: () => dirty.dataset.liveDirty ? [dirty] : [] };
  const { useUnsavedGuard } = loadServer("src/components/shared/unsaved-guard.tsx", { globals: { document: { ...scope, activeElement: new Element() }, HTMLElement: Element }, modules: {
    react: harness.react, "react/jsx-runtime": runtime, "next/navigation": {},
    "@/components/ui/alert-dialog": { AlertDialog: "Dialog", AlertDialogCancel: "Cancel", AlertDialogContent: "Content", AlertDialogDescription: "Description", AlertDialogTitle: "Title" },
    "@/components/ui/button": { Button: "Button" }, "@/lib/navigation-intent": {},
  } });
  const render = () => harness.render(useUnsavedGuard);
  render().request(() => ran++, scope); let guard = render();
  assert.equal(ran, 0); assert.equal(guard.dialog.props.open, true);
  guard.dialog.props.onOpenChange(false); assert.equal(render().dialog.props.open, false); assert.equal(dirty.dataset.liveDirty, "true");
  busy = true; render().request(() => ran++, scope); assert.equal(render().dialog.props.open, false); assert.equal(ran, 0);
  busy = false; render().request(() => ran++, scope); guard = render();
  find(guard.dialog, "Button").find(node => node.props.action === "forward").props.onClick();
  assert.equal(ran, 1); assert.equal(dirty.dataset.liveDirty, undefined); assert.equal(render().dialog.props.open, false);
  render().request(() => ran++, scope); assert.equal(ran, 2);
});
