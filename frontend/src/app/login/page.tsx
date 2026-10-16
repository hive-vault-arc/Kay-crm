import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthFrame, AuthUnavailable } from "@/features/auth/auth-frame";
import { LoginForm } from "@/features/auth/login-form";
import { getIdentity } from "@/lib/auth/server";
import { safeReturnPath } from "@/lib/auth/contracts";
import { ContactIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Connexion" };
export const dynamic = "force-dynamic";
export default async function LoginEntry({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [identity, query] = await Promise.all([getIdentity(), searchParams]);
  const returnTo = safeReturnPath(query.return_to);
  if (identity.state === "authenticated") redirect(identity.profile.must_change_password ? "/change-password" : returnTo);
  return <AuthFrame title="Votre espace KAY" description="Connectez-vous avec votre compte KAY.">
    {identity.state === "unavailable" ? <AuthUnavailable /> : null}
    {query.changed === "1" ? <p role="status" className="text-success">Mot de passe modifié. Connectez-vous à nouveau.</p> : null}
    {query.signed_out === "1" ? <p role="status">Vous êtes déconnecté.</p> : null}
    <LoginForm returnTo={returnTo} />
    <p className="flex items-start gap-2 text-sm text-muted-foreground"><ContactIcon size={16} className="mt-0.5 shrink-0" /><span>Votre compte est créé par un administrateur. Aucune inscription publique.</span></p>
  </AuthFrame>;
}
