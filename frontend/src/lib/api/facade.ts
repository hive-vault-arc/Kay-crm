import "server-only";
import { readFile } from "node:fs/promises";
import { request } from "node:https";
import { z } from "zod";
import { frenchApiError } from "./errors";

const healthResponse = z.object({ status: z.enum(["live", "ready"]) }).strict();
const safeError = z.object({
  error: z.object({ code: z.string(), request_id: z.string().optional() }),
});

export function facadeError(status: number, code: string, requestId: string) {
  return Response.json(
    { error: { code, message: frenchApiError(code), field_errors: {}, request_id: requestId } },
    { status, headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } },
  );
}

export async function upstreamRequest(path: string, requestId: string, options: {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"; body?: string; token?: string; csrf?: string; origin?: string; idempotencyKey?: string; maxResponseBytes?: number; timeoutMs?: number;
} = {}) {
  let origin: URL;
  try { origin = new URL(process.env.API_BASE_URL ?? ""); }
  catch { throw new Error("INVALID_SERVER_CONFIGURATION"); }
  const secret = process.env.FACADE_SECRET;
  const authorityFile = process.env.API_CA_FILE;
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname);
  if (
    origin.protocol !== "https:" ||
    origin.pathname !== "/" || origin.username || origin.password || origin.search ||
    origin.hash || !secret || secret.length < 32 || (local && !authorityFile)
  ) throw new Error("INVALID_SERVER_CONFIGURATION");
  let target: URL;
  try { target = new URL(path, origin); }
  catch { throw new Error("INVALID_UPSTREAM_TARGET"); }
  if (!path.startsWith("/api/v1/") || target.origin !== origin.origin ||
    !target.pathname.startsWith("/api/v1/") || target.username || target.password || target.hash)
    throw new Error("INVALID_UPSTREAM_TARGET");
  // Remote HTTPS keeps Node's default trust store and hostname verification.
  const tls = local ? { ca: await readFile(authorityFile!) } : {};
  return new Promise<{ status: number; body: unknown }>((resolve, reject) => {
    const outgoing = request(target, {
      method: options.method ?? "GET", ...tls, rejectUnauthorized: true,
      ...(origin.hostname === "localhost" ? { family: 4 } : {}),
      headers: {
        Accept: "application/json", "X-Kay-Facade-Secret": secret,
        "X-Request-ID": requestId,
        ...(options.body !== undefined ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(options.body) } : {}),
        ...(options.token ? { "X-Kay-Session": options.token } : {}),
        ...(options.csrf ? { "X-CSRF-Token": options.csrf } : {}),
        ...(options.origin ? { Origin: options.origin } : {}),
        ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
      },
    }, (incoming) => {
      const chunks: Buffer[] = [];
      let size = 0;
      incoming.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > (options.maxResponseBytes ?? 256 * 1024)) outgoing.destroy(new Error("RESPONSE_TOO_LARGE"));
        else chunks.push(chunk);
      });
      incoming.on("error", reject);
      incoming.on("end", () => {
        try {
          resolve({ status: incoming.statusCode ?? 502, body: JSON.parse(Buffer.concat(chunks).toString("utf8")) });
        } catch { reject(new Error("INVALID_UPSTREAM_RESPONSE")); }
      });
    });
    const timeout = setTimeout(() => outgoing.destroy(new Error("UPSTREAM_TIMEOUT")), options.timeoutMs ?? 6_000);
    outgoing.once("close", () => clearTimeout(timeout));
    outgoing.once("error", reject);
    outgoing.end(options.body);
  });
}

export async function relayHealth(path: string, requestId: string) {
  try {
    const upstream = await upstreamRequest(path, requestId);
    if (upstream.status !== 200) {
      const parsed = safeError.safeParse(upstream.body);
      const forbidden = upstream.status === 403 && parsed.success && parsed.data.error.code === "FORBIDDEN";
      return facadeError(forbidden ? 403 : 503, forbidden ? "FORBIDDEN" : "DEPENDENCY_UNAVAILABLE", requestId);
    }
    const parsed = healthResponse.safeParse(upstream.body);
    const expected = path.endsWith("/ready") ? "ready" : "live";
    if (!parsed.success || parsed.data.status !== expected)
      return facadeError(502, "INVALID_RESPONSE", requestId);
    return Response.json(parsed.data, {
      headers: { "Cache-Control": "no-store", "X-Request-ID": requestId },
    });
  } catch {
    return facadeError(503, "DEPENDENCY_UNAVAILABLE", requestId);
  }
}
