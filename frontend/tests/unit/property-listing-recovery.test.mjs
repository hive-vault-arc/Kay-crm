import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { loadServer } from "./load-server.mjs";
import { recordFixture, inventoryHostFixture, find, button, text, runtime, ExternalApiError as ApiError, tick } from "./external-stock-fixtures.mjs";
import { listingIntents, propertyListingFixture } from "./property-listing-fixtures.mjs";

test("Listing intents bind standalone/unit creation and edits to exact paths, parent, methods and strict fields", () => {
  for (const edit of [false, true]) for (const unit of [false, true]) {
    const s = propertyListingFixture({ edit, unit }), id = edit ? s.source.id : undefined, scope = { id, version: edit ? 7 : undefined, developmentId: unit ? s.developmentId : undefined }, path = edit ? `/api/v1/properties/${id}` : "/api/v1/properties", method = edit ? "PATCH" : "POST";
    const body = { reference: "SYN-INTENT", category: "villa", marketing_name: null, location: null, area_sqm: null, ...(unit ? { development_id: s.developmentId } : {}), ...(edit ? { expected_version: 7 } : { initial_offering: { kind: "sale", price_mad: "9007199254740993.01", price_period: null, currency: "MAD" } }) }, parse = listingIntents.propertyListingIntent;
    assert.ok(parse(scope, path, body, method)); assert.equal(parse(scope, path + "/extra", body, method), undefined); assert.equal(parse(scope, path, body, edit ? "POST" : "PATCH"), undefined);
    for (const extra of [{ actor_user_id: randomUUID() }, { owners: [] }, { block_id: randomUUID() }, { development_id: randomUUID() }, ...(edit ? [{ initial_offering: { kind: "sale", price_mad: "1", price_period: null, currency: "MAD" } }, { expected_version: 0 }] : [{ expected_version: 1 }, { id: randomUUID() }])]) assert.equal(parse(scope, path, { ...body, ...extra }, method), undefined);
    assert.equal(parse({ ...scope, id: "" }, path, body, method), undefined); assert.equal(parse({ ...scope, developmentId: "" }, path, body, method), undefined);
    if (edit) assert.equal(parse({ ...scope, id: randomUUID() }, path, body, method), undefined);
  }
});

for (const options of [{ edit: false, unit: false }, { edit: false, unit: true }, { edit: true, unit: false }, { edit: true, unit: true }]) {
  test(`Listing ${JSON.stringify(options)} recovers the original request once without replacing fields, placement or destination`, async () => {
    let lost = true; const s = propertyListingFixture({ ...options, dispatch: ({ commit }) => { const receipt = commit(); if (lost) { lost = false; throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } return receipt; } });
    s.prepare(); s.step(0); const field = find(s.render(), "Input").find(node => node.props.id === "property-reference"), picker = options.unit ? find(s.render(), "Picker")[0] : undefined, stepper = find(s.render(), "Steps")[0], link = find(s.render(), "Link")[0], cancel = s.cancelButton();
    s.step(4); await s.save(); assert.equal(s.commits(), 1); assert.equal(s.navigations.length, 0); assert.equal(find(s.render(), "form")[0].props["data-write-recovery"], "true"); assert.equal(find(s.render(), "fieldset")[0].props.disabled, true);
    field.props.onChange({ target: { value: "Unwanted replacement" } }); picker?.props.change(randomUUID(), "Unwanted foreign placement"); stepper.props.change(0); assert.equal(find(s.render(), "Steps")[0].props.current, 4); cancel.props.onClick?.(); if (link) { let prevented = false; link.props.onClick({ preventDefault() { prevented = true; } }); assert.equal(prevented, true); } assert.equal(s.cancelled(), 0);
    if (s.host) s.host.available = false; await s.save(); assert.equal(s.calls.length, 2); assert.equal(s.calls[0][3], s.calls[1][3]); assert.deepEqual(s.calls[0][1], s.calls[1][1]); assert.notEqual(s.calls[1][1].reference, "Unwanted replacement"); assert.equal(s.commits(), 1); assert.deepEqual(s.navigations, [`/projects/properties/${s.server().id}`]); assert.equal(s.server().version, options.edit ? 8 : 2); assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], undefined);
    if (!options.edit) { assert.equal(s.calls[0][1].initial_offering.price_mad, "9007199254740993.01"); assert.equal(s.server().offerings[0].state, "draft"); assert.equal(s.server().offerings[0].version, 1); }
    else { assert.equal(Object.hasOwn(s.calls[0][1], "initial_offering"), false); assert.equal(s.accepted[0].id, s.source.id); }
    await s.save(); assert.equal(s.calls.length, 2);
  });
}

