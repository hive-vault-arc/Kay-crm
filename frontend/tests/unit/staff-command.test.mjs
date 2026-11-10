import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes, randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { loadServer } from "./load-server.mjs";

const jsx = (type, props, key) => ({ type, props, key }), runtime = { jsx, jsxs: jsx };
const contracts = loadServer("src/features/users/contracts.ts"), auth = loadServer("src/lib/auth/contracts.ts");
class ApiError extends Error { constructor(code, status) { super(code); Object.assign(this, { code, status }); } }
const actorId = randomUUID(), targetId = randomUUID();
const staff = id => contracts.userSchema.parse({ id, display_name: "Synthetic colleague", email: "colleague@example.invalid", role: "agent", state: "active", version: 8, must_change_password: false, temporary_expires_at: null, handoff_confirmed_at: null });
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const problem = code => new ApiError(code, code === "FORBIDDEN" ? 403 : 503);

// Run the actual hooks/scope in independent mounted lifetimes; no app, DOM, network or credentials diagnostics.
function hooks() {
  const scopes = new Map(), effects = [];
  let active;
  const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  const slot = initial => { const current = active, index = current.cursor++; if (!(index in current.slots)) current.slots[index] = initial(); return [current, index]; };
  const react = {
    useState(initial) { const [current, index] = slot(() => typeof initial === "function" ? initial() : initial); return [current.slots[index], value => { if (current.disposed) current.lateUpdates++; current.slots[index] = typeof value === "function" ? value(current.slots[index]) : value; }]; },
    useRef(initial) { const [current, index] = slot(() => ({ current: initial })); return current.slots[index]; },
    useMemo(make, deps) { const [current, index] = slot(() => ({ deps, value: make() })); if (!same(current.slots[index].deps, deps)) current.slots[index] = { deps, value: make() }; return current.slots[index].value; },
    useEffect(effect, deps) { const [current, index] = slot(() => ({ effect: true })); const prior = current.slots[index]; if (!same(prior.deps, deps)) { prior.deps = deps; effects.push(() => { prior.cleanup?.(); prior.cleanup = effect(); }); } },
    createContext(value) { const context = { value }; context.Provider = { context }; return context; },
    useContext: context => context.value,
  };
  return {
    react, scopes,
    render(name, callback) { if (!scopes.has(name)) scopes.set(name, { slots: [], cursor: 0, disposed: false, lateUpdates: 0 }); const prior = active; active = scopes.get(name); active.cursor = 0; try { return callback(); } finally { active = prior; } },
    flush() { while (effects.length) effects.shift()(); },
    unmount(name) { const current = scopes.get(name); for (const value of current.slots) if (value?.effect) value.cleanup?.(); current.disposed = true; },
  };
}
function fixture(command) {
  const h = hooks();
  const modules = { react: h.react, "react/jsx-runtime": runtime, "@/components/ui/button": { Button: "Button" }, "@/features/contacts/record-states": { RecordError: "Error" }, "@/hooks/use-hydrated": { useHydrated: () => true }, "@/lib/api/client": { ApiError }, "./contracts": contracts };
  const scope = loadServer("src/features/users/staff-operation-scope.tsx", { modules });
  const loaded = loadServer("src/features/users/use-staff-command.tsx", { modules: { ...modules, "./staff-operation-scope": scope, "./api": { userCommand: command } }, globals: { AbortController, structuredClone, crypto: { randomUUID } } });
  return { h, loaded, render(options, name = "command") { const root = h.render("scope", () => scope.StaffOperationScope({ children: null })); root.type.context.value = root.props.value; const value = h.render(name, () => loaded.useStaffCommand({ actorId, targetId, completed() {}, denied() {}, ...options })); h.flush(); return value; } };
}

test("Staff profile and security share one owner through validation, dispatch and exact unknown-result retry", async () => {
  const first = deferred(), calls = [], secret = randomBytes(24).toString("hex");
  const f = fixture(async (...args) => { calls.push(args); args[5].dispatched(); if (calls.length === 1) return first.promise; return { user: staff(targetId) }; });
  const path = `/api/v1/users/${targetId}/reset-password`, body = { expected_version: 7, temporary_password: secret };
  let profile = f.render({}, "profile"), security = f.render({}, "security");
  assert.equal(profile.reserve(), true); assert.equal(await security.save(path, body, "POST"), false); assert.equal(calls.length, 0);
  profile.cancelReservation(); const pending = security.save(path, body, "POST");
  assert.equal(await profile.save(`/api/v1/users/${targetId}`, { expected_version: 7 }, "PATCH"), false);
  first.reject(problem("DEPENDENCY_UNAVAILABLE")); await pending;
  security = f.render({}, "security"); assert.equal(security.uncertain, true); assert.equal(security.clear(), false);
  body.expected_version = 99; body.temporary_password = randomBytes(24).toString("hex");
  assert.equal(await security.save(path, body, "POST"), false); assert.equal(calls.length, 1);
  assert.equal(f.render({}, "profile").scopeActive, true); assert.equal(await security.retry(), true);
  assert.equal(calls.length, 2); assert.equal(calls[0][0], calls[1][0]); assert.equal(calls[0][3], calls[1][3]); assert.equal(calls[1][4], "POST");
  assert.equal(calls[1][1].expected_version, 7); assert.ok(calls[1][1].temporary_password === secret, "ORIGINAL_CREDENTIAL_NOT_RETAINED");
  profile = f.render({}, "profile"); assert.equal(profile.scopeActive, false); assert.equal(profile.reserve(), true); profile.cancelReservation();
});

