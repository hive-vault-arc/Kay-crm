import { requireIdentity } from "@/lib/auth/server";
import { AuthUnavailable } from "@/features/auth/auth-frame";
import { PageHeader } from "@/components/shared/page-header";

export async function adminAccess(path: string) {
  const identity = await requireIdentity(path);
  if (identity.state !== "authenticated") return { denied: <AuthUnavailable path={path} />, actorId: "" };
  if (identity.profile.user.role !== "administrator") return {
    denied: <PageHeader title="Accès non autorisé" description="Les paramètres sont réservés aux administrateurs." route={path} />, actorId: "",
  };
  return { denied: null, actorId: identity.profile.user.id };
}
