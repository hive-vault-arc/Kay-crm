import { z } from "zod";

export const roles = { administrator: "Administrateur", manager: "Responsable", agent: "Agent" } as const;
export const states = { active: "Actif", pending_handoff: "Remise en attente", disabled: "Désactivé" } as const;
export const namedUserSchema = z.object({
  display_name: z.string().trim().min(1, "Saisissez le nom complet.").max(160),
  email: z.string().trim().pipe(z.email("Saisissez une adresse e-mail valide.").max(254)),
  role: z.enum(["administrator", "manager", "agent"]),
}).strict();
export const versionSchema = z.object({ expected_version: z.number().int().positive() }).strict();
export const editUserSchema = namedUserSchema.extend({ expected_version: z.number().int().positive() });
export const resetUserSchema = versionSchema.extend({ admin_password: z.string().min(1).max(1024) });
export const userSchema = namedUserSchema.extend({
  id: z.uuid(), state: z.enum(["active", "pending_handoff", "disabled"]), version: z.number().int().positive(),
  must_change_password: z.boolean(), temporary_expires_at: z.iso.datetime({ offset: true }).nullable(),
  handoff_confirmed_at: z.iso.datetime({ offset: true }).nullable(),
});
export type StaffUser = z.infer<typeof userSchema>;
export const commandSchema = z.object({ user: userSchema }).strict();
export const issuedSchema = commandSchema.extend({ temporary_password: z.string().regex(/^[A-Za-z0-9_-]{32}$/) });
export type IssuedCredential = z.infer<typeof issuedSchema>;
export const usersSchema = z.object({
  items: z.array(userSchema).max(100), page: z.number().int().positive(), page_size: z.number().int().positive().max(100),
  total: z.number().int().nonnegative(), has_previous: z.boolean(), has_next: z.boolean(),
}).strict();

const uuidPart = "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}";
export function userRoute(key: string, method: string) {
  if (key === "users" && ["GET", "POST"].includes(method)) return true;
  if (new RegExp(`^users/${uuidPart}$`).test(key) && ["GET", "PATCH"].includes(method)) return true;
  return method === "POST" && new RegExp(`^users/${uuidPart}/(confirm-handoff|reset-password|disable)$`).test(key);
}