test("Staff failures before dispatch allow correction; known rejection releases its owner and key", async () => {
  const calls = [], rejected = []; let mode = "preflight";
  const f = fixture(async (...args) => { calls.push(args); if (mode === "preflight") throw problem("DEPENDENCY_UNAVAILABLE"); args[5].dispatched(); if (mode === "rejected") throw new ApiError("ADMIN_PASSWORD_INVALID", 403); return { user: staff(targetId) }; });
  const options = { rejected: failure => rejected.push(failure.code) }, path = `/api/v1/users/${targetId}/reset-password`;
  await f.render(options).save(path, { expected_version: 7 }, "POST"); let current = f.render(options);
  assert.equal(current.uncertain, false); assert.equal(current.scopeActive, false);
  mode = "rejected"; await current.save(path, { expected_version: 8 }, "POST"); current = f.render(options);
  assert.equal(current.uncertain, false); assert.equal(current.scopeActive, false); assert.deepEqual(rejected, ["DEPENDENCY_UNAVAILABLE", "ADMIN_PASSWORD_INVALID"]);
  mode = "success"; assert.equal(await current.save(path, { expected_version: 9 }, "POST"), true);
  assert.equal(new Set(calls.map(call => call[3])).size, 3);
});

test("Acknowledged staff operation retries only completion and drops its secret request", async () => {
  let writes = 0, completions = 0; const secret = randomBytes(24).toString("hex");
  const f = fixture(async (...args) => { writes++; args[5].dispatched(); return { user: staff(targetId) }; });
  const options = { completed: () => { if (++completions === 1) throw problem("DEPENDENCY_UNAVAILABLE"); } };
  await f.render(options).save(`/api/v1/users/${targetId}/reset-password`, { temporary_password: secret }, "POST");
  let current = f.render(options); assert.equal(current.uncertain, true); assert.equal(current.acknowledged, true);
  assert.ok(!JSON.stringify([...f.h.scopes.values()]).includes(secret), "ACKNOWLEDGED_REQUEST_RETAINED_CREDENTIAL");
  assert.equal(await current.retry(), true); current = f.render(options); assert.equal(writes, 1); assert.equal(completions, 2); assert.equal(current.scopeActive, false);
});

test("Unknown staff outcome stays pinned through a failed retry preflight; authority loss clears and denies", async () => {
  const denied = [], calls = []; let mode = "dispatched";
  const f = fixture(async (...args) => { calls.push(args); if (mode === "dispatched") args[5].dispatched(); throw problem(mode === "denied" ? "FORBIDDEN" : "DEPENDENCY_UNAVAILABLE"); });
  const options = { denied: failure => denied.push(failure.code) };
  await f.render(options).save(`/api/v1/users/${targetId}`, { expected_version: 7 }, "DELETE");
  mode = "preflight"; await f.render(options).retry(); assert.equal(f.render(options).uncertain, true);
  mode = "denied"; await f.render(options).retry(); const current = f.render(options);
  assert.deepEqual(denied, ["FORBIDDEN"]); assert.equal(current.uncertain, false); assert.equal(current.scopeActive, false);
  assert.equal(await current.save(`/api/v1/users/${targetId}`, { expected_version: 9 }, "DELETE"), false); assert.equal(calls.length, 3);
});

test("Disposed staff command aborts transport, drops credentials and ignores a late acknowledgement", async () => {
  const response = deferred(), calls = [], secret = randomBytes(24).toString("hex"); let completions = 0;
  const f = fixture(async (...args) => { calls.push(args); args[5].dispatched(); return response.promise; });
  const current = f.render({ completed: () => { completions++; } });
  const pending = current.save(`/api/v1/users/${targetId}/reset-password`, { temporary_password: secret }, "POST"); f.h.unmount("command");
  assert.equal(calls[0][5].signal.aborted, true); assert.ok(!JSON.stringify([...f.h.scopes.values()]).includes(secret), "DISPOSED_CREDENTIAL_RETAINED");
  response.resolve({ user: staff(targetId) }); await pending; assert.equal(completions, 0); assert.equal(f.h.scopes.get("command").lateUpdates, 0);
  assert.equal(await current.retry(), false);
});