test("Acknowledged unit creation and property editing retry only current reads and awaited original UI completion", async () => {
  for (const options of [{ unit: true }, { edit: true }]) {
    let outage = true; const s = propertyListingFixture({ ...options, read: (_path, schema, _signal, server) => { if (outage) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return schema.parse(server); } }); s.prepare(); await s.save(); assert.ok(button(s.render(), "Actualiser le résultat")); assert.equal(s.navigations.length, 0); outage = false; await s.save(); assert.equal(s.calls.length, 1); assert.equal(s.navigations.length, 1); assert.equal(s.commits(), 1); assert.equal(s.publications.at(-1), false);
  }
  let fail = true; const ui = propertyListingFixture({ navigate: () => { if (fail) throw new Error("Synthetic navigation failure"); } }); ui.prepare(); await ui.save(); fail = false; await ui.save(); assert.equal(ui.calls.length, 1); assert.equal(ui.commits(), 1); assert.equal(ui.navigations.length, 2);
});

test("Wrong receipt branch, edit ID, offering or atomic creation counter retries the same original listing request", async () => {
  for (const mode of ["root", "edit-id", "edit-offer", "create-counter", "create-offer"]) {
    let invalid = true; const edit = mode.startsWith("edit"), s = propertyListingFixture({ edit, dispatch: ({ commit }) => { const receipt = commit(); if (!invalid) return receipt; if (mode === "root") return { development_id: receipt.property_id, offering_id: receipt.offering_id, version: receipt.version, event_id: receipt.event_id }; return { ...receipt, ...(mode === "edit-id" ? { property_id: randomUUID() } : mode === "edit-offer" ? { offering_id: randomUUID() } : mode === "create-counter" ? { version: 1 } : { offering_id: null }) }; } });
    s.prepare(); await s.save(); assert.equal(s.navigations.length, 0); assert.ok(button(s.render(), "Réessayer la même opération")); invalid = false; await s.save(); assert.equal(s.calls.length, 2); assert.equal(s.calls[0][3], s.calls[1][3]); assert.equal(s.commits(), 1); assert.equal(s.navigations.length, 1);
  }
});

test("Foreign/stale current listing, foreign programme/hierarchy and missing initial offer cannot complete a receipt", async () => {
  for (const mode of ["foreign", "stale", "parent", "hierarchy", "offer", "foreign-offer"]) {
    let invalid = true; const s = propertyListingFixture({ unit: true, read: (_path, schema, _signal, server) => { if (!invalid) return schema.parse(server); const record = { ...server }; if (mode === "foreign") record.id = randomUUID(); if (mode === "stale") record.version = 1; if (mode === "parent") record.development_id = randomUUID(); if (mode === "hierarchy") record.hierarchy = { ...record.hierarchy, development: { ...record.hierarchy.development, id: randomUUID() } }; if (mode === "offer") record.offerings = []; if (mode === "foreign-offer") record.offerings = record.offerings.map(value => ({ ...value, property_id: randomUUID() })); return schema.parse(record); } });
    s.prepare(); await s.save(); assert.equal(s.navigations.length, 0); assert.ok(button(s.render(), "Actualiser le résultat")); invalid = false; await s.save(); assert.equal(s.calls.length, 1); assert.equal(s.navigations.length, 1); assert.equal(s.commits(), 1);
  }
});

