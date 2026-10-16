import { readFile } from "node:fs/promises";
import { createServer } from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";
import next from "next";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const certificates = path.resolve(root, "../backend/.local-data/certificates");
const arguments_ = process.argv.slice(2);
const port = arguments_.length === 2 && arguments_[0] === "--port" ? Number(arguments_[1]) : 3000;
if ((arguments_.length && (arguments_.length !== 2 || arguments_[0] !== "--port")) || !Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("INVALID_LOCAL_SERVER_PORT");

const [key, cert] = await Promise.all([
  readFile(path.join(certificates, "localhost-key.pem")), readFile(path.join(certificates, "localhost.pem")),
]);
const server = createServer({ key, cert }, (request, response) => {
  void handler(request, response).catch(() => {
    if (!response.headersSent) response.writeHead(500, { "Cache-Control": "no-store" });
    response.end();
  });
});
// Passing the real HTTPS server lets Next own its development WebSocket/HMR handler.
const app = next({ dev: true, dir: root, hostname: "localhost", port, httpServer: server });
await app.prepare();
const handler = app.getRequestHandler();

let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  server.close();
  await app.close();
  server.closeAllConnections();
  process.exit(0);
}
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { void shutdown(); });
process.on("message", message => { if (message === "shutdown") void shutdown(); });
process.on("disconnect", () => { void shutdown(); });
server.on("error", () => {
  console.error("FRONTEND_START_FAILED: verify the port is available and local certificates exist.");
  process.exitCode = 1;
  void app.close();
});
server.listen(port, "localhost", () => console.info(`Local development HTTPS: https://localhost:${port}`));
