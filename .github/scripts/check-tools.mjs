import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const name = process.argv[2];
if (!["gitleaks", "actionlint"].includes(name) || process.argv.length > 4) throw new Error("INVALID_TOOL");
const staged = process.argv[3] === "--staged";
if (process.argv[3] && (!staged || name !== "gitleaks")) throw new Error("INVALID_TOOL_ARGUMENT");
const manifest = JSON.parse(await readFile(path.join(root, ".github/tool-versions.json"), "utf8"))[name];
const platform = manifest[process.platform];
if (!platform || process.arch !== "x64") throw new Error("UNSUPPORTED_CHECK_PLATFORM");
const directory = path.join(root, ".local-data/ci-tools", `${name}-${manifest.version}-${process.platform}`);
await mkdir(directory, { recursive: true });
const archive = path.join(directory, platform.file);
let bytes;
try { bytes = await readFile(archive); } catch (error) { if (error.code !== "ENOENT") throw error; }
if (!bytes) {
  const response = await fetch(`https://github.com/${manifest.repository}/releases/download/${manifest.tag}/${platform.file}`);
  if (!response.ok) throw new Error("CHECK_TOOL_DOWNLOAD_FAILED");
  bytes = Buffer.from(await response.arrayBuffer());
  if (createHash("sha256").update(bytes).digest("hex") !== platform.sha256) throw new Error("CHECK_TOOL_INTEGRITY_FAILED");
  await writeFile(archive, bytes, { flag: "wx" });
}
if (createHash("sha256").update(bytes).digest("hex") !== platform.sha256) throw new Error("CHECK_TOOL_INTEGRITY_FAILED");
if (process.platform === "win32") {
  const escape = value => value.replaceAll("'", "''");
  execFileSync("powershell.exe", ["-NoProfile", "-Command", `Expand-Archive -LiteralPath '${escape(archive)}' -DestinationPath '${escape(directory)}' -Force`], { stdio: "inherit", windowsHide: true });
} else execFileSync("tar", ["-xzf", archive, "-C", directory], { stdio: "inherit" });
const binary = path.join(directory, `${name}${process.platform === "win32" ? ".exe" : ""}`);
await chmod(binary, 0o755);
const args = name === "gitleaks"
  ? ["git", ...(staged ? ["--staged", "--pre-commit"] : []), "--redact=100", "--no-banner", "--no-color", "--ignore-gitleaks-allow", "--max-decode-depth=5", "--timeout=180"]
  : ["-color", "-shellcheck=", "-pyflakes="];
try { execFileSync(binary, args, { cwd: root, stdio: "inherit", windowsHide: true }); }
catch (error) { process.exit(typeof error.status === "number" ? error.status : 1); }
