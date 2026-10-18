import { z } from "zod";
import { numberedPage } from "@/features/contacts/contracts";

export const activityKinds = ["note", "call", "message", "email", "meeting", "visit", "other"] as const;
export const kindLabels = { note: "Note", call: "Appel", message: "Message", email: "E-mail", meeting: "Rendez-vous", visit: "Visite", other: "Autre interaction" } as const;
export const directionLabels = { inbound: "Entrant", outbound: "Sortant" } as const;
export const newActivitySchema = z.object({
  kind: z.enum(activityKinds).default("note"),
  body: z.string().trim().min(1).max(4000).refine(value => !value.includes("\0")),
  duration_minutes: z.number().int().min(1).max(1440).nullable().default(null),
  direction: z.enum(["inbound", "outbound"]).nullable().default(null),
  projects: z.array(z.string().trim().min(1).max(160).refine(value => !value.includes("\0"))).max(3).default([]),
}).strict().refine(value => new Set(value.projects.map(project => project.toLocaleLowerCase())).size === value.projects.length, { path: ["projects"], message: "Chaque projet doit être distinct." });
export const activityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1_000_000).optional(),
  page_size: z.coerce.number().int().min(1).max(100).optional(),
  kind: z.enum([...activityKinds, "system"]).optional(),
}).strict();
const activitySchema = z.object({
  id: z.uuid(), action: z.string().min(1).max(40), body: z.string().max(4000), reason: z.string().max(1000),
  occurred_at: z.iso.datetime({ offset: true }),
  actor: z.object({ id: z.uuid().nullable(), display_name: z.string().max(200) }).strict(),
  duration_minutes: z.number().int().min(1).max(1440).nullable(), direction: z.enum(["inbound", "outbound"]).nullable(),
  projects: z.array(z.string().min(1).max(160)).max(3),
}).strict();
export const activitiesSchema = numberedPage(activitySchema).extend({ last_activity_at: z.iso.datetime({ offset: true }).nullable(), origin_enquiry_id: z.uuid().nullable() }).strict();
export const activityResultSchema = z.object({ id: z.uuid() }).strict();
export type Activity = z.infer<typeof activitySchema>;
export type NewActivity = z.infer<typeof newActivitySchema>;
export function activityRoute(key: string, method: string) {
  const parts = key.split("/");
  return parts.length === 3 && ["enquiries", "deals"].includes(parts[0]) && z.uuid().safeParse(parts[1]).success &&
    (parts[2] === "activities" && ["GET", "POST"].includes(method) || parts[0] === "deals" && parts[2] === "origin-activities" && method === "GET");
}
