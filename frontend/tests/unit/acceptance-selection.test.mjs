import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

test("acceptance discovery retains staff onboarding and conversion in every representative profile", () => {
  const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const report = JSON.parse(execFileSync(process.execPath, [
    path.join(frontend, "node_modules/@playwright/test/cli.js"), "test",
    "--config=playwright.acceptance.config.ts", "--list", "--reporter=json",
  ], { cwd: frontend, windowsHide: true, timeout: 30000, maxBuffer: 2_000_000, stdio: ["ignore", "pipe", "pipe"] }));
  assert.deepEqual(report.errors, []);
  const profiles = new Map(["chrome-final", "edge-final", "mobile-chromium-final", "mobile-webkit-final"].map(name => [name, []]));
  function collect(suite) {
    for (const spec of suite.specs ?? []) for (const entry of spec.tests) profiles.get(entry.projectName)?.push(spec.title);
    for (const child of suite.suites ?? []) collect(child);
  }
  report.suites.forEach(collect);
  for (const [name, titles] of profiles) {
    assert.equal(titles.filter(title => title.startsWith("Staff: admin-chosen password, immediate restricted login")).length, 1, name);
    assert.equal(titles.filter(title => title.startsWith("Qualified conversion from Lead, accepted proposal")).length, 1, name);
    if (name !== "chrome-final") assert.equal(titles.length, 19, name);
  }
});
