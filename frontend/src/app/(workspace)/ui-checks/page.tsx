import { notFound } from "next/navigation";
import { FoundationCheck } from "@/features/checks/foundation-check";
import { requireIdentity } from "@/lib/auth/server";
import { AuthUnavailable } from "@/features/auth/auth-frame";

export const dynamic = "force-dynamic";
export default async function Checks() {
  const identity = await requireIdentity("/ui-checks");
  if (identity.state !== "authenticated") return <AuthUnavailable path="/ui-checks" />;
  if (
    process.env.KAY_UI_CHECKS !== "1" ||
    process.env.NODE_ENV !== "development"
  )
    notFound();
  return <FoundationCheck />;
}
