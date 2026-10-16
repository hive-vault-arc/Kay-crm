import { PageHeader } from "@/components/shared/page-header";
import { AuthUnavailable } from "@/features/auth/auth-frame";
import { DevelopmentEditor } from "@/features/inventory/development-editor";
import { requireIdentity } from "@/lib/auth/server";

export const metadata = { title: "Créer un programme immobilier" };
export default async function Page() {
  const identity = await requireIdentity("/projects/new");
  if (identity.state !== "authenticated") return <AuthUnavailable path="/projects/new" />;
  return <><PageHeader title="Créer un programme immobilier" description="Un programme peut regrouper plusieurs catégories de biens." route="/projects/new" />{identity.profile.user.role === "agent" ? <p role="alert">Accès non autorisé : seuls les responsables et administrateurs peuvent créer un programme.</p> : <DevelopmentEditor />}</>;
}