test("A later retired initial offer does not erase an acknowledged historical property creation", async () => {
  const s = propertyListingFixture({ read: (_path, schema, _signal, server) => schema.parse({ ...server, version: server.version + 1, offerings: [] }) }); s.prepare(); await s.save(); assert.equal(s.calls.length, 1); assert.equal(s.navigations.length, 1);
});

test("All existing staff roles retain standalone creation and programme unit fact editing under the real origin", async () => {
  for (const role of ["agent", "manager", "administrator"]) for (const options of [{}, { unit: true, edit: true }]) { const s = propertyListingFixture({ ...options, role }); s.prepare(); await s.save(); assert.equal(s.calls.length, 1); assert.equal(s.navigations.length, 1); }
});

test("Known listing conflict requires an exact explicit current review and preserves the retained draft and zero facts", async () => {
  let conflict = true, fresh; const s = propertyListingFixture({ edit: true, read: (_path, schema, _signal, server) => schema.parse(conflict ? fresh : server), dispatch: ({ commit }) => { if (conflict) throw new ApiError("INVENTORY_VERSION_CONFLICT", 409); return commit(); } });
  fresh = { ...s.source, version: 9, marketing_name: "Synthetic current title", area_sqm: "125.00", listing_details: { ...s.source.listing_details, bathrooms: 0 } }; s.prepare(); await s.save(); await s.save(); assert.equal(s.calls.length, 1);
  await button(s.render(), "Comparer la version actuelle").props.onClick(); await tick(); assert.equal(find(s.render(), "Details")[0].props.property.listing_details.bathrooms, 0); assert.equal(find(s.render(), "fieldset")[0].props.disabled, true); button(s.render(), "Conserver ma saisie sur cette version").props.onClick(); conflict = false; await s.save(); assert.equal(s.calls[1][1].expected_version, 9); assert.equal(s.calls[1][1].marketing_name, "Synthetic original edited title"); assert.equal(Object.hasOwn(s.calls[1][1], "initial_offering"), false); assert.notEqual(s.calls[1][3], s.calls[0][3]); assert.equal(s.accepted[0].version, 10);
});

test("Newly locked category reconciliation explicitly keeps other fields and restores the current category/placement", async () => {
  const original = recordFixture("properties", "sale", true), offer = original.offerings[0]; original.offerings = []; let conflict = true, fresh;
  const s = propertyListingFixture({ edit: true, unit: true, source: original, read: (_path, schema, _signal, server) => schema.parse(conflict ? fresh : server), dispatch: ({ commit }) => { if (conflict) throw new ApiError("INVENTORY_VERSION_CONFLICT", 409); return commit(); } });
  fresh = { ...original, version: 9, offerings: [offer] }; s.prepare(); s.step(0); s.field("category", "villa"); s.place(); s.step(4); await s.save(); await button(s.render(), "Comparer la version actuelle").props.onClick(); await tick(); assert.ok(text(s.render()).includes("le type et le rattachement actuels seront repris")); button(s.render(), "Garder les autres champs et le type de bien actuel").props.onClick(); conflict = false; await s.save(); assert.equal(s.calls[1][1].category, original.category); assert.equal(s.calls[1][1].marketing_name, "Synthetic original edited title"); assert.equal(s.calls[1][1].floor_id, original.floor_id ?? null); assert.equal(s.calls[1][1].unit_type_id, original.unit_type_id ?? null); assert.equal(s.calls[1][1].development_id, original.development_id); assert.equal(s.accepted[0].version, 10); assert.equal(s.navigations.length, 1);
});

