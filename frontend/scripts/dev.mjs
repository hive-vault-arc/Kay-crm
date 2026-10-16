import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const certificates = path.resolve(root, "../backend/.local-data/certificates");
const child = spawn(process.execPath, [
  path.join(root, "scripts/dev-server.mjs"), ...process.argv.slice(2),
], { cwd: root, stdio: ["inherit", "inherit", "inherit", "ipc"], windowsHide: true,
  env: { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => key !== "FORCE_COLOR" || !("NO_COLOR" in process.env))), NODE_ENV: "development", NODE_EXTRA_CA_CERTS: path.join(certificates, "ca.pem") } });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => {
  if (child.connected) child.send("shutdown");
  else child.kill();
});
child.on("error", () => { console.error("FRONTEND_START_FAILED: verify Node.js and local certificate setup."); process.exitCode = 1; });
child.on("exit", (code) => process.exit(code ?? 1));
