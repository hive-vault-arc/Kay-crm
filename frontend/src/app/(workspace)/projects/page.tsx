import { AuthUnavailable } from "@/features/auth/auth-frame";
import { PropertyDirectory } from "@/features/inventory/property-directory";
import { requireIdentity } from "@/lib/auth/server";

export const metadata = { title: "Projets · Inventaire" };
export default async function Page() {
  const identity = await requireIdentity("/projects");
  if (identity.state !== "authenticated") return <AuthUnavailable path="/projects" />;
  return <PropertyDirectory role={identity.profile.user.role} />;
}
