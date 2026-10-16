import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateAudits } from "./dependency-policy.mjs";

const clean = () => ({ metadata: { vulnerabilities: { total: 0 } }, vulnerabilities: {} });
const exception = { advisory: "GHSA-vfj7-8cjw-p6xm", scope: "development-only", expires: "2026-11-15T00:00:00Z" };
const beforeExpiry = new Date("2026-10-16T00:00:00Z");
function inherited() {
  return { metadata: { vulnerabilities: { total: 2 } }, vulnerabilities: {
    braces: { severity: "high", via: [{ name: "braces", severity: "high", url: "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm" }] },
    parent: { severity: "high", via: ["braces"] },
  } };
}
test("clean runtime/full audit needs no exception, even after expiry", () => {
  assert.equal(evaluateAudits(clean(), clean(), exception, new Date("2027-01-01")).exceptions_used, 0);
});
test("only the existing dev-only advisory chain is temporarily permitted", () => {
  assert.equal(evaluateAudits(clean(), inherited(), exception, beforeExpiry).exceptions_used, 1);
});
test("the same vulnerability in runtime always fails", () => {
  assert.throws(() => evaluateAudits(inherited(), inherited(), exception, beforeExpiry), /RUNTIME_VULNERABILITY_REFUSED/);
});
test("a different advisory fails", () => {
  const report = inherited();
  report.vulnerabilities.braces.via[0].url = "https://github.com/advisories/GHSA-new-advisory";
  assert.throws(() => evaluateAudits(clean(), report, exception, beforeExpiry), /NEW_VULNERABILITY_REFUSED/);
});
test("critical escalation fails", () => {
  const report = inherited();
  report.vulnerabilities.braces.severity = "critical";
  assert.throws(() => evaluateAudits(clean(), report, exception, beforeExpiry), /NEW_VULNERABILITY_REFUSED/);
});
test("expiry is exclusive and fails closed", () => {
  assert.throws(() => evaluateAudits(clean(), inherited(), exception, new Date(exception.expires)), /DEV_EXCEPTION_EXPIRED_OR_INVALID/);
});
test("missing report metadata fails", () => {
  assert.throws(() => evaluateAudits({}, inherited(), exception, beforeExpiry), /DEPENDENCY_AUDIT_INVALID/);
});
test("a dependency cycle fails instead of bypassing the gate", () => {
  const report = inherited();
  report.vulnerabilities.braces.via = ["parent"];
  assert.throws(() => evaluateAudits(clean(), report, exception, beforeExpiry), /DEPENDENCY_AUDIT_CYCLE/);
});
