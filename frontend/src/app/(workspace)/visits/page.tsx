import { AuthUnavailable } from "@/features/auth/auth-frame";
import { requireIdentity } from "@/lib/auth/server";
export const metadata = { title: "Calendrier des visites" };
export default async function Page() {
  const identity = await requireIdentity("/visits");
  if (identity.state !== "authenticated") return <AuthUnavailable path="/visits" />;
  return null;
}
