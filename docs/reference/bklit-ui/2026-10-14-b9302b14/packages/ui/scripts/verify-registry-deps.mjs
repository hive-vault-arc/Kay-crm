#!/usr/bin/env node
/**
 * Verifies registry item `dependencies` cover all npm imports in the item's
 * file tree plus transitive @bklit registryDependencies (shadcn / v0 install closure).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uiRoot = path.join(__dirname, "..");
const registryPath = path.join(uiRoot, "registry.json");

const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const byName = Object.fromEntries(
  registry.items.map((item) => [item.name, item])
);

const importRe =
  /(?:import|export)\s+(?:type\s+)?(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]/g;
const DEP_VERSION_SUFFIX_RE = /@[\d.]+(-[\w.]+)?$/;
const BKLIT_REGISTRY_DEP_RE = /^@bklit\/(.+)$/;

function getPackageName(spec) {
  if (spec.startsWith(".") || spec.startsWith("@/")) {
    return null;
  }
  if (spec.startsWith("@")) {
    const parts = spec.split("/");
    return `${parts[0]}/${parts[1]}`;
  }
  return spec.split("/")[0];
}

function normalizeDep(dep) {
  return dep.replace(DEP_VERSION_SUFFIX_RE, "");
}

/** Import specifiers that are satisfied by @types/* registry dependencies. */
const TYPES_ALIASES = {
  geojson: ["geojson", "@types/geojson"],
};

function isDeclared(pkg, declared) {
  if (declared.has(pkg)) {
    return true;
  }
  const aliases = TYPES_ALIASES[pkg];
  if (aliases) {
    return aliases.some((name) => declared.has(name));
  }
  return false;
}

function scanFiles(files) {
  const used = new Set();
  for (const file of files ?? []) {
    const fullPath = path.join(uiRoot, file.path);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Registry file not found: ${file.path}`);
    }
    const content = fs.readFileSync(fullPath, "utf8");
    importRe.lastIndex = 0;
    let match = importRe.exec(content);
    while (match) {
      const pkg = getPackageName(match[1]);
      if (pkg && pkg !== "react" && pkg !== "react-dom") {
        used.add(pkg);
      }
      match = importRe.exec(content);
    }
  }
  return used;
}

function getRegistryDepName(dep) {
  const m = dep.match(BKLIT_REGISTRY_DEP_RE);
  return m ? m[1] : null;
}

function collectDeclared(name, visited = new Set()) {
  const declared = new Set();
  const visit = (itemName) => {
    if (visited.has(itemName)) {
      return;
    }
    visited.add(itemName);
    const item = byName[itemName];
    if (!item) {
      return;
    }
    for (const dep of item.dependencies ?? []) {
      declared.add(normalizeDep(dep));
    }
    for (const regDep of item.registryDependencies ?? []) {
      const nested = getRegistryDepName(regDep);
      if (nested) {
        visit(nested);
      }
    }
  };
  visit(name);
  return declared;
}

function collectUsed(name, visited = new Set()) {
  const used = new Set();
  const visit = (itemName) => {
    if (visited.has(itemName)) {
      return;
    }
    visited.add(itemName);
    const item = byName[itemName];
    if (!item) {
      return;
    }
    for (const pkg of scanFiles(item.files)) {
      used.add(pkg);
    }
    for (const regDep of item.registryDependencies ?? []) {
      const nested = getRegistryDepName(regDep);
      if (nested) {
        visit(nested);
      }
    }
  };
  visit(name);
  return used;
}

const chartItems = registry.items.filter(
  (item) =>
    item.type === "registry:component" &&
    (item.name.endsWith("-chart") ||
      item.name === "chart-context" ||
      item.name === "chart-animation")
);

const utilityItems = registry.items.filter((item) =>
  ["grid", "x-axis", "y-axis", "chart-tooltip", "legend", "markers"].includes(
    item.name
  )
);

const failures = [];

for (const item of [...chartItems, ...utilityItems]) {
  const declared = collectDeclared(item.name);
  const used = collectUsed(item.name);
  const missing = [...used].filter((pkg) => !isDeclared(pkg, declared)).sort();
  if (missing.length > 0) {
    failures.push({ name: item.name, missing });
  }
}

if (failures.length > 0) {
  console.error("Registry dependency closure check failed:\n");
  for (const { name, missing } of failures) {
    console.error(`  ${name}: missing ${missing.join(", ")}`);
  }
  console.error(
    "\nAdd missing packages to `dependencies` in packages/ui/registry.json (on the item or a registryDependency)."
  );
  process.exit(1);
}

console.log(
  `Registry dependency closure OK (${chartItems.length + utilityItems.length} items checked).`
);
