"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { IssuedCredential } from "./contracts";

export function CredentialNotice({ issued, clear }: { issued: IssuedCredential; clear: () => void }) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const hide = () => { if (document.visibilityState === "hidden") clear(); };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", clear);
    window.addEventListener("blur", clear);
    window.addEventListener("pageshow", clear);
    return () => { document.removeEventListener("visibilitychange", hide); window.removeEventListener("pagehide", clear); window.removeEventListener("blur", clear); window.removeEventListener("pageshow", clear); };
  }, [clear]);
  return <section aria-label="Remise du mot de passe temporaire" className="grid max-w-reading gap-4 border border-warning p-4 text-base sm:p-6">
    <h2 className="text-section font-bold">Mot de passe temporaire, affichage unique</h2>
    <p>Compte créé ou réinitialisé : {issued.user.display_name}. La connexion reste bloquée jusqu’à la remise confirmée.</p>
    <p>Vérifiez l’identité de la personne et remettez-lui ce mot de passe en personne. Ne l’envoyez pas par e-mail, SMS, chat ou document.</p>
    <div className="grid gap-2"><Label htmlFor="temporary-credential">Mot de passe temporaire</Label>
      <Input id="temporary-credential" type={revealed ? "text" : "password"} value={issued.temporary_password} readOnly autoComplete="off" data-private-credential />
      <Button action={revealed ? "hide" : "show"} variant="outline" type="button" aria-pressed={revealed} onClick={() => setRevealed(!revealed)}>{revealed ? "Masquer" : "Afficher le mot de passe"}</Button>
    </div>
    <p>Expire le {new Intl.DateTimeFormat("fr-MA", { dateStyle: "short", timeStyle: "short", timeZone: "Africa/Casablanca" }).format(new Date(issued.user.temporary_expires_at!))}. Un changement de fenêtre, une fermeture ou un rechargement efface cet affichage.</p>
    <p>Affichage perdu ou mot de passe expiré ? Réinitialisez le compte avec votre mot de passe administrateur. Le mot de passe précédent ne peut pas être retrouvé.</p>
    <Button action="close" variant="outline" onClick={clear}>Fermer et effacer</Button>
    <Link className="min-h-control py-3 text-link underline" href={`/settings/users/${issued.user.id}/edit`} onClick={clear}>Ouvrir le compte pour confirmer la remise</Link>
  </section>;
}
