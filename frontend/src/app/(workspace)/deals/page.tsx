import { AuthUnavailable } from "@/features/auth/auth-frame";
import { DealList } from "@/features/deals/deal-list";
import { requireIdentity } from "@/lib/auth/server";
export const metadata = { title: "Affaires" };
export default async function Page() {
  const identity = await requireIdentity("/deals");
  if (identity.state !== "authenticated") return <AuthUnavailable path="/deals" />;
  return <DealList role={identity.profile.user.role} />;
}
