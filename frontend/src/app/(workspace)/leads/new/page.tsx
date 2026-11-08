import { AuthUnavailable } from "@/features/auth/auth-frame";
import { LeadCreate } from "@/features/contacts/lead-create";
import { requireIdentity } from "@/lib/auth/server";

export const metadata = { title: "Nouveau prospect" };
export default async function Page() {
  const identity = await requireIdentity("/leads/new");
  if (identity.state !== "authenticated") return <AuthUnavailable path="/leads/new" />;
  return <LeadCreate role={identity.profile.user.role} actorId={identity.profile.user.id} />;
}
