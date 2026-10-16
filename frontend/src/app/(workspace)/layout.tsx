import { AppShell } from "@/features/shell/app-shell";
import { AuthFrame, AuthUnavailable } from "@/features/auth/auth-frame";
import { getIdentity } from "@/lib/auth/server";
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const identity = await getIdentity();
  // Each page owns its redirect so the original destination is preserved.
  if (identity.state !== "authenticated") return identity.state === "anonymous" ? children : <AuthFrame title="Votre espace KAY" description="Vérification de votre accès."><AuthUnavailable path="/dashboard" /></AuthFrame>;
  if (identity.profile.must_change_password) return children;
  return <AppShell identity={identity.profile}>{children}</AppShell>;
}
