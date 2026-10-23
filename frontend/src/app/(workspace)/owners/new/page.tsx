import { AuthUnavailable } from "@/features/auth/auth-frame";
import { OwnerForm } from "@/features/owners/owner-form";
import { requireIdentity } from "@/lib/auth/server";

export const metadata = { title: "Ajouter un propriétaire" };
export default async function Page() {
  const identity = await requireIdentity("/owners/new");
  if (identity.state !== "authenticated") return <AuthUnavailable path="/owners/new" />;
  return <OwnerForm role={identity.profile.user.role} />;
}
