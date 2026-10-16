import { z } from "zod";
import { agentSchema, numberedPage } from "@/features/contacts/contracts";
import { visitSchema } from "@/features/schedule/contracts";

const version = z.number().int().positive();
const instant = z.iso.datetime({ offset: true });
export const taskStatusLabels = { open: "À faire", completed: "Terminée", cancelled: "Annulée" } as const;
export const taskActionLabels = { created: "Tâche créée", updated: "Tâche modifiée", completed: "Tâche terminée", cancelled: "Tâche annulée", contact_merged: "Contact fusionné" } as const;
export const bucketLabels = { today: "Aujourd’hui", overdue: "En retard", upcoming: "À venir", all: "Toutes", completed: "Terminées", cancelled: "Annulées" } as const;
const fields = {
  title: z.string().trim().min(1).max(160), notes: z.string().trim().max(1000),
  owner_user_id: z.uuid(), due_at: instant, deal_id: z.uuid().nullable(), property_id: z.uuid().nullable(),
};
export const newTaskSchema = z.object({ ...fields, contact_id: z.uuid() }).strict();
export const editTaskSchema = z.object({ ...fields, expected_version: version }).strict();
export const taskActionSchema = z.object({ expected_version: version, reason: z.string().trim().max(1000) }).strict();
export const resultSchema = z.object({ id: z.uuid(), version }).strict();
const snapshot = z.object({ ...fields, contact_id: z.uuid(), origin_contact_id: z.uuid(), status: z.enum(["open", "completed", "cancelled"]), outcome: z.string().max(1000), schedule_version: version }).strict();
export const taskSchema = snapshot.extend({ id: z.uuid(), version, contact_name: z.string().max(160), contact_archived: z.boolean(), owner_name: z.string().max(160), owner_eligible: z.boolean(), due_local: instant, created_by_user_id: z.uuid(), updated_by_user_id: z.uuid(), created_at: instant, updated_at: instant });
const clock = { now: instant, today: z.iso.date(), time_zone: z.literal("Africa/Casablanca") };
export const workContextSchema = z.object(clock).strict();
export const tasksSchema = numberedPage(taskSchema).extend(clock);
export const taskHistorySchema = numberedPage(z.object({ id: z.uuid(), version, action: z.enum(Object.keys(taskActionLabels) as [keyof typeof taskActionLabels, ...(keyof typeof taskActionLabels)[]]), actor: agentSchema, snapshot, occurred_at: instant, occurred_local: instant }).strict());
const href = z.string().max(250).regex(/^\/(contacts|deals|visits|projects(?:\/properties)?)\/[a-f0-9-]{36}(?:\?task=[a-f0-9-]{36})?$/);
export const notificationSchema = z.object({ id: z.uuid(), kind: z.enum(["file.scanned", "visit.reminder.day", "visit.reminder.hour", "task.due"]), title: z.string().max(160), context: z.string().max(160), href, due_local: instant.nullable(), created_at: instant, read_at: instant.nullable() }).strict();
export const notificationsSchema = numberedPage(notificationSchema).extend({ unread_total: z.number().int().nonnegative() });
export const readSchema = z.object({ read: z.literal(true) }).strict();
export const followUpSchema = numberedPage(visitSchema.omit({ review_code: true })).extend(clock);
export const pageQuerySchema = z.object({ page: z.coerce.number().int().min(1).max(1_000_000).optional(), page_size: z.coerce.number().int().min(1).max(100).optional() }).strict();
export const taskQuerySchema = pageQuerySchema.extend({ contact_id: z.uuid().optional(), deal_id: z.uuid().optional(), owner_user_id: z.uuid().optional(), bucket: z.enum(Object.keys(bucketLabels) as [keyof typeof bucketLabels, ...(keyof typeof bucketLabels)[]]).optional() });
export const notificationQuerySchema = pageQuerySchema.extend({ state: z.enum(["all", "unread", "read"]).optional() });
export type Task = z.infer<typeof taskSchema>;
export type Bucket = keyof typeof bucketLabels;
