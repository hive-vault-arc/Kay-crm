import { AuthUnavailable } from "@/features/auth/auth-frame";
import { OwnerDirectory } from "@/features/owners/owner-directory";
import { requireIdentity } from "@/lib/auth/server";

export const metadata = { title: "Propriétaires" };
export default async function Page() {
  const identity = await requireIdentity("/owners");
  if (identity.state !== "authenticated") return <AuthUnavailable path="/owners" />;
  return <OwnerDirectory key={`${identity.profile.user.id}:${identity.profile.user.role}`} actorId={identity.profile.user.id} role={identity.profile.user.role} />;
}
