import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { SESSION_COOKIE } from "@/lib/auth/contracts";
import { boundedJson, frontendOrigin } from "@/lib/auth/facade";
import { facadeError, upstreamRequest } from "@/lib/api/facade";
import { pushBodySchema, pushConfigSchema, pushResultSchema, ticketSchema } from "@/features/realtime/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function relay(request: Request, context: { params: Promise<{ operation: string }> }) {
  const requestId = randomUUID(), { operation } = await context.params;
  const mutation = request.method === "POST";
  if (!(operation === "tickets" && mutation || operation === "push")) return facadeError(404, "NOT_FOUND", requestId);
  if (new URL(request.url).search) return facadeError(422, "VALIDATION_ERROR", requestId);
  if (mutation && request.headers.get("Origin") !== frontendOrigin()) return facadeError(403, "FORBIDDEN", requestId);
  let body: string | undefined;
  if (mutation) {
    try {
      body = JSON.stringify((operation === "push" ? pushBodySchema : z.object({}).strict()).parse(await boundedJson(request)));
    } catch { return facadeError(422, "VALIDATION_ERROR", requestId); }
  }
  try {
    const response = await upstreamRequest(`/api/v1/realtime/${operation}`, requestId, {
      method: mutation ? "POST" : "GET", body,
      token: (await cookies()).get(SESSION_COOKIE)?.value,
      csrf: request.headers.get("X-CSRF-Token")?.slice(0, 128),
      origin: mutation ? frontendOrigin() : undefined,
    });
    if (response.status !== 200) {
      const parsed = z.object({ error: z.object({ code: z.enum(["UNAUTHENTICATED", "PASSWORD_CHANGE_REQUIRED", "FORBIDDEN", "RATE_LIMITED", "VALIDATION_ERROR"]) }) }).safeParse(response.body);
      return facadeError(parsed.success ? response.status : 503, parsed.success ? parsed.data.error.code : "DEPENDENCY_UNAVAILABLE", requestId);
    }
    let result: unknown = response.body;
    if (operation === "tickets") {
      const value = z.discriminatedUnion("enabled", [
        z.object({ enabled: z.literal(false) }).strict(),
        z.object({ enabled: z.literal(true), ticket: z.string() }).strict(),
      ]).parse(result);
      if (value.enabled) {
        const target = new URL(process.env.API_BASE_URL ?? "https://localhost:8000");
        if (target.protocol !== "https:") throw new Error("HTTPS_REQUIRED");
        target.protocol = "wss:"; target.pathname = "/api/v1/realtime/ws"; target.search = ""; target.hash = "";
        result = { ...value, ws_url: target.toString() };
      }
    }
    const schema = operation === "tickets" ? ticketSchema : mutation ? pushResultSchema : pushConfigSchema;
    return Response.json(schema.parse(result), { headers: { "Cache-Control": "no-store" } });
  } catch { return facadeError(503, "DEPENDENCY_UNAVAILABLE", requestId); }
}
export const GET = relay;
export const POST = relay;
