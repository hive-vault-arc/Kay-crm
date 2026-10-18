import { readFile } from "node:fs/promises";
import path from "node:path";

export async function apiProcess(action: "start" | "stop") {
  await testControl(action);
}

export async function testControl(action: "start" | "stop" | "fixture" | "worker-start" | "worker-stop" | "worker-unavailable" | "worker-status" | "simulator-start" | "simulator-stop" | "simulator-status" | "recovery-start" | "recovery-stop", body?: object): Promise<unknown> {
  const control = JSON.parse(await readFile(
    path.resolve("../backend/.local-data/e2e-api-control.json"), "utf8",
  )) as { url: string; token: string };
  const response = await fetch(`${control.url}/${action}`, {
    method: "POST", headers: { Authorization: control.token },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(action === "fixture" && body && "action" in body && ["recovery-prepare", "recovery-run"].includes(String(body.action)) ? 90_000 : action === "fixture" ? 60_000 : action === "worker-start" || action === "worker-unavailable" ? 45_000 : 15_000),
  });
  if (!response.ok) {
    let suffix = "";
    try {
      const failure = await response.json();
      if (["TEST_API_PROCESS_REPLACED", "TEST_API_PROCESS_EXITED", "TEST_API_READINESS_TIMEOUT"].includes(failure.code)) suffix = `_${failure.code}`;
    } catch { /* Older supervisors may return an empty failure body. */ }
    throw new Error(`TEST_API_PROCESS_CONTROL_FAILED_${action}${suffix}`);
  }
  return response.json();
}
