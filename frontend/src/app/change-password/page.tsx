import type { Metadata } from "next";
import { AuthFrame, AuthUnavailable } from "@/features/auth/auth-frame";
import { ChangePasswordForm } from "@/features/auth/change-password-form";
import { LogoutButton, SessionMonitor } from "@/features/auth/session-controls";
import { requireIdentity } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Changer le mot de passe" };
export const dynamic = "force-dynamic";
export default async function ChangePasswordPage() {
  const identity = await requireIdentity("/change-password", true);
  return <AuthFrame title="Changer le mot de passe" description="Après ce changement, vous devrez vous reconnecter. Vos autres sessions seront fermées.">
    {identity.state === "authenticated" ? <>
      <SessionMonitor expiresAt={identity.profile.expires_at} restricted />
      {identity.profile.must_change_password ? <p className="text-sm text-warning">Ce changement est nécessaire avant d’accéder à l’espace de travail.</p> : null}
      <ChangePasswordForm /><LogoutButton />
    </> : <AuthUnavailable path="/change-password" />}
  </AuthFrame>;
}
