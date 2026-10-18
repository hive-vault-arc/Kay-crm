// Test-process supervision only. This is not an API route or product failure switch.
import { execFile, spawn } from "node:child_process";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { request as httpsRequest } from "node:https";
import path from "node:path";
import { setTimeout as pause } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../backend");
const token = randomBytes(32).toString("hex");
const port = 8100;
let child;
let worker;
let simulator;
let simulatorExit;
let simulatorFailure = "";
let simulatorStarted = 0;
let workerExit;
let workerFailure = "";
let workerReady = false;
let workerCycles = 0;
let changing = false;
let lease;
let shuttingDown = false;
let activeEnvironment = "test";
async function acquireLease() {
  lease = spawn(path.join(backend, ".venv/Scripts/python.exe"), ["-m", "tests.run_lock"], {
    cwd: backend, windowsHide: true, stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, APP_ENVIRONMENT: "test" },
  });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("ISOLATED_TEST_LEASE_REFUSED")), 10000);
    lease.once("error", () => { clearTimeout(timeout); reject(new Error("ISOLATED_TEST_LEASE_REFUSED")); });
    lease.once("exit", () => { clearTimeout(timeout); reject(new Error("ISOLATED_TEST_LEASE_REFUSED")); });
    lease.stdout.once("data", chunk => {
      clearTimeout(timeout);
      if (chunk.toString().trim() === "ISOLATED_TEST_LEASE_READY") resolve();
      else reject(new Error("ISOLATED_TEST_LEASE_REFUSED"));
    });
  });
}
async function fixture(command) {
  const recovery = command.action === "recovery-prepare";
  const resumeWorker = Boolean(worker) && ["clear", "delete", "delete-bulk", "work-run"].includes(command.action);
  if (recovery) await stopWorker();
  if (resumeWorker) await stopWorker();
  try { return await new Promise((resolve, reject) => {
    const task = execFile(path.join(backend, ".venv/Scripts/python.exe"), ["-m", "tests.e2e_fixture"], {
      cwd: backend, windowsHide: true, timeout: recovery || command.action === "recovery-run" ? 90_000 : 20_000,
      env: { ...process.env, APP_ENVIRONMENT: "test" },
    }, (error, stdout) => {
      if (error) reject(new Error("ISOLATED_FIXTURE_FAILED"));
      else { try { resolve(JSON.parse(stdout)); } catch { reject(new Error("INVALID_FIXTURE_RESPONSE")); } }
    });
    task.stdin.end(JSON.stringify(command));
  }); } finally { if (resumeWorker && !shuttingDown) await startWorker(); }
}
async function startWorker(unavailable = false) {
  workerExit = undefined; workerFailure = ""; workerReady = false; workerCycles = 0;
  const running = spawn(path.join(backend, ".venv/Scripts/python.exe"), ["-m", "tests.supervised_worker"], {
    cwd: backend, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, APP_ENVIRONMENT: activeEnvironment, ANTIVIRUS_PORT: unavailable ? "1" : "3310" },
  });
  worker = running;
  running.on("error", () => { process.exitCode = 1; });
  running.stderr.on("data", chunk => {
    workerCycles += (chunk.toString().match(/KAY_TEST_WORKER_CYCLE/g) ?? []).length;
    const match = chunk.toString().match(/(?:RuntimeError|IdentityError): ([A-Z_]{4,80})|(?:sqlalchemy\.exc\.|psycopg\.errors\.)([A-Za-z]{3,60})/);
    if (match) workerFailure = match[1] ?? match[2];
  });
  running.once("exit", code => { if (worker === running) { workerExit = code; worker = undefined; workerReady = false; } });
  try { await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("REAL_WORKER_READINESS_TIMEOUT")), 30_000);
    let output = "";
    running.once("error", () => { clearTimeout(timeout); reject(new Error("REAL_WORKER_START_FAILED")); });
    running.once("exit", () => { clearTimeout(timeout); reject(new Error("REAL_WORKER_START_FAILED")); });
    running.stdout.on("data", chunk => {
      output += chunk.toString();
      if (output.length > 128) { clearTimeout(timeout); reject(new Error("UNEXPECTED_WORKER_OUTPUT")); }
      else if (output.trim() === "KAY_TEST_WORKER_READY") {
        clearTimeout(timeout); workerReady = true; resolve();
      }
    });
  }); } catch (error) { if (worker === running) await stopWorker(); throw error; }
}
async function stopWorker() {
  const running = worker;
  if (!running) return;
  const exited = new Promise(resolve => running.once("exit", resolve));
  if (process.platform === "win32") await new Promise(resolve => execFile("taskkill.exe", ["/PID", String(running.pid), "/T", "/F"], { windowsHide: true }, resolve));
  else running.kill();
  await exited;
}
async function startSimulator() {
  if (simulator) return;
  simulatorExit = undefined; simulatorFailure = "";
  simulatorStarted = performance.now();
  const running = spawn(path.join(backend, ".venv/Scripts/python.exe"), ["-m", "app.cli.website_simulator", "--environment", "test", "--port", "8102", "--api-port", "8100", "--frontend-port", "3100"], {
    cwd: backend, windowsHide: true, stdio: ["ignore", "ignore", "pipe"],
    env: { ...process.env, APP_ENVIRONMENT: "test" },
  });
  simulator = running;
  running.stderr.on("data", chunk => { if (chunk.toString().includes("SIMULATOR_START_FAILED:")) simulatorFailure = "SIMULATOR_START_FAILED"; });
  running.once("exit", code => { if (simulator === running) { simulatorExit = code; simulator = undefined; } });
  running.on("error", () => { process.exitCode = 1; });
}
async function stopSimulator() {
  const running = simulator;
  if (!running) return;
  const exited = new Promise(resolve => running.once("exit", resolve));
  if (process.platform === "win32") await new Promise(resolve => execFile("taskkill.exe", ["/PID", String(running.pid), "/T", "/F"], { windowsHide: true }, resolve));
  else running.kill();
  await exited;
}
async function waitForLive(running) {
  const ca = await readFile(path.join(backend, ".local-data/certificates/ca.pem"));
  const deadline = performance.now() + 10_000;
  while (performance.now() < deadline) {
    if (running.exitCode !== null || running.signalCode !== null) throw new Error("TEST_API_PROCESS_EXITED");
    if (child !== running) throw new Error("TEST_API_PROCESS_REPLACED");
    const live = await new Promise(resolve => {
      const probe = httpsRequest("https://localhost:8100/api/v1/health/live", { ca, rejectUnauthorized: true, family: 4 }, response => {
        const chunks = []; let size = 0;
        response.on("data", chunk => { size += chunk.length; if (size > 128) probe.destroy(); else chunks.push(chunk); });
        response.on("error", () => resolve(false));
        response.on("end", () => {
          try { const body = JSON.parse(Buffer.concat(chunks).toString("utf8")); resolve(response.statusCode === 200 && Object.keys(body).length === 1 && body.status === "live"); }
          catch { resolve(false); }
        });
      });
      probe.setTimeout(750, () => probe.destroy());
      probe.on("error", () => resolve(false));
      probe.end();
    });
    if (live && child === running && running.exitCode === null) return;
    await pause(100);
  }
  throw new Error("TEST_API_READINESS_TIMEOUT");
}
async function start() {
  child = spawn(path.join(backend, ".venv/Scripts/python.exe"), [
    "-m", "app.cli.serve", "--environment", activeEnvironment, "--port", String(port),
  ], { cwd: backend, stdio: "inherit", windowsHide: true, env: { ...process.env, FRONTEND_ORIGIN: "https://localhost:3100" } });
  child.on("error", () => { process.exitCode = 1; });
  child.once("exit", () => { child = undefined; });
  await waitForLive(child);
}
async function stop() {
  const running = child;
  if (!running) return;
  const exited = new Promise(resolve => running.once("exit", resolve));
  if (process.platform === "win32") {
    // Wait for the exact launcher's entire tree, not its earlier parent exit.
    await new Promise(resolve => execFile("taskkill.exe", ["/PID", String(running.pid), "/T", "/F"], { windowsHide: true }, resolve));
  } else running.kill();
  await exited;
}
const server = createServer(async (request, response) => {
  const supplied = Buffer.from(request.headers.authorization ?? "");
  const expected = Buffer.from(token);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    response.writeHead(404).end();
    return;
  }
  if (changing || request.method !== "POST" || !["/start", "/stop", "/fixture", "/worker-start", "/worker-stop", "/worker-unavailable", "/worker-status", "/simulator-start", "/simulator-stop", "/simulator-status", "/recovery-start", "/recovery-stop"].includes(request.url)) {
    response.writeHead(409).end();
    return;
  }
  changing = true;
  try {
    let result = { running: Boolean(child) };
    if (request.url === "/fixture") {
      const chunks = [];
      let size = 0;
      for await (const chunk of request) {
        size += chunk.length;
        if (size > 4096) throw new Error("INVALID_FIXTURE_COMMAND");
        chunks.push(chunk);
      }
      result = await fixture(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    } else if (request.url === "/recovery-start" || request.url === "/recovery-stop") {
      await stopWorker(); await stopSimulator(); await stop();
      activeEnvironment = request.url === "/recovery-start" ? "recovery" : "test";
      await start();
    } else if (request.url === "/worker-status") result = { running: Boolean(worker), ready: workerReady, cycles: workerCycles, exit: workerExit ?? null, failure: workerFailure, exports: await fixture({ action: "queue-status" }) };
    else if (request.url === "/simulator-start") await startSimulator();
    else if (request.url === "/simulator-stop") await stopSimulator();
    else if (request.url === "/simulator-status") result = { running: Boolean(simulator), exit: simulatorExit ?? null, failure: simulatorFailure, elapsedMs: Math.round(performance.now() - simulatorStarted) };
    else if (request.url === "/worker-stop") await stopWorker();
    else if (request.url === "/worker-start" || request.url === "/worker-unavailable") { await stopWorker(); await startWorker(request.url === "/worker-unavailable"); }
    else if (request.url === "/stop") await stop();
    else if (!child) await start();
    else await waitForLive(child);
    response.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    response.end(JSON.stringify(result));
  } catch (error) {
    const code = error instanceof Error && ["TEST_API_PROCESS_REPLACED", "TEST_API_PROCESS_EXITED", "TEST_API_READINESS_TIMEOUT"].includes(error.message) ? error.message : "TEST_CONTROL_FAILED";
    response.writeHead(500, { "Content-Type": "application/json", "Cache-Control": "no-store" }).end(JSON.stringify({ code }));
  } finally { changing = false; }
});
try { await acquireLease(); }
catch { console.error("Isolated test target already in use or unavailable; no fixture cleanup performed."); lease?.stdin.end(); process.exit(1); }
lease.once("exit", async () => {
  if (!shuttingDown) {
    changing = true;
    console.error("Isolated test lease lost; supervisor stopped.");
    await stop();
    await stopWorker();
    await stopSimulator();
    server.close(() => process.exit(1));
  }
});
server.listen(8101, "127.0.0.1", async () => {
  const directory = path.join(backend, ".local-data");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "e2e-api-control.json"), JSON.stringify({
    url: "http://127.0.0.1:8101", token,
  }));
  try {
    // Interrupted browser runs can leave synthetic actors; refuse any other data.
    await fixture({ action: "clear" });
    await startWorker();
    await start();
  } catch {
    console.error("Guarded isolated fixture cleanup refused.");
    await stopWorker();
    shuttingDown = true; lease.stdin.end();
    server.close(() => process.exit(1));
  }
});
server.on("error", () => { console.error("Isolated API supervisor port unavailable."); process.exit(1); });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, async () => {
  shuttingDown = true;
  await stop();
  await stopWorker();
  await stopSimulator();
  lease.stdin.end();
  server.close(() => process.exit(0));
});
