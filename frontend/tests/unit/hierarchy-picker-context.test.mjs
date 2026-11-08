import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { entryHarness } from "./entry-fixtures.mjs";
import { loadServer } from "./load-server.mjs";
import { development, inventory, find, runtime, ExternalApiError as ApiError } from "./external-stock-fixtures.mjs";

function row(kind, parent, fields = {}) {
  const common = { id: randomUUID(), code: "SYN-1", label: "Synthetic scoped option" };
  return kind === "unit-types" ? { ...common, development_id: parent, category: "apartment", default_area_sqm: null, default_rooms: null, ...fields }
    : { ...common, [kind === "floors" ? "block_id" : "development_id"]: parent, display_order: 0, ...fields };
}
function page(kind, items, fields = {}) {
  const schema = kind === "blocks" ? development.blocksSchema : kind === "floors" ? development.floorsSchema : development.unitTypesSchema;
  return schema.parse({ items, total: items.length, page: 1, page_size: 25, has_next: false, has_previous: false, ...fields });
}
function picker(kind, parent, result, props = {}) {
  const h = entryHarness(), changes = [], queries = [], denials = [];
  let response = result, refreshed = 0;
  const loaded = loadServer("src/features/inventory/level-picker.tsx", { modules: {
    react: h.react, "react/jsx-runtime": runtime,
    "@/components/ui/label": { Label: "Label" }, "@/components/ui/native-select": { NativeSelect: "Select" },
    "@/features/contacts/numbered-pages": { NumberedPages: "Pages" }, "@/features/contacts/record-states": { RecordError: "Error" },
    "@/features/contacts/use-query": { queryPath: (target, values) => { const path = `/api/v1/${target}?${new URLSearchParams(values)}`; queries.push(path); return path; }, useQuery: () => ({ ...response, refresh: () => refreshed++ }) },
    "./development-contracts": development, "./contracts": inventory, "@/lib/api/client": { ApiError },
  } });
  const options = { kind, parent, label: "Synthetic hierarchy", value: "", change: (...args) => changes.push(args), denied: error => denials.push(error), ...props };
  return { changes, queries, denials, options, refreshed: () => refreshed, response: value => { response = value; }, render: () => h.render(() => loaded.LevelPicker(options)) };
}

test("Hierarchy pickers reject shape-valid rows from another programme or block before showing or choosing them", () => {
  for (const kind of ["blocks", "floors", "unit-types"]) {
    const parent = randomUUID(), foreign = row(kind, randomUUID());
    const s = picker(kind, parent, { value: page(kind, [foreign]) }, { value: foreign.id, selectedLabel: "Synthetic retained foreign choice" });
    const tree = s.render(), select = find(tree, "Select")[0];
    assert.equal(select.props.disabled, true, kind);
    assert.deepEqual(find(select, "option").map(option => option.props.value), [""]);
    assert.equal(find(tree, "Error")[0].props.error.code, "DEPENDENCY_UNAVAILABLE");
    select.props.onChange({ target: { value: foreign.id } }); select.props.onChange({ target: { value: "" } });
    assert.equal(s.changes.length, 0);
  }
});

test("A mixed-parent page is rejected as a whole and an explicit healthy retry restores the scoped choice", () => {
  const parent = randomUUID(), local = row("blocks", parent), foreign = row("blocks", randomUUID());
  const s = picker("blocks", parent, { value: page("blocks", [local, foreign]) }, { value: local.id, selectedLabel: "Synthetic retained local choice" });
  let tree = s.render(); assert.equal(find(tree, "Select")[0].props.disabled, true); assert.equal(find(tree, "Pages").length, 0);
  assert.deepEqual(find(tree, "option").map(option => option.props.value), [""]);
  find(tree, "Error")[0].props.retry(); assert.equal(s.refreshed(), 1);
  s.response({ value: page("blocks", [local]) }); tree = s.render();
  assert.equal(find(tree, "Select")[0].props.disabled, false); assert.equal(find(tree, "Error").length, 0);
  assert.equal(find(tree, "option").some(option => option.props.value === foreign.id), false);
  find(tree, "Select")[0].props.onChange({ target: { value: local.id } }); assert.deepEqual(s.changes, [[local.id, "SYN-1 · Synthetic scoped option"]]);
});

test("Changing a floor parent refuses a stale shape-valid result before accepting a current block response", () => {
  const first = randomUUID(), second = randomUUID(), previous = row("floors", first), current = row("floors", second);
  const s = picker("floors", first, { value: page("floors", [previous]) }); assert.equal(find(s.render(), "Select")[0].props.disabled, false);
  s.options.parent = second; let tree = s.render(); assert.equal(find(tree, "Select")[0].props.disabled, true);
  assert.ok(s.queries.at(-1).includes(`/blocks/${second}/floors?`));
  s.response({ value: page("floors", [current]) }); tree = s.render(); assert.equal(find(tree, "Select")[0].props.disabled, false);
  assert.equal(find(tree, "option").some(option => option.props.value === previous.id), false);
  find(tree, "Select")[0].props.onChange({ target: { value: current.id } }); assert.equal(s.changes[0][0], current.id);
});

test("Current scoped type pages preserve counts, off-page selection and category rules while denial hides every option", () => {
  const parent = randomUUID(), allowed = row("unit-types", parent), other = row("unit-types", parent, { category: "villa" }), retained = randomUUID();
  const s = picker("unit-types", parent, { value: page("unit-types", [allowed, other], { total: 30, has_next: true }) }, { category: "apartment", value: retained, selectedLabel: "Synthetic selection from another page" });
  let tree = s.render(), select = find(tree, "Select")[0]; assert.equal(select.props.disabled, false); assert.equal(find(tree, "Pages")[0].props.total, 30);
  assert.equal(find(tree, "option").find(option => option.props.value === other.id).props.disabled, true);
  assert.ok(find(tree, "option").some(option => option.props.value === retained));
  select.props.onChange({ target: { value: other.id } }); select.props.onChange({ target: { value: randomUUID() } }); assert.equal(s.changes.length, 0);
  select.props.onChange({ target: { value: allowed.id } }); assert.equal(s.changes[0][0], allowed.id);
  find(tree, "Pages")[0].props.change(2); assert.equal(find(s.render(), "Select")[0].props.disabled, true);
  s.response({ value: page("unit-types", [allowed], { total: 30, page: 2, has_previous: true }) }); assert.equal(find(s.render(), "Select")[0].props.disabled, false);
  s.response({ error: new ApiError("FORBIDDEN", 403) }); tree = s.render(); select = find(tree, "Select")[0]; assert.equal(select.props.disabled, true);
  assert.deepEqual(find(tree, "option").map(option => option.props.value), [""]); assert.equal(s.denials.at(-1).status, 403);
});
