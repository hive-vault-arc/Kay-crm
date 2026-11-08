// Inspect only the closed compiled function; never load the Next app/server.
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const frontend = path.resolve(import.meta.dirname, ".."), directory = path.join(frontend, ".next/server");
function files(folder) {
  return readdirSync(folder, { withFileTypes: true }).flatMap(item => item.isDirectory() ? files(path.join(folder, item.name)) : [path.join(folder, item.name)]);
}
const candidates = [];
for (const file of files(directory).filter(file => file.endsWith(".js"))) {
  const source = readFileSync(file, "utf8");
  if (!source.includes("__kayHistoryEntryV1")) continue;
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  function visit(node) {
    if ((ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) && node.body?.getText(ast).includes("__kayHistoryEntryV1")) candidates.push({ file, start: node.pos, end: node.end, source: node.getText(ast) });
    ts.forEachChild(node, visit);
  }
  visit(ast);
}
const leaves = candidates.filter(parent => !candidates.some(child => parent.file === child.file && parent.start < child.start && parent.end > child.end));
const unique = [...new Map(leaves.map(item => [item.source, item])).values()];
assert.ok(unique.length > 0, "COMPILED_HISTORY_BOOTSTRAP_MISSING");

for (const item of unique) {
  const window = new EventTarget(), location = { href: "https://crm.synthetic.invalid/contacts" };
  const entries = [{ __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: { synthetic: "retained" } }]; let index = 0;
  const history = {
    get state() { return structuredClone(entries[index]); },
    pushState(data, _unused, url) { entries.splice(index + 1); entries.push(structuredClone(data)); index++; location.href = new URL(url, location.href).href; },
    replaceState(data, _unused, url) { entries[index] = structuredClone(data); if (url) location.href = new URL(url, location.href).href; },
    go(delta) { index += delta; const event = new Event("popstate"); event.state = history.state; window.dispatchEvent(event); },
  };
  const timers = new Map(); let timerId = 0;
  runInNewContext(`(${item.source})();`, { window, history, location, crypto: { randomUUID }, EventTarget, Event, URL, setTimeout: run => { timers.set(++timerId, run); return timerId; }, clearTimeout: id => timers.delete(id) });
  assert.ok(window.__kayClassicHistoryV1, "COMPILED_HISTORY_BOOTSTRAP_NOT_CLOSED");
  const original = history.state;
  history.pushState({ __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: { synthetic: "next" } }, "", "/leads");
  assert.equal(history.state.__kayHistoryEntryV1.position, 1);
  assert.deepEqual(history.state.__PRIVATE_NEXTJS_INTERNALS_TREE, { synthetic: "next" });
  history.go(-1); assert.deepEqual(history.state, original);
}

console.info(JSON.stringify({ compiledCandidates: candidates.length, compiledClosedBootstraps: unique.length, compiledStandaloneStampPushPop: true, compiledFunctions: unique.map(item => ({ file: path.relative(frontend, item.file).replaceAll("\\", "/"), bytes: Buffer.byteLength(item.source), sha256: createHash("sha256").update(item.source).digest("hex") })) }));
