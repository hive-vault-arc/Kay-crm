import { z } from "zod";

export const SESSION_COOKIE = "__Host-kay_session";
export const meSchema = z.object({
  user: z.object({
    id: z.uuid(), display_name: z.string().min(1).max(160), email: z.string().max(254),
    role: z.enum(["administrator", "manager", "agent"]),
  }).strict(),
  must_change_password: z.boolean(), expires_at: z.iso.datetime({ offset: true }),
  csrf_token: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
export type AuthProfile = z.infer<typeof meSchema>;
export type PublicIdentity = Omit<AuthProfile, "csrf_token">;
export const loginSchema = z.object({
  email: z.string().trim().pipe(z.email("Saisissez une adresse e-mail valide.").max(254)),
  password: z.string().min(1, "Saisissez votre mot de passe.").max(1024),
}).strict();
export const changeSchema = z.object({
  old_password: z.string().min(1, "Saisissez votre mot de passe actuel.").max(1024),
  new_password: z.string().min(12, "Choisissez au moins 12 caractères.").max(1024),
}).strict();

const returnPaths = new Set(["/dashboard", "/leads", "/leads/new", "/deals", "/visits", "/projects", "/projects/new", "/projects/properties/new", "/settings", "/settings/users", "/settings/users/new"]);
export function safeReturnPath(value: unknown): string {
  return typeof value === "string" && (returnPaths.has(value) || /^\/projects\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(\/edit)?$/.test(value) || /^\/settings\/users\/[a-f0-9-]{36}\/edit$/.test(value) || /^\/(leads|contacts)\/[a-f0-9-]{36}(\/edit)?$/.test(value) || /^\/projects\/properties\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(\/edit)?$/.test(value)) ? value : "/dashboard";
}
