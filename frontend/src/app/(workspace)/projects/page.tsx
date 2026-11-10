import { AuthUnavailable } from "@/features/auth/auth-frame";
import { PropertyDirectory } from "@/features/inventory/property-directory";
import { requireIdentity } from "@/lib/auth/server";

export const metadata = { title: "Projets · Inventaire" };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const identity = await requireIdentity("/projects");
  if (identity.state !== "authenticated") return <AuthUnavailable path="/projects" />;
  const { kind } = await searchParams;
  return <PropertyDirectory role={identity.profile.user.role} actorId={identity.profile.user.id} initialKind={kind === "programmes" || kind === "developments" ? "developments" : "standalone"} />;
}
