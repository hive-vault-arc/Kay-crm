export function evaluateAudits(runtime, full, exception, now = new Date()) {
  if (!runtime?.metadata?.vulnerabilities || !full?.metadata?.vulnerabilities || !full.vulnerabilities)
    throw new Error("DEPENDENCY_AUDIT_INVALID");
  if (Object.values(runtime.vulnerabilities ?? {}).length || runtime.metadata.vulnerabilities.total !== 0)
    throw new Error("RUNTIME_VULNERABILITY_REFUSED");
  const entries = Object.entries(full.vulnerabilities);
  if (entries.length !== full.metadata.vulnerabilities.total) throw new Error("DEPENDENCY_AUDIT_INVALID");
  if (!entries.length) return { runtime_vulnerabilities: 0, full_vulnerabilities: 0, exceptions_used: 0 };
  if (exception.scope !== "development-only" || exception.advisory !== "GHSA-vfj7-8cjw-p6xm"
    || !Number.isFinite(Date.parse(exception.expires)) || !Number.isFinite(now.getTime())
    || now.getTime() >= Date.parse(exception.expires)) throw new Error("DEV_EXCEPTION_EXPIRED_OR_INVALID");
  const leaves = (name, visited = new Set()) => {
    if (visited.has(name)) throw new Error("DEPENDENCY_AUDIT_CYCLE");
    const entry = full.vulnerabilities[name];
    if (!entry || !Array.isArray(entry.via) || !entry.via.length || entry.severity === "critical")
      throw new Error("NEW_VULNERABILITY_REFUSED");
    const next = new Set([...visited, name]);
    return entry.via.flatMap(item => typeof item === "string" ? leaves(item, next) : [item]);
  };
  for (const [name] of entries) {
    for (const advisory of leaves(name)) {
      if (advisory.name !== "braces" || advisory.url !== `https://github.com/advisories/${exception.advisory}`
        || advisory.severity !== "high") throw new Error("NEW_VULNERABILITY_REFUSED");
    }
  }
  return { runtime_vulnerabilities: 0, full_vulnerabilities: entries.length, exceptions_used: 1, advisory: exception.advisory, expires: exception.expires };
}
