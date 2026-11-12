import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { facadeError, upstreamRequest } from "@/lib/api/facade";
import { SESSION_COOKIE } from "@/lib/auth/contracts";
import { boundedJson, frontendOrigin } from "@/lib/auth/facade";
import { approveListing, expectedShare, issuedShare, listingShareState, shareSaved } from "./contracts";

const errors = new Set(["NOT_FOUND", "FORBIDDEN", "UNAUTHENTICATED", "PASSWORD_CHANGE_REQUIRED",
  "VALIDATION_ERROR", "INVENTORY_VERSION_CONFLICT", "LISTING_PHOTO_UNAVAILABLE",
  "LISTING_NOT_APPROVED", "LISTING_LINK_LIMIT", "IDEMPOTENCY_CONFLICT"]);
const uuid = z.uuid();
const errorBody = z.object({ error: z.object({ code: z.string() }) });

export async function relayListingShare(path: string, request: Request, requestId: string) {
  const [, kind, id, action, linkId, last, ...rest] = path.split("/");
  const get = request.method === "GET";
  const revoke = action === "links" && last === "revoke" && uuid.safeParse(linkId).success;
  const simple = ["approve", "withdraw", "links"].includes(action) && linkId === undefined;
  if (!["property", "development"].includes(kind) || !uuid.safeParse(id).success || rest.length ||
      (get ? action !== undefined : request.method !== "POST" || !(simple || revoke)))
    return facadeError(404, "NOT_FOUND", requestId);
  if (new URL(request.url).search) return facadeError(422, "VALIDATION_ERROR", requestId);
  const key = request.headers.get("Idempotency-Key") ?? undefined;
  let body: string | undefined;
  if (!get) {
    if (request.headers.get("Origin") !== frontendOrigin()) return facadeError(403, "FORBIDDEN", requestId);
    if (!uuid.safeParse(key).success) return facadeError(422, "VALIDATION_ERROR", requestId);
    const input = action === "approve" ? approveListing : revoke ? z.object({}).strict() : expectedShare;
    try { body = JSON.stringify(input.parse(await boundedJson(request, 8192))); }
    catch { return facadeError(422, "VALIDATION_ERROR", requestId); }
  }
  try {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) return facadeError(401, "UNAUTHENTICATED", requestId);
    const response = await upstreamRequest(`/api/v1/${path}`, requestId, {
      token, method: get ? "GET" : "POST", body, idempotencyKey: key,
      csrf: request.headers.get("X-CSRF-Token")?.slice(0, 128),
      origin: get ? undefined : frontendOrigin(),
    });
    if (response.status !== 200) {
      const failure = errorBody.safeParse(response.body);
      if (failure.success && errors.has(failure.data.error.code)) return facadeError(response.status, failure.data.error.code, requestId);
      return facadeError(503, "DEPENDENCY_UNAVAILABLE", requestId);
    }
    const schema = get ? listingShareState : action === "links" && !revoke ? issuedShare : shareSaved;
    return Response.json(schema.parse(response.body), { headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
  } catch {
    return facadeError(503, "DEPENDENCY_UNAVAILABLE", requestId);
  }
}
