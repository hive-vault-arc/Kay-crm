import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const git = (args, input) => execFileSync("git", args, { cwd: root, input, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
const entries = git(["ls-files", "--stage", "-z"]).split("\0").filter(Boolean).map(entry => {
  const [metadata, file] = entry.split("\t");
  return { file, ...Object.fromEntries(metadata.split(" ").map((value, i) => [["mode", "hash", "stage"][i], value])) };
});
if (!entries.length) throw new Error("REPOSITORY_INDEX_EMPTY");
const forbidden = /(?:^|\/)(?:node_modules|\.next(?:-e2e)?|\.venv|\.heroku|\.local-data|__pycache__|test-results|playwright-report|coverage|artifacts|certificates|\.pytest_cache|\.ruff_cache|\.mypy_cache)(?:\/|$)|(?:^|\/)\.env(?!\.example$)[^/]*$|\.(?:pem|key|p12|pfx|dump|backup|pgpass|log|pyc|tsbuildinfo)$|(?:^|\/)(?:\.pgpass|pgpass\.conf)$|^docs\/03-planning\/local-database-credentials\.md$|^output\/|^docs\/reference\/bklit-ui\/[^/]+\/packages\/studio\//i;
const issues = entries.filter(entry => forbidden.test(entry.file) || entry.stage !== "0" || !["100644", "100755"].includes(entry.mode)).map(entry => entry.file);
const referenceArchives = JSON.parse(readFileSync(path.join(root, ".github/reference-archives.json"), "utf8"));
for (const entry of entries) {
  if (!/\.(?:zip|tar|gz|tgz|7z|exe|dll|sqlite3?|db)$/i.test(entry.file)) continue;
  const reference = referenceArchives.find(item => item.path === entry.file);
  if (!reference || !entry.file.startsWith("docs/reference/")) { issues.push(entry.file); continue; }
  const bytes = execFileSync("git", ["cat-file", "blob", entry.hash], { cwd: root, maxBuffer: 25 * 1024 * 1024 });
  if (createHash("sha256").update(bytes).digest("hex") !== reference.sha256) issues.push(entry.file);
}
const facts = git(["cat-file", "--batch-check=%(objectsize)"], entries.map(entry => entry.hash).join("\n") + "\n").trim().split("\n");
entries.forEach((entry, i) => { if (!/^\d+$/.test(facts[i]) || Number(facts[i]) > 25 * 1024 * 1024) issues.push(entry.file); });
if (issues.length) {
  console.error("REPOSITORY_CONTENT_REFUSED", [...new Set(issues)]);
  process.exit(1);
}
const required = [".gitignore", ".gitattributes", ".github/workflows/ci.yml", "frontend/package-lock.json", "backend/requirements.txt", "backend/.python-version", "backend/requirements.lock", "backend/requirements-dev.lock", "frontend/THIRD_PARTY_NOTICES.md", "frontend/public/licenses/iconsax.txt"];
for (const file of required) if (!entries.some(entry => entry.file === file)) throw new Error(`REQUIRED_FILE_MISSING: ${file}`);
const probes = ["backend/.env", "frontend/.env.local", "backend/.venv/Scripts/python.exe", "backend/.heroku/python/bin/python", "backend/.local-data/certificates/localhost-key.pem", "docs/03-planning/local-database-credentials.md", "frontend/node_modules/example/index.js", "frontend/.next/server.js", "frontend/test-results/probe.txt", "frontend/playwright-report/index.html", "output/probe.yml", "private.dump", "pgpass.conf", "docs/reference/bklit-ui/probe/packages/studio/index.ts"];
const ignored = git(["check-ignore", "--no-index", "--stdin"], probes.join("\n") + "\n").trim().split("\n");
if (probes.some(file => !ignored.includes(file))) throw new Error("IGNORE_RULE_REGRESSION");
console.info(JSON.stringify({ indexed_files: entries.length, forbidden_or_oversized_files: 0, ignore_probes: probes.length }));