test("Guarded current reload resets only after approval and a current comparison cannot lower a newer host counter", async () => {
  let fresh; const s = propertyListingFixture({ edit: true, read: (_path, schema) => schema.parse(fresh), dispatch: () => { throw new ApiError("INVENTORY_VERSION_CONFLICT", 409); } }); fresh = { ...s.source, version: 8, marketing_name: "Synthetic accepted current title" }; s.prepare(); await s.save(); await button(s.render(), "Comparer la version actuelle").props.onClick(); await tick();
  s.props.property = { ...s.source, version: 9 }; s.render(); button(s.render(), "Conserver ma saisie sur cette version").props.onClick(); await s.save(); assert.equal(s.calls.length, 1);
  fresh = { ...fresh, version: 9 }; await button(s.render(), "Comparer la version actuelle").props.onClick(); await tick(); button(s.render(), "Recharger la fiche").props.onClick(); assert.equal(s.decisions.length, 1); assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], "true"); s.decisions[0].run(); assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], undefined); s.step(0); assert.equal(find(s.render(), "Input").find(node => node.props.id === "property-marketing_name").props.value, fresh.marketing_name);
});

test("Archived or reparented unit review ends read-only instead of silently moving the opening form", async () => {
  for (const mode of ["archived", "parent"]) { let fresh; const s = propertyListingFixture({ edit: true, unit: true, read: (_path, schema) => schema.parse(fresh), dispatch: () => { throw new ApiError("INVENTORY_VERSION_CONFLICT", 409); } }); fresh = { ...s.source, version: 8, ...(mode === "archived" ? { archived_at: "2026-10-29T12:00:00Z" } : { development_id: randomUUID() }) }; s.prepare(); await s.save(); await button(s.render(), "Comparer la version actuelle").props.onClick(); await tick(); assert.ok(text(s.render()).includes("Le bien est archivé ou son programme a changé")); assert.equal(find(s.render(), "Button").some(node => text(node) === "Conserver ma saisie sur cette version"), false); await s.save(); assert.equal(s.calls.length, 1); assert.equal(s.navigations.length, 0); }
});

test("Known create collision permits explicit correction with a fresh key while unknown work never does", async () => {
  let conflict = true; const s = propertyListingFixture({ unit: true, dispatch: ({ commit }) => { if (conflict) throw new ApiError("REFERENCE_ALREADY_EXISTS", 409); return commit(); } }); s.prepare(); await s.save(); s.step(0); s.field("reference", "SYN-CORRECTED-REFERENCE"); s.step(4); conflict = false; await s.save(); assert.equal(s.calls.length, 2); assert.notEqual(s.calls[0][3], s.calls[1][3]); assert.equal(s.calls[1][1].reference, "SYN-CORRECTED-REFERENCE"); assert.equal(s.commits(), 1);
});

test("Hydration, wrong parent context and unavailable source cannot dispatch partial or foreign listing data", async () => {
  const cold = propertyListingFixture({ hydrated: false }); cold.field("reference", "Unhydrated input"); cold.step(4); await cold.save(); assert.equal(cold.calls.length, 0);
  const wrong = propertyListingFixture({ unit: true }); wrong.prepare(); wrong.host.id = randomUUID(); await wrong.save(); assert.equal(wrong.calls.length, 0);
  const unavailable = propertyListingFixture({ edit: true }); unavailable.prepare(); unavailable.host.available = false; await unavailable.save(); assert.equal(unavailable.calls.length, 0); assert.equal(find(unavailable.render(), "form")[0].props["data-live-dirty"], "true");
});

test("Equivalent text stays clean, while cleared zero and invalid numeric edits stay dirty without a partial save", async () => {
  const source = recordFixture("properties"); source.listing_details.bathrooms = 0;
  const s = propertyListingFixture({ edit: true, source }); s.field("reference", ` ${source.reference} `); assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], undefined);
  s.step(2); s.field("bathrooms", ""); assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], "true"); s.field("bathrooms", "0"); assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], undefined);
  s.field("bathrooms", "invalid"); assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], "true"); s.step(4); await s.save(); assert.equal(s.calls.length, 0); assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], "true");
});

