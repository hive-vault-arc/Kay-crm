import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { requiredJobs, requireSuccessfulJobs } from "./required-check.mjs";

const successful = () => Object.fromEntries(requiredJobs.map(name => [name, { result: "success" }]));

test("aggregate accepts exactly the automatic prerequisite set", () => {
  requireSuccessfulJobs(JSON.stringify(successful()));
});

for (const result of ["failure", "cancelled", "skipped", "pending", null]) {
  test(`aggregate rejects ${result} for every required job`, () => {
    for (const name of requiredJobs) {
      const results = successful(); results[name].result = result;
      assert.throws(() => requireSuccessfulJobs(JSON.stringify(results)));
    }
  });
}

test("aggregate rejects missing, extra, renamed and malformed results", () => {
  for (const name of requiredJobs) {
    const results = successful(); delete results[name];
    assert.throws(() => requireSuccessfulJobs(JSON.stringify(results)));
  }
  assert.throws(() => requireSuccessfulJobs(JSON.stringify({ ...successful(), integration: { result: "success" } })));
  assert.throws(() => requireSuccessfulJobs(JSON.stringify({ ...successful(), backend: undefined, regression: { result: "success" } })));
  for (const input of ["null", "[]", "{}", "false", "not-json"])
    assert.throws(() => requireSuccessfulJobs(input));
});

test("only manual workflow contains database services, migrations and integration execution", () => {
  const automatic = readFileSync(new URL("../workflows/ci.yml", import.meta.url), "utf8");
  const manual = readFileSync(new URL("../workflows/integration-manual.yml", import.meta.url), "utf8");
  assert.match(automatic, /needs: \[repository, frontend, backend, managed-runtime\]/);
  assert.match(automatic, /if: \$\{\{ always\(\) \}\}/);
  assert.match(automatic, /node \.github\/scripts\/required-check\.mjs/);
  assert.match(automatic, /python\.exe -m tests\.unit_runner/);
  assert.match(automatic, /buildpack-smoke\.py/);
  assert.match(automatic, /npm run test:unit/);
  assert.doesNotMatch(automatic, /windows-services|tests\.ci_setup|alembic upgrade|test:e2e|playwright install|continue-on-error/);
  const triggers = manual.split("permissions:")[0];
  assert.match(triggers, /^  workflow_dispatch:/m);
  assert.doesNotMatch(triggers, /^  (push|pull_request|merge_group|schedule|workflow_call|workflow_run):/m);
  for (const pattern of [/windows-services/, /tests\.ci_setup/, /alembic upgrade head/, /pytest -q/, /test:e2e/, /Stop only this disposable/])
    assert.match(manual, pattern);
  assert.doesNotMatch(manual, /continue-on-error|\$\{\{\s*secrets\.|pull_request_target/);
  const matrix = manual.match(/include: \$\{\{ fromJSON\(inputs\.browser_scope == 'full' && '([^']+)' \|\| '([^']+)'\) \}\}/);
  assert.ok(matrix, "full and diagnostic matrices must be explicit");
  const full = JSON.parse(matrix[1]);
  assert.deepEqual(full.filter(job => job.suite === "backend"), [{ suite: "backend", shard: 1 }]);
  assert.deepEqual(full.filter(job => job.suite === "browser").map(job => job.shard), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(full.length, 9);
  assert.deepEqual(JSON.parse(matrix[2]), [{ suite: "browser", shard: 1 }]);
  assert.match(manual, /--shard="\$env:BROWSER_SHARD\/8"/);
  assert.match(manual, /BROWSER_SHARD: \$\{\{ matrix\.shard \}\}/);
  assert.equal((manual.match(/if: matrix\.suite == 'browser' && matrix\.shard == 1 && inputs\.browser_scope == 'full'/g) ?? []).length, 2);
  assert.match(triggers, /browser_scope:[\s\S]*default: full/);
  const releaseGate = manual.split("  release-integration:")[1];
  // A skipped required-name job is treated as success by branch protection.
  // Diagnostic runs must emit a different check name instead of skipping it.
  assert.match(releaseGate, /name: \$\{\{ inputs\.browser_scope == 'full' && 'Release integration required' \|\| 'Browser diagnostic only' \}\}/);
  assert.match(releaseGate, /if: \$\{\{ always\(\) \}\}/);
  assert.match(releaseGate, /needs: \[integration\]/);
  assert.match(releaseGate, /test "\$RESULT" = success/);
});
