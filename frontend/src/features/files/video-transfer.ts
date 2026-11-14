import { boundedRequestSignal } from "@/lib/api/request-signal";
import { ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { maxVideoSize, uploadTarget, videoPart, videoPartSize } from "./video-contracts";

export async function uploadVideo({
  file, id, parentKind, parentId, signal, progress,
}: {
  file: File; id: string; parentKind: "property" | "development"; parentId: string;
  signal: AbortSignal; progress: (value: number) => void;
}) {
  if (file.size <= 0 || file.size > maxVideoSize) throw new ApiError("FILE_TOO_LARGE", 413);
  if (!/\.(mov|mp4)$/i.test(file.name)) throw new ApiError("VIDEO_FORMAT_UNSUPPORTED", 415);
  const prefix = 65536;
  const sample = await new Blob([file.slice(0, prefix), file.slice(Math.max(0, file.size - prefix))]).arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", sample);
  const source_fingerprint = Array.from(new Uint8Array(hash), value => value.toString(16).padStart(2, "0")).join("");
  const reservation = await apiCommand("/api/v1/inventory-videos", {
    id, parent_kind: parentKind, parent_id: parentId, filename: file.name, size_bytes: file.size, source_fingerprint,
  }, uploadTarget, id, "POST", undefined, signal);
  if (reservation.id !== id) throw new ApiError("INVALID_RESPONSE", 503);
  if (!reservation.permit) { progress(100); return; }
  const parts = Math.ceil(file.size / videoPartSize);
  let number = reservation.next_part;
  if (number >= parts) throw new ApiError("INVALID_RESPONSE", 503);
  progress(Math.floor(number * videoPartSize / file.size * 100));
  while (number < parts) {
    const slice = file.slice(number * videoPartSize, (number + 1) * videoPartSize);
    const timeout = boundedRequestSignal(signal, 100_000);
    try {
      const response = await fetch(new URL(String(number), reservation.transfer_url), {
        method: "PUT", body: slice, credentials: "omit", cache: "no-store", redirect: "error",
        headers: { "Content-Type": "application/octet-stream", "X-File-Permit": reservation.permit },
        signal: timeout.signal,
      });
      if (!response.ok) throw new ApiError(response.status === 429 ? "RATE_LIMITED" : "FILE_TRANSFER_INTERRUPTED", response.status);
      const result = videoPart.safeParse(await response.json());
      if (!result.success || result.data.next_part !== number + 1) throw new ApiError("INVALID_RESPONSE", 503);
      number++;
      progress(Math.floor(Math.min(number * videoPartSize, file.size) / file.size * 100));
    } catch (error) {
      if (signal.aborted || error instanceof ApiError) throw error;
      throw new ApiError("FILE_TRANSFER_INTERRUPTED", 503);
    } finally {
      timeout.release();
    }
  }
}
