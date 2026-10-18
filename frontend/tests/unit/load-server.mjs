import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);

// Compile the actual server modules in memory; only Next request-context hooks are substituted.
export function loadServer(relative, { env = {}, modules = {} } = {}) {
  const filename = path.join(frontend, relative);
  const source = readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loadedModule = { exports: {} };
  function scopedRequire(name) {
    if (Object.hasOwn(modules, name)) return modules[name];
    if (name === "server-only") return {};
    if (name === "./errors") return loadServer("src/lib/api/errors.ts", { env, modules });
    if (name === "./contracts") return loadServer("src/lib/auth/contracts.ts", { env, modules });
    if (name.startsWith("node:") || name === "zod") return require(name);
    throw new Error("UNEXPECTED_SERVER_TEST_IMPORT");
  }
  runInNewContext(compiled, {
    exports: loadedModule.exports, module: loadedModule, require: scopedRequire,
    process: { env }, Buffer, URL, URLSearchParams, Response, setTimeout, clearTimeout,
  }, { filename });
  return loadedModule.exports;
}

export function serverEnvironment(extra = {}) {
  return { API_BASE_URL: "https://api.synthetic.invalid", FACADE_SECRET: randomBytes(32).toString("hex"), ...extra };
}
