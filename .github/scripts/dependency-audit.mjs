import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { evaluateAudits } from "./dependency-policy.mjs";

if (!process.env.npm_execpath) throw new Error("RUN_WITH_NPM_RUN_SECURITY_CHECK");
function audit(args) {
  let output;
  try { output = execFileSync(process.execPath, [process.env.npm_execpath, "audit", "--json", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 8 * 1024 * 1024 }); }
  catch (error) {
    if (error.status !== 1 || !error.stdout) throw new Error("DEPENDENCY_AUDIT_UNAVAILABLE");
    output = error.stdout;
  }
  let report;
  try { report = JSON.parse(output); } catch { throw new Error("DEPENDENCY_AUDIT_INVALID"); }
  if (report.error) throw new Error("DEPENDENCY_AUDIT_UNAVAILABLE");
  return report;
}
const exception = JSON.parse(readFileSync(fileURLToPath(new URL("../dependency-exceptions.json", import.meta.url)), "utf8"));
const result = evaluateAudits(audit(["--omit=dev"]), audit([]), exception);
console.info(JSON.stringify(result));
if (result.exceptions_used) console.info("Existing unpatched dev-only advisory uses the user-approved temporary exception. This is not a clean full dependency audit.");
