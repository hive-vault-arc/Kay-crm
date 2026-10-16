// Local production-mode HTTPS smoke server, not a cloud deployment configuration.
import { readFile } from "node:fs/promises";
import { createServer } from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.env.NODE_ENV = "production";
if ("NO_COLOR" in process.env) delete process.env.FORCE_COLOR;
const { default: next } = await import("next");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const certificates = path.resolve(root, "../backend/.local-data/certificates");
const arguments_ = process.argv.slice(2);
const port = arguments_.length === 2 && arguments_[0] === "--port" ? Number(arguments_[1]) : 3000;
if ((arguments_.length && (arguments_.length !== 2 || arguments_[0] !== "--port")) || !Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("INVALID_LOCAL_SERVER_PORT");
const app = next({ dev: false, dir: root, hostname: "localhost", port });
await app.prepare();
const handler = app.getRequestHandler();
const [key, cert] = await Promise.all([
  readFile(path.join(certificates, "localhost-key.pem")), readFile(path.join(certificates, "localhost.pem")),
]);
const server = createServer({ key, cert }, (request, response) => {
  void handler(request, response).catch(() => {
    if (!response.headersSent) response.writeHead(500, { "Cache-Control": "no-store" });
    response.end();
  });
});
server.listen(port, "localhost", () => console.info(`Local production-mode HTTPS: https://localhost:${port}`));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => {
  server.close(() => { void app.close().finally(() => process.exit(0)); });
});
