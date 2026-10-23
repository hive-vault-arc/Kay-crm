import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { boundedJson, frontendOrigin } from "@/lib/auth/facade";
import { SESSION_COOKIE } from "@/lib/auth/contracts";
import { facadeError, upstreamRequest } from "@/lib/api/facade";
import { frenchApiError } from "@/lib/api/errors";
import { agentsSchema, contactRoute, contactSchema, contactsSchema, duplicateSchema, editContactSchema, editEnquirySchema, enquiriesSchema, enquirySchema, listQuerySchema, newContactSchema, newEnquirySchema, privateConflictSchema, recordLifecycleResultSchema, recordLifecycleSchema, resolveSchema } from "./contracts";
import { assignmentsSchema, commandResultSchema, confirmedChangeSchema, enquiryAssignmentSchema, intentSchema, noteSchema, previewSchema, timelineSchema } from "./ownership-contracts";
import { qualificationMetadataSchema } from "./qualification-contracts";

const known = new Set(["UNAUTHENTICATED", "PASSWORD_CHANGE_REQUIRED", "FORBIDDEN", "NOT_FOUND", "VALIDATION_ERROR", "INVALID_PHONE", "INVALID_ASSIGNEE", "PHONE_OWNED_ELSEWHERE", "DUPLICATE_CONFIRMATION_REQUIRED", "VERSION_CONFLICT", "SOURCE_SUBMISSION_CONFLICT", "IDEMPOTENCY_CONFLICT", "RATE_LIMITED", "OWNERSHIP_VERSION_CONFLICT", "IMPACT_CHANGED", "CONTACT_ARCHIVED", "CONTACT_NOT_ARCHIVED", "CONTACT_MERGED", "ASSIGNMENT_UNCHANGED", "PRIMARY_NOT_COLLABORATOR", "MERGE_LINKS_UNSUPPORTED", "MERGE_IDENTITY_LIMIT"]);
export async function relayContacts(key: string, request: Request, requestId: string) {
  for (const code of ["LANGUAGES_REQUIRED", "LEAD_CONVERTED", "RECORD_ARCHIVED", "RECORD_ALREADY_ARCHIVED", "RECORD_NOT_ARCHIVED", "RECORD_RESTORE_EXPIRED"]) known.add(code);
  if (!contactRoute(key, request.method)) return facadeError(404, "NOT_FOUND", requestId);
  const url = new URL(request.url);
  const suffix = key.split("/")[2];
  const history = suffix === "timeline" || suffix === "assignment-events";
  const list = ["contacts", "enquiries", "contacts/assignment-options"].includes(key) || history;
  const mutation = request.method !== "GET";
  const params = [...url.searchParams];
  if ((url.search && (!list || mutation)) || new Set(params.map(([name]) => name)).size !== params.length || !listQuerySchema.safeParse(Object.fromEntries(params)).success) return facadeError(422, "VALIDATION_ERROR", requestId);
  if (key === "contacts/assignment-options" && params.some(([name]) => !["q", "page", "page_size"].includes(name))) return facadeError(422, "VALIDATION_ERROR", requestId);
  if (history && params.some(([name]) => !["page", "page_size"].includes(name))) return facadeError(422, "VALIDATION_ERROR", requestId);
  if (mutation && request.headers.get("Origin") !== frontendOrigin()) return facadeError(403, "FORBIDDEN", requestId);
  let body: string | undefined;
  const retryKey = request.headers.get("Idempotency-Key") ?? undefined;
  if (mutation) {
    if (key !== "contacts/resolve-phone" && suffix !== "preview" && !z.uuid().safeParse(retryKey).success) return facadeError(422, "VALIDATION_ERROR", requestId);
    const schema = suffix === "preview" ? intentSchema : suffix === "notes" ? noteSchema : key.startsWith("enquiries/") && (suffix === "archive" || suffix === "restore") ? recordLifecycleSchema : key.startsWith("enquiries/") && suffix === "assign" ? enquiryAssignmentSchema : suffix ? confirmedChangeSchema : key === "contacts/resolve-phone" ? resolveSchema : request.method === "PATCH" ? key.startsWith("contacts/") ? editContactSchema : editEnquirySchema : key === "contacts" ? newContactSchema : newEnquirySchema;
    try {
      const parsed = schema.safeParse(await boundedJson(request, 32768));
      if (!parsed.success) return facadeError(422, "VALIDATION_ERROR", requestId);
      if (suffix && !["preview", "notes"].includes(suffix) && key.startsWith("contacts/") && (!confirmedChangeSchema.safeParse(parsed.data).success || (parsed.data as { operation?: string }).operation !== suffix)) return facadeError(422, "VALIDATION_ERROR", requestId);
      body = JSON.stringify(parsed.data);
    } catch { return facadeError(422, "VALIDATION_ERROR", requestId); }
  }
  try {
    const jar = await cookies();
    const upstream = await upstreamRequest(`/api/v1/${key}${url.search}`, requestId, { method: request.method as "GET" | "POST" | "PATCH" | "PUT", body, token: jar.get(SESSION_COOKIE)?.value, csrf: request.headers.get("X-CSRF-Token")?.slice(0, 128), origin: mutation ? frontendOrigin() : undefined, idempotencyKey: mutation ? retryKey : undefined, maxResponseBytes: 512 * 1024 });
    if (upstream.status !== 200) {
      const parsed = z.object({ error: z.object({ code: z.string() }) }).safeParse(upstream.body);
      const code = parsed.success && known.has(parsed.data.error.code) ? parsed.data.error.code : "DEPENDENCY_UNAVAILABLE";
      let details: object = {};
      if (code === "PHONE_OWNED_ELSEWHERE") details = privateConflictSchema.parse(upstream.body);
      if (code === "DUPLICATE_CONFIRMATION_REQUIRED") details = duplicateSchema.parse(upstream.body);
      if (code === "VERSION_CONFLICT") details = z.object({ current: key.startsWith("contacts/") ? contactSchema : enquirySchema }).parse(upstream.body);
      return Response.json({ error: { code, message: frenchApiError(code), field_errors: {}, request_id: requestId }, ...details }, { status: code === "DEPENDENCY_UNAVAILABLE" ? 503 : upstream.status, headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
    }
    const schema = suffix === "preview" ? previewSchema : suffix === "timeline" ? timelineSchema : suffix === "assignment-events" ? assignmentsSchema : key.startsWith("enquiries/") && (suffix === "archive" || suffix === "restore") ? recordLifecycleResultSchema : suffix ? commandResultSchema : key === "contacts/resolve-phone" ? z.object({ available: z.literal(true) }).strict() : key === "contacts/assignment-options" ? agentsSchema : request.method === "GET" && key === "contacts" ? contactsSchema : request.method === "GET" && key === "enquiries" ? enquiriesSchema : key.startsWith("contacts") ? contactSchema : enquirySchema;
    return Response.json((key === "contacts/metadata" ? qualificationMetadataSchema : schema).parse(upstream.body), { headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
  } catch { return facadeError(503, "DEPENDENCY_UNAVAILABLE", requestId); }
}