test("Foreign staff result cannot complete or release an uncertain write; foreign paths never dispatch", async () => {
  const calls = []; let foreign = true, completions = 0;
  const f = fixture(async (...args) => { calls.push(args); args[5].dispatched(); return { user: staff(foreign ? randomUUID() : targetId) }; });
  const options = { completed: () => { completions++; } }; let current = f.render(options);
  assert.equal(await current.save(`/api/v1/users/${randomUUID()}`, {}, "PATCH"), false); assert.equal(calls.length, 0);
  await current.save(`/api/v1/users/${targetId}`, { expected_version: 7 }, "PATCH"); current = f.render(options);
  assert.equal(current.uncertain, true); assert.equal(completions, 0); foreign = false; await current.retry(); assert.equal(completions, 1); assert.equal(calls[0][3], calls[1][3]);
});

test("Staff transport requires fresh same-actor administrator identity before marking dispatch", async () => {
  const calls = [], signal = new AbortController().signal;
  let identity = { user: { id: actorId, role: "administrator" }, must_change_password: false, csrf_token: "synthetic-csrf" }, dispatched = 0;
  const loaded = loadServer("src/features/users/api.ts", { modules: { "@/lib/api/client": { ApiError, apiGet: async (...args) => { calls.push(args); return args[0] === "/api/v1/auth/me" ? identity : { user: staff(targetId) }; } }, "@/lib/auth/contracts": auth } });
  const send = () => loaded.userCommand(`/api/v1/users/${targetId}`, { expected_version: 7 }, contracts.commandSchema, randomUUID(), "DELETE", { actorId, signal, dispatched: () => { dispatched++; } });
  for (const user of [{ id: randomUUID(), role: "administrator" }, { id: actorId, role: "manager" }, { id: actorId, role: "agent" }]) {
    identity = { ...identity, user }; await assert.rejects(send(), failure => failure.code === "FORBIDDEN");
  }
  identity = { ...identity, user: { id: actorId, role: "administrator" }, must_change_password: true }; await assert.rejects(send(), failure => failure.code === "PASSWORD_CHANGE_REQUIRED");
  assert.equal(dispatched, 0); assert.equal(calls.filter(call => call[0] !== "/api/v1/auth/me").length, 0);
  identity.must_change_password = false; await send(); assert.equal(dispatched, 1); assert.equal(calls.at(-1)[2], signal); assert.equal(calls.at(-1)[3].csrf, "synthetic-csrf");
});

test("Staff transport abort during identity refresh never dispatches the mutation", async () => {
  const response = deferred(), controller = new AbortController(); let calls = 0, dispatched = 0;
  const loaded = loadServer("src/features/users/api.ts", { modules: { "@/lib/api/client": { ApiError, apiGet: async () => { calls++; return response.promise; } }, "@/lib/auth/contracts": auth } });
  const pending = loaded.userCommand(`/api/v1/users/${targetId}`, {}, contracts.commandSchema, randomUUID(), "DELETE", { actorId, signal: controller.signal, dispatched: () => { dispatched++; } });
  controller.abort(); response.resolve({ user: { id: actorId, role: "administrator" }, must_change_password: false }); await assert.rejects(pending, failure => failure.name === "AbortError"); assert.equal(dispatched, 0); assert.equal(calls, 1);
});

test("Staff editor uses private actor/target lifetimes and refuses a foreign detail response", async () => {
  const h = hooks(), requests = [];
  const loaded = loadServer("src/features/users/user-editor.tsx", { modules: { react: h.react, "react/jsx-runtime": runtime, "@/components/ui/skeleton": { Skeleton: "Skeleton" }, "@/features/contacts/record-states": { RecordError: "Error" }, "@/lib/api/client": { ApiError, apiGet: (...args) => { const response = deferred(); requests.push({ args, ...response }); return response.promise; } }, "./contracts": contracts, "./user-form": { UserForm: "Form" }, "./user-actions": { UserActions: "Actions" }, "./settings-workspace": { SettingsWorkspace: "Workspace" } }, globals: { AbortController } });
  const first = loaded.UserEditor({ id: targetId, actorId }), second = loaded.UserEditor({ id: randomUUID(), actorId }), third = loaded.UserEditor({ id: targetId, actorId: randomUUID() });
  assert.notEqual(first.key, second.key); assert.notEqual(first.key, third.key);
  const render = element => { const value = h.render(element.key, () => element.type(element.props)); h.flush(); return value; };
  render(first); h.unmount(first.key); render(second); assert.equal(requests[0].args[2].aborted, true);
  requests[0].resolve(staff(targetId)); requests[1].resolve(staff(targetId)); await delay(0);
  const failed = render(second); assert.equal(failed.type, "Workspace"); assert.equal(failed.props.children.type, "Error"); assert.equal(failed.props.children.props.error.code, "INVALID_RESPONSE"); assert.equal(h.scopes.get(first.key).lateUpdates, 0);
});
