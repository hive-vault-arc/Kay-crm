import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temporary = mkdtempSync(path.join(realpathSync(tmpdir()), "kay-facade-tls-"));
const openssl = process.platform === "win32" && existsSync("C:/Program Files/Git/usr/bin/openssl.exe")
  ? "C:/Program Files/Git/usr/bin/openssl.exe" : "openssl";
try {
  for (const name of ["trusted", "untrusted"]) {
    const result = spawnSync(openssl, [
      "req", "-x509", "-newkey", "ec", "-pkeyopt", "ec_paramgen_curve:P-256",
      "-nodes", "-days", "1", "-subj", `/CN=KAY synthetic ${name}`,
      "-addext", "subjectAltName=DNS:localhost,DNS:api.synthetic.invalid",
      "-keyout", path.join(temporary, `${name}.key`), "-out", path.join(temporary, `${name}.pem`),
    ], { stdio: "pipe", windowsHide: true });
    if (result.error || result.status !== 0) throw new Error("SYNTHETIC_TLS_FIXTURE_FAILED");
  }
  const environment = { ...process.env };
  for (const key of ["API_BASE_URL", "API_CA_FILE", "FACADE_SECRET", "FRONTEND_ORIGIN",
    "DATABASE_URL", "NODE_OPTIONS", "NODE_TLS_REJECT_UNAUTHORIZED", "NODE_EXTRA_CA_CERTS"])
    delete environment[key];
  const result = spawnSync(process.execPath, [
    "--test", "tests/unit/facade-config.test.mjs", "tests/unit/facade-tls.test.mjs",
    "tests/unit/acceptance-selection.test.mjs",
    "tests/unit/auth-boundary.test.mjs",
    "tests/unit/qualification.test.mjs",
    "tests/unit/activities.test.mjs",
    "tests/unit/users.test.mjs",
    "tests/unit/calendar.test.mjs",
    "tests/unit/projects.test.mjs",
    "tests/unit/directory-filters.test.mjs",
    "tests/unit/owners.test.mjs",
    "tests/unit/generated-documents.test.mjs",
    "tests/unit/project-links.test.mjs",
    "tests/unit/theme.test.mjs",
    "tests/unit/realtime.test.mjs",
    "tests/unit/help.test.mjs",
    "tests/unit/files.test.mjs",
    "tests/unit/test-ports.test.mjs",
  ], {
    cwd: frontend, stdio: "inherit", windowsHide: true,
    env: { ...environment, NODE_EXTRA_CA_CERTS: path.join(temporary, "trusted.pem"), KAY_FACADE_TEST_CERTS: temporary },
  });
  if (result.error) throw new Error("FACADE_TEST_PROCESS_FAILED");
  process.exitCode = result.status ?? 1;
} finally {
  const resolved = realpathSync(temporary);
  if (path.dirname(resolved) !== realpathSync(tmpdir()) || !path.basename(resolved).startsWith("kay-facade-tls-"))
    throw new Error("UNSAFE_TEST_FIXTURE_CLEANUP");
  rmSync(resolved, { recursive: true });
}
