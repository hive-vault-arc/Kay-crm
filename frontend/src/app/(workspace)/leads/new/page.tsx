import { PageHeader } from "@/components/shared/page-header";
import { AuthUnavailable } from "@/features/auth/auth-frame";
import { LeadCreate } from "@/features/contacts/lead-create";
import { requireIdentity } from "@/lib/auth/server";

export const metadata = { title: "Créer un Lead" };
export default async function Page() {
  const identity = await requireIdentity("/leads/new");
  if (identity.state !== "authenticated") return <AuthUnavailable path="/leads/new" />;
  return <><PageHeader title="Créer un Lead" description="Une nouvelle demande pour un contact nouveau ou déjà connu." route="/leads/new" /><LeadCreate role={identity.profile.user.role} /></>;
}
