export function testPorts(environment = process.env) {
  const defaults = { api: 8100, frontend: 3100, control: 8101, simulator: 8102 };
  const ports = Object.fromEntries(Object.entries(defaults).map(([name, fallback]) => {
    const value = environment[`KAY_E2E_${name.toUpperCase()}_PORT`];
    if (value !== undefined && (!/^[1-9][0-9]{3,4}$/.test(value) || Number(value) < 1024 || Number(value) > 65535)) throw new Error("INVALID_ISOLATED_TEST_PORT");
    return [name, value === undefined ? fallback : Number(value)];
  }));
  if (new Set(Object.values(ports)).size !== Object.keys(defaults).length) throw new Error("CONFLICTING_ISOLATED_TEST_PORTS");
  return ports;
}
