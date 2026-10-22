import { z } from "zod";

export const ticketSchema = z.discriminatedUnion("enabled", [
  z.object({ enabled: z.literal(false) }).strict(),
  z.object({ enabled: z.literal(true), ticket: z.string().regex(/^[A-Za-z0-9_-]{43}$/), ws_url: z.string().url() }).strict(),
]);
export const pushConfigSchema = z.object({ enabled: z.boolean(), public_key: z.string().nullable(), subscribed: z.boolean() }).strict();
export const pushBodySchema = z.object({
  operation: z.enum(["subscribe", "unsubscribe"]),
  endpoint: z.string().url().max(2048),
  p256dh: z.string().max(128).optional(),
  auth: z.string().max(64).optional(),
}).strict();
export const pushResultSchema = z.object({ saved: z.literal(true) }).strict();