test("Account/role/password and hierarchy picker denial mask listing data, preserving only acknowledged saved facts", async () => {
  for (const mode of ["account", "role", "password"]) { const s = propertyListingFixture({ edit: true }); s.prepare(); s.identity({ user: { id: mode === "account" ? randomUUID() : s.actorId, role: mode === "role" ? "manager" : "agent" }, must_change_password: mode === "password" }); await s.save(); assert.equal(s.calls.length, 0); assert.equal(find(s.render(), "form").length, 0); }
  const picker = propertyListingFixture({ unit: true }); find(picker.render(), "Picker")[0].props.denied(new ApiError("FORBIDDEN", 403)); assert.equal(find(picker.render(), "form").length, 0);
  let saved; saved = propertyListingFixture({ unit: true, dispatch: ({ commit }) => { const receipt = commit(); saved.identity({ user: { id: saved.actorId, role: "manager" }, must_change_password: false }); return receipt; } }); saved.prepare(); await saved.save(); assert.equal(saved.commits(), 1); assert.equal(saved.navigations.length, 0); assert.equal(find(saved.render(), "form").length, 0); assert.equal(find(saved.render(), "p")[0].props.children, "Le bien est enregistré. Les droits d’accès ont changé.");
});

test("Synchronous duplicate save, disposed result reads and a disposed comparison cannot navigate or update late", async () => {
  let resolve, signal; const s = propertyListingFixture({ edit: true, read: (_path, schema, current, server) => { signal = current; return new Promise(done => { resolve = () => done(schema.parse(server)); }); } }); s.prepare(); const one = s.save(), two = s.save(); await tick(); assert.equal(s.calls.length, 1); s.dispose(); assert.equal(signal.aborted, true); resolve(); await Promise.all([one, two]); assert.equal(s.lateUpdates(), 0); assert.equal(s.navigations.length, 0);
  let finish, comparisonSignal; const review = propertyListingFixture({ edit: true, dispatch: () => { throw new ApiError("INVENTORY_VERSION_CONFLICT", 409); }, read: (_path, _schema, current) => { comparisonSignal = current; return new Promise(done => { finish = done; }); } }); review.prepare(); await review.save(); button(review.render(), "Comparer la version actuelle").props.onClick(); await tick(); review.dispose(); assert.equal(comparisonSignal.aborted, true); finish({ ...review.source, version: 8 }); await tick(); assert.equal(review.lateUpdates(), 0);
});

test("The property edit host retains its scoped editor through source failure and the create route forwards its actual actor", async () => {
  const host = inventoryHostFixture("properties"); host.props.edit = true; const view = host.render(); assert.equal(find(view, "RecordScope")[0].props.value.id, host.record.id); assert.equal(find(view, "RecordScope")[0].props.value.actorId, host.props.actorId); assert.equal(find(view, "fieldset").length, 0); find(view, "BusyScope")[0].props.value(true); host.query.error = new ApiError("DEPENDENCY_UNAVAILABLE", 503); host.query.value = undefined; assert.equal(find(host.render(), "PropertyEditor")[0].props.property.id, host.record.id);
  const actorId = randomUUID(), route = loadServer("src/app/(workspace)/projects/properties/new/page.tsx", { modules: { "react/jsx-runtime": runtime, "@/components/shared/page-header": { PageHeader: "Header" }, "@/features/auth/auth-frame": { AuthUnavailable: "Unavailable" }, "@/features/inventory/property-editor": { PropertyEditor: "Editor" }, "@/lib/auth/server": { requireIdentity: async () => ({ state: "authenticated", profile: { user: { id: actorId, role: "agent" } } }) } } }); const editor = find(await route.default(), "Editor")[0]; assert.equal(editor.props.actorId, actorId); assert.equal(editor.props.role, "agent"); assert.equal(editor.key, `${actorId}:agent`);
});
