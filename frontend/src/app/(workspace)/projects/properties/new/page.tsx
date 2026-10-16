import { PageHeader } from "@/components/shared/page-header";
import { AuthUnavailable } from "@/features/auth/auth-frame";
import { PropertyEditor } from "@/features/inventory/property-editor";
import { requireIdentity } from "@/lib/auth/server";

export const metadata = { title: "Créer un bien indépendant" };
export default async function Page() {
  const identity = await requireIdentity("/projects/properties/new");
  if (identity.state !== "authenticated") return <AuthUnavailable path="/projects/properties/new" />;
  return <><PageHeader title="Créer un bien indépendant" description="Villa, maison, appartement ou terrain : un bien physique, deux campagnes possibles." route="/projects/properties/new" />{identity.profile.user.role === "agent" ? <p role="alert">Accès non autorisé : seuls les responsables et administrateurs peuvent créer un bien.</p> : <PropertyEditor />}</>;
}
