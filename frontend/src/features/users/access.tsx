import { requireIdentity } from "@/lib/auth/server";
import { AuthUnavailable } from "@/features/auth/auth-frame";
import { PageHeader } from "@/components/shared/page-header";

export async function adminAccess(path: string) {
  return settingsAccess(path, ["administrator"]);
}

export async function staffAccess(path: string) {
  return settingsAccess(path, ["administrator", "manager"]);
}

async function settingsAccess(path: string, roles: readonly string[]) {
  const identity = await requireIdentity(path);
  if (identity.state !== "authenticated") return { denied: <AuthUnavailable path={path} />, actorId: "", manager: false };
  if (!roles.includes(identity.profile.user.role)) return {
    denied: <PageHeader title="Accès non autorisé" description="Votre rôle ne donne pas accès à cette page." route={path} />, actorId: "",
    manager: false,
  };
  return { denied: null, actorId: identity.profile.user.id, manager: identity.profile.user.role === "manager" };
}
