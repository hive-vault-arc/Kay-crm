import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

try { process.loadEnvFile(".env.local"); } catch { throw new Error("PRIVATE_SCAN_CONFIGURATION_REQUIRED"); }
const secret = process.env.FACADE_SECRET;
if (!secret || secret.length < 32) throw new Error("PRIVATE_SCAN_CONFIGURATION_REQUIRED");
const signingSecrets = [];
for (const environment of ["development", "test"]) {
  const raw = await readFile(`../backend/.local-data/website/${environment}.json`, "utf8").catch(error => {
    if (error.code === "ENOENT") return null;
    throw new Error("PRIVATE_SCAN_CONFIGURATION_REQUIRED");
  });
  if (raw !== null) {
    let key;
    try { key = JSON.parse(raw); } catch { throw new Error("PRIVATE_SCAN_CONFIGURATION_REQUIRED"); }
    if (typeof key.secret !== "string" || key.secret.length < 43) throw new Error("PRIVATE_SCAN_CONFIGURATION_REQUIRED");
    signingSecrets.push(key.secret);
  }
}

async function walk(root) {
  const entries = await readdir(root, { withFileTypes: true }).catch(error => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const nested = await Promise.all(entries.map(entry => entry.isDirectory()
    ? walk(path.join(root, entry.name))
    : entry.name.endsWith(".js") ? [path.join(root, entry.name)] : []));
  return nested.flat();
}

const roots = [".next/static", ".next/dev/static", ".next-e2e/static", ".next-e2e/dev/static"];
const files = [...new Set((await Promise.all(roots.map(walk))).flat())];
let occurrences = 0;
let signingOccurrences = 0;
for (const file of files) {
  const source = await readFile(file, "utf8");
  if (source.includes(secret)) occurrences++;
  if (signingSecrets.some(key => source.includes(key))) signingOccurrences++;
}
console.log(JSON.stringify({ roots_checked: roots.length, browser_js_files_scanned: files.length,
  configured_facade_secret_occurrences: occurrences, configured_signing_keys_scanned: signingSecrets.length,
  configured_signing_key_occurrences: signingOccurrences }));
if (!files.length || occurrences || signingOccurrences) process.exitCode = 1;
