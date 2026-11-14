import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { SESSION_COOKIE } from "@/lib/auth/contracts";
import { boundedJson, frontendOrigin } from "@/lib/auth/facade";
import { facadeError, upstreamRequest } from "@/lib/api/facade";
import { newVideo, playbackGrant, videoArchived, videoEmpty, videoErrors, videoList, videoParent, videoReservation } from "./video-contracts";

const known = new Set([
  ...Object.keys(videoErrors), "FORBIDDEN", "NOT_FOUND", "UNAUTHENTICATED",
  "PASSWORD_CHANGE_REQUIRED", "VALIDATION_ERROR", "RATE_LIMITED",
]);

export async function relayVideos(key: string, request: Request, requestId: string) {
  const [, id, operation, ...rest] = key.split("/");
  const list = key === "inventory-videos" && request.method === "GET";
  const create = key === "inventory-videos" && request.method === "POST";
  const command = request.method === "POST" && z.uuid().safeParse(id).success && !rest.length
    && (operation === "archive" || operation === "playback");
  if (!list && !create && !command) return facadeError(404, "NOT_FOUND", requestId);
  const url = new URL(request.url);
  const params = [...url.searchParams];
  if (list ? params.length !== 2 || !videoParent.safeParse(Object.fromEntries(params)).success : params.length > 0) {
    return facadeError(422, "VALIDATION_ERROR", requestId);
  }
  let body: string | undefined;
  if (!list) {
    if (request.headers.get("Origin") !== frontendOrigin()) return facadeError(403, "FORBIDDEN", requestId);
    try {
      const parsed = (create ? newVideo : videoEmpty).parse(await boundedJson(request, 4096));
      body = JSON.stringify(parsed);
    } catch { return facadeError(422, "VALIDATION_ERROR", requestId); }
  }
  try {
    const jar = await cookies();
    const upstream = await upstreamRequest(`/api/v1/${key}${url.search}`, requestId, {
      method: list ? "GET" : "POST", body, token: jar.get(SESSION_COOKIE)?.value,
      csrf: request.headers.get("X-CSRF-Token")?.slice(0, 128),
      origin: list ? undefined : frontendOrigin(), maxResponseBytes: 32_768,
    });
    const headers = { "Cache-Control": "no-store", "X-Request-ID": requestId };
    if (upstream.status !== 200) {
      const result = z.object({ error: z.object({ code: z.string() }) }).safeParse(upstream.body);
      const code = result.success && known.has(result.data.error.code) ? result.data.error.code : "DEPENDENCY_UNAVAILABLE";
      if (list && upstream.status === 404) return Response.json({ enabled: false, items: [] }, { headers });
      return facadeError(code === "DEPENDENCY_UNAVAILABLE" ? 503 : upstream.status, code, requestId);
    }
    if (list) return Response.json(videoList.parse(upstream.body), { headers });
    if (operation === "archive") return Response.json(videoArchived.parse(upstream.body), { headers });
    const origin = new URL(process.env.API_BASE_URL ?? "").origin;
    if (create) {
      const reservation = videoReservation.parse(upstream.body);
      return Response.json({ ...reservation, transfer_url: new URL(`/api/v1/video-transfers/${reservation.id}/parts/`, origin).href }, { headers });
    }
    const { grant } = playbackGrant.parse(upstream.body);
    const play = new URL(`/api/v1/video-transfers/${id}/play`, origin);
    play.searchParams.set("grant", grant);
    return Response.json({ url: play.href }, { headers });
  } catch { return facadeError(503, "DEPENDENCY_UNAVAILABLE", requestId); }
}
