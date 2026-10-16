import "server-only";
import { randomUUID } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { upstreamRequest } from "@/lib/api/facade";
import { meSchema, SESSION_COOKIE, safeReturnPath, type PublicIdentity } from "./contracts";

export type IdentityResult = { state: "authenticated"; profile: PublicIdentity } | { state: "anonymous" | "unavailable" };
export const getIdentity = cache(async (): Promise<IdentityResult> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return { state: "anonymous" };
  try {
    const upstream = await upstreamRequest("/api/v1/auth/me", randomUUID(), { token });
    if (upstream.status === 401) return { state: "anonymous" };
    if (upstream.status !== 200) return { state: "unavailable" };
    const parsed = meSchema.safeParse(upstream.body);
    if (!parsed.success) return { state: "unavailable" };
    const { user, expires_at, must_change_password } = parsed.data;
    return { state: "authenticated", profile: { user, expires_at, must_change_password } };
  } catch { return { state: "unavailable" }; }
});

export async function requireIdentity(path: string, restrictedAllowed = false) {
  const result = await getIdentity();
  if (result.state === "anonymous") redirect(`/login?return_to=${encodeURIComponent(safeReturnPath(path))}`);
  if (result.state === "authenticated" && result.profile.must_change_password && !restrictedAllowed)
    redirect("/change-password");
  return result;
}
