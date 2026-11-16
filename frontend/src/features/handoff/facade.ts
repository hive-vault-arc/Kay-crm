import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { boundedJson, frontendOrigin } from "@/lib/auth/facade";
import { SESSION_COOKIE } from "@/lib/auth/contracts";
import { facadeError, upstreamRequest } from "@/lib/api/facade";
import { coverageKind, coverageNotes, coverageProof, coverageView, noteBody, noteReceipt, noteSeen } from "./contracts";

const known = new Set(["UNAUTHENTICATED", "PASSWORD_CHANGE_REQUIRED", "NOT_FOUND", "FORBIDDEN", "VALIDATION_ERROR", "IDEMPOTENCY_CONFLICT"]);
export async function relayCoverage(key: string, request: Request, requestId: string) {
  const [, kind, id, action, noteId, seen, extra] = key.split("/");
  if (!coverageKind.safeParse(kind).success || !z.uuid().safeParse(id).success || extra !== undefined)
    return facadeError(404, "NOT_FOUND", requestId);
  if (new URL(request.url).search) return facadeError(422, "VALIDATION_ERROR", requestId);
  const read = action === "notes" && noteId === undefined && request.method === "GET";
  const view = action === "view" && noteId === undefined && request.method === "POST";
  const create = action === "notes" && noteId === undefined && request.method === "POST";
  const acknowledge = action === "notes" && z.uuid().safeParse(noteId).success && seen === "seen" && request.method === "POST";
  if (!read && !view && !create && !acknowledge) return facadeError(404, "NOT_FOUND", requestId);
  const retryKey = request.headers.get("Idempotency-Key") ?? undefined;
  let body: string | undefined;
  if (!read) {
    if (request.headers.get("Origin") !== frontendOrigin()) return facadeError(403, "FORBIDDEN", requestId);
    if ((create || acknowledge) && !z.uuid().safeParse(retryKey).success) return facadeError(422, "VALIDATION_ERROR", requestId);
    const schema = view ? z.object({ proof: coverageProof }).strict() : create ? z.object({ proof: coverageProof, body: noteBody }).strict() : z.object({}).strict();
    try { body = JSON.stringify(schema.parse(await boundedJson(request, 32768))); }
    catch { return facadeError(422, "VALIDATION_ERROR", requestId); }
  }
  try {
    const jar = await cookies();
    const response = await upstreamRequest(`/api/v1/${key}`, requestId, {
      method: read ? "GET" : "POST", token: jar.get(SESSION_COOKIE)?.value, body,
      origin: read ? undefined : frontendOrigin(), csrf: request.headers.get("X-CSRF-Token")?.slice(0, 128),
      idempotencyKey: retryKey, maxResponseBytes: 2 * 1024 * 1024,
    });
    if (response.status !== 200) {
      const parsed = z.object({ error: z.object({ code: z.string() }) }).safeParse(response.body);
      const code = parsed.success && known.has(parsed.data.error.code) ? parsed.data.error.code : "DEPENDENCY_UNAVAILABLE";
      return facadeError(code === "DEPENDENCY_UNAVAILABLE" ? 503 : response.status, code, requestId);
    }
    const output = (read ? coverageNotes : view ? coverageView : create ? noteReceipt : noteSeen).parse(response.body);
    if (view && (!("kind" in output) || !("id" in output) || output.kind !== kind || output.id !== id)) return facadeError(503, "DEPENDENCY_UNAVAILABLE", requestId);
    return Response.json(output, { headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
  } catch { return facadeError(503, "DEPENDENCY_UNAVAILABLE", requestId); }
}
