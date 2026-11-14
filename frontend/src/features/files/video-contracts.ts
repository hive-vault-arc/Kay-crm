import { z } from "zod";

export const maxVideoSize = 300_000_000;
export const videoPartSize = 8 * 1024 * 1024;
export const videoParent = z.object({ parent_kind: z.enum(["property", "development"]), parent_id: z.uuid() }).strict();
export const newVideo = videoParent.extend({
  id: z.uuid(),
  filename: z.string().trim().min(5).max(160).regex(/\.(mov|mp4)$/i),
  size_bytes: z.number().int().min(1).max(maxVideoSize),
  source_fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();

const video = z.object({
  id: z.uuid(),
  filename: z.string().min(1).max(160),
  state: z.enum(["uploading", "queued", "processing", "ready", "failed"]),
  duration_seconds: z.number().int().positive().max(180).nullable(),
  size_bytes: z.number().int().positive().max(48_000_000).nullable(),
  error_code: z.string().max(48).nullable(),
  can_archive: z.boolean(),
  can_resume: z.boolean(),
}).strict();
export type InventoryVideo = z.infer<typeof video>;

export const videoList = z.object({ enabled: z.boolean(), items: z.array(video).max(25) }).strict();
export const videoPart = z.object({ next_part: z.number().int().min(0).max(36) }).strict();
const token = z.string().regex(/^[a-zA-Z0-9_-]{43}$/);
export const videoReservation = videoPart.extend({ id: z.uuid(), permit: token.nullable() }).strict();
export const uploadTarget = videoReservation.extend({ transfer_url: z.url() }).strict();
export const playbackGrant = z.object({ grant: token }).strict();
export const playbackTarget = z.object({ url: z.url() }).strict();
export const videoArchived = z.object({ archived: z.literal(true) }).strict();
export const videoEmpty = z.object({}).strict();

export const videoErrors: Record<string, string> = {
  VIDEO_LIMIT: "Ce dossier contient déjà cinq vidéos.",
  VIDEO_UPLOAD_EXPIRED: "Ce transfert a expiré. Sélectionnez la vidéo à nouveau.",
  VIDEO_TOO_LONG: "Cette vidéo dépasse trois minutes.",
  VIDEO_FORMAT_UNSUPPORTED: "Choisissez une vidéo MOV ou MP4 lisible.",
  VIDEO_SCAN_REJECTED: "L’analyse antivirus a refusé ce fichier.",
  VIDEO_OUTPUT_TOO_LARGE: "La vidéo compressée dépasse 48 Mo.",
  VIDEO_PROCESSING_FAILED: "Le traitement a échoué. Réessayez avec une autre vidéo.",
  VIDEO_ENCODER_UNAVAILABLE: "Le traitement est temporairement indisponible.",
  ANTIVIRUS_UNAVAILABLE: "L’analyse antivirus est temporairement indisponible.",
  IDEMPOTENCY_CONFLICT: "Sélectionnez le même fichier pour reprendre le transfert.",
  FILE_TRANSFER_INTERRUPTED: "Le transfert a été interrompu. Vous pouvez le reprendre.",
};
