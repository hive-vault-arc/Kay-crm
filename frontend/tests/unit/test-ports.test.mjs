import assert from "node:assert/strict";
import test from "node:test";
import { testPorts } from "../../scripts/test-ports.mjs";

test("isolated browser ports keep current defaults and accept a separate loopback stack", () => {
  assert.deepEqual(testPorts({}), { api: 8100, frontend: 3100, control: 8101, simulator: 8102 });
  assert.deepEqual(testPorts({ KAY_E2E_API_PORT: "8110", KAY_E2E_FRONTEND_PORT: "3110", KAY_E2E_CONTROL_PORT: "8111", KAY_E2E_SIMULATOR_PORT: "8112" }), { api: 8110, frontend: 3110, control: 8111, simulator: 8112 });
});
test("isolated browser ports reject malformed, privileged, out-of-range and conflicting values", () => {
  for (const value of ["", "80", "0", "-1", "8110; command", "https://example.com", "65536", "08110", "8110.5"]) assert.throws(() => testPorts({ KAY_E2E_API_PORT: value }), /INVALID_ISOLATED_TEST_PORT/);
  assert.throws(() => testPorts({ KAY_E2E_API_PORT: "3100" }), /CONFLICTING_ISOLATED_TEST_PORTS/);
});
