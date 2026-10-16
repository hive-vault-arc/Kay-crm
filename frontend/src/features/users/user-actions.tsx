"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ApiError } from "@/lib/api/client";
import { commandSchema, issuedSchema, states, type IssuedCredential, type StaffUser } from "./contracts";
import { userCommand } from "./api";
import { CredentialNotice } from "./credential-notice";

type Action = "confirm-handoff" | "reset-password" | "disable";
export function UserActions({ user, actorId, changed }: { user: StaffUser; actorId: string; changed: (user: StaffUser) => void }) {
  const [open, setOpen] = useState<Action>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [password, setPassword] = useState("");
  const [issued, setIssued] = useState<IssuedCredential>();
  const [key, setKey] = useState("");
  const clear = useCallback(() => setIssued(undefined), []);
  async function execute(action: Action) {
    setBusy(true); setError(""); setFeedback(""); clear();
    try {
      const path = `/api/v1/users/${user.id}/${action}` as const;
      if (action === "reset-password") {
        const result = await userCommand(path, { expected_version: user.version, admin_password: password }, issuedSchema, key);
        changed(result.user); setIssued(result);
      } else {
        const result = await userCommand(path, { expected_version: user.version }, commandSchema, key);
        changed(result.user);
        if (action === "disable" && user.id === actorId) { window.location.replace("/login"); return; }
      }
      setOpen(undefined); setPassword("");
      setFeedback(action === "confirm-handoff" ? "Remise confirmée. La personne doit changer son mot de passe à la première connexion, puis se reconnecter." : action === "disable" ? "Compte désactivé. Sessions révoquées, historique conservé." : "Mot de passe réinitialisé. Une nouvelle remise en personne est nécessaire.");
    } catch (reason) { setPassword(""); setError(reason instanceof ApiError ? reason.message : "L’action a échoué. Réessayez."); }
    finally { setBusy(false); }
  }
  const actions: { action: Action; label: string; description: string }[] = [
    ...(user.state === "pending_handoff" ? [{ action: "confirm-handoff" as const, label: "Confirmer la remise", description: "Confirmez seulement après avoir vérifié l’identité du destinataire et remis le mot de passe en personne. Cette confirmation active le compte, sans contourner son changement obligatoire de mot de passe." }] : []),
    ...(user.id !== actorId ? [{ action: "reset-password" as const, label: "Réinitialiser le mot de passe", description: "Les sessions de ce compte seront révoquées. Un nouveau mot de passe temporaire sera affiché une fois, avec une nouvelle remise en personne obligatoire. Saisissez votre propre mot de passe administrateur." }] : []),
    ...(user.state !== "disabled" ? [{ action: "disable" as const, label: "Désactiver le compte", description: "Le compte ne pourra plus se connecter et ses sessions seront révoquées. Son identité et toutes ses actions historiques seront conservées. Il ne sera pas supprimé." }] : []),
  ];
  return <section className="grid max-w-reading gap-4 border-t pt-6" aria-label="Accès du compte">
    <h2 className="text-section font-bold">Accès du compte</h2>
    <p>État : <strong>{states[user.state]}</strong>{user.must_change_password ? ", changement de mot de passe obligatoire." : "."}</p>
    {user.temporary_expires_at ? <p className="text-sm text-warning">Mot de passe temporaire valable jusqu’au {new Intl.DateTimeFormat("fr-MA", { dateStyle: "short", timeStyle: "short", timeZone: "Africa/Casablanca" }).format(new Date(user.temporary_expires_at))}. S’il est perdu ou expiré, réinitialisez-le avant la remise.</p> : null}
    {user.state === "disabled" ? <p>Pour réactiver ce compte, réinitialisez son mot de passe puis confirmez une nouvelle remise en personne.</p> : null}
    <div className="grid gap-4 sm:flex sm:flex-wrap">
      {actions.map(({ action, label, description }) => <AlertDialog key={action} open={open === action} onOpenChange={(value) => { if (!busy) { setOpen(value ? action : undefined); setPassword(""); setError(""); if (value) setKey(crypto.randomUUID()); } }}>
        <AlertDialogTrigger asChild><Button action={action === "disable" ? "cancelRecord" : action === "reset-password" ? "password" : "confirm"} variant={action === "disable" ? "destructive" : "outline"} disabled={busy}>{label}</Button></AlertDialogTrigger>
        <AlertDialogContent onEscapeKeyDown={(event) => { if (busy) event.preventDefault(); }}>
          <AlertDialogTitle>{label} ?</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription>
          <p className="wrap-anywhere font-medium">{user.display_name}</p>
          {action === "reset-password" ? <div className="grid gap-2"><Label htmlFor="admin-password">Votre mot de passe administrateur</Label><Input id="admin-password" type="password" autoComplete="current-password" value={password} maxLength={1024} disabled={busy} onChange={(event) => { setPassword(event.target.value); setKey(crypto.randomUUID()); }} /></div> : null}
          {error ? <div className="grid gap-4"><p role="alert" className="text-danger">{error}</p><Button action="refresh" variant="outline" onClick={() => window.location.reload()}>Recharger la fiche</Button></div> : null}
          <div className="flex flex-wrap gap-2"><AlertDialogCancel asChild><Button action="cancel" variant="outline" disabled={busy}>Annuler</Button></AlertDialogCancel><Button action={action === "disable" ? "cancelRecord" : action === "reset-password" ? "password" : "confirm"} variant={action === "disable" ? "destructive" : "default"} disabled={busy || (action === "reset-password" && !password)} onClick={() => void execute(action)}>{busy ? "Traitement…" : label}</Button></div>
        </AlertDialogContent>
      </AlertDialog>)}
    </div>
    {feedback ? <p role="status" className="text-success">{feedback}</p> : null}
    {issued ? <CredentialNotice issued={issued} clear={clear} /> : null}
  </section>;
}
