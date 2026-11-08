import type { ProtectedDocument } from "./contracts";
import { downloadBytes, requestFilePermit } from "./transfers";

// One gallery's in-memory bytes, never a global or persistent cache.
export type PhotoPreviewCache = Map<string, Promise<Blob>>;
export const photoPreviewKey = (id: string, versionId: string) => `${id}:${versionId}`;

export async function photoPreview(cache: PhotoPreviewCache, photo: Pick<ProtectedDocument, "id" | "version">, versionId: string, fresh = false, signal?: AbortSignal): Promise<Blob> {
  const key = photoPreviewKey(photo.id, versionId);
  const existing = cache.get(key);
  if (existing && !fresh) return existing;
  const pending = (async () => {
    const permit = await requestFilePermit({ action: "download", document_id: photo.id, expected_version: photo.version, version_id: versionId }, signal);
    return downloadBytes(permit, signal);
  })();
  cache.set(key, pending);
  try { return await pending; }
  catch (reason) { if (cache.get(key) === pending) cache.delete(key); throw reason; }
}
