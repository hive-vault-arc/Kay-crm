import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { SESSION_COOKIE } from "@/lib/auth/contracts";
import { facadeError, upstreamRequest } from "@/lib/api/facade";
import { activityQuery, dashboardSchema, drillQuery, drillSchema, exceptionQuery, exceptionsSchema, periodQuery } from "./contracts";

export async function relayReports(key: string, request: Request, requestId: string) {
  const schemas = key === "reports/dashboard" ? [periodQuery, dashboardSchema] : key === "reports/drill-down" ? [drillQuery, drillSchema] : key === "reports/activities" ? [activityQuery, drillSchema] : key === "reports/exceptions" ? [exceptionQuery, exceptionsSchema] : null;
  if (!schemas || request.method !== "GET") return facadeError(404, "NOT_FOUND", requestId);
  const url = new URL(request.url), params = [...url.searchParams];
  if (new Set(params.map(([k]) => k)).size !== params.length || !schemas[0].safeParse(Object.fromEntries(params)).success) return facadeError(422, "VALIDATION_ERROR", requestId);
  try {
    const jar = await cookies();
    const response = await upstreamRequest(`/api/v1/${key}${url.search}`, requestId, { token: jar.get(SESSION_COOKIE)?.value, maxResponseBytes: 2 * 1024 * 1024 });
    if (response.status !== 200) {
      const parsed = z.object({ error: z.object({ code: z.string() }) }).safeParse(response.body);
      const code = parsed.success && ["UNAUTHENTICATED", "PASSWORD_CHANGE_REQUIRED", "FORBIDDEN", "NOT_FOUND", "VALIDATION_ERROR"].includes(parsed.data.error.code) ? parsed.data.error.code : "DEPENDENCY_UNAVAILABLE";
      return facadeError(code === "DEPENDENCY_UNAVAILABLE" ? 503 : response.status, code, requestId);
    }
    return Response.json(schemas[1].parse(response.body), { headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
  } catch { return facadeError(503, "DEPENDENCY_UNAVAILABLE", requestId); }
}
