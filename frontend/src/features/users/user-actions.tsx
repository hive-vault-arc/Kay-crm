"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ApiError } from "@/lib/api/client";
import { commandSchema, states, temporaryPasswordSchema, type StaffUser } from "./contracts";
import { userCommand } from "./api";
import { PasswordField } from "./password-field";

type Action = "reset-password" | "delete";
export function UserActions({ user, actorId, changed }: { user: StaffUser; actorId: string; changed: (user: StaffUser) => void }) {
  const [open, setOpen] = useState<Action>();
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const attempt = useRef({ key: "", body: "" });
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [password, setPassword] = useState("");
  const [temporary, setTemporary] = useState("");
  function clear() { setPassword(""); setTemporary(""); attempt.current = { key: "", body: "" }; }
  async function execute(action: Action) {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError(""); setFeedback("");
    const body = action === "reset-password"
      ? { expected_version: user.version, admin_password: password, temporary_password: temporary }
      : { expected_version: user.version };
    const fingerprint = JSON.stringify(body);
    if (attempt.current.body !== fingerprint) attempt.current = { key: crypto.randomUUID(), body: fingerprint };
    try {
      const result = await userCommand(`/api/v1/users/${user.id}${action === "reset-password" ? "/reset-password" : ""}`,
        body, commandSchema, attempt.current.key, action === "delete" ? "DELETE" : "POST");
      clear(); setOpen(undefined);
      if (action === "delete") { window.location.replace(user.id === actorId ? "/login" : "/settings/users"); return; }
      changed(result.user);
      setFeedback("Mot de passe réinitialisé. Le compte est actif ; la personne doit choisir son propre mot de passe à la prochaine connexion.");
    } catch (reason) {
      if (reason instanceof ApiError && reason.code === "ADMIN_PASSWORD_INVALID") setPassword("");
      setError(reason instanceof ApiError ? reason.message : "L’action a échoué. Réessayez.");
    }
    finally { submitting.current = false; setBusy(false); }
  }
  const actions: { action: Action; label: string; description: string }[] = [
    ...(user.id !== actorId ? [{ action: "reset-password" as const, label: "Réinitialiser le mot de passe", description: "Choisissez un nouveau mot de passe initial et transmettez-le en privé. Les sessions seront révoquées. Confirmez avec votre propre mot de passe administrateur." }] : []),
    { action: "delete", label: "Supprimer l’utilisateur", description: "Ce compte sera retiré de la liste et ne pourra plus se connecter. Ses sessions seront révoquées. Son identité et ses actions dans l’historique CRM seront conservées." },
  ];
  return <section className="grid max-w-reading gap-4 border-t pt-6" aria-label="Accès du compte">
    <h2 className="text-section font-bold">Accès du compte</h2>
    <p>État : <strong>{states[user.state]}</strong>{user.must_change_password ? ", changement de mot de passe obligatoire." : "."}</p>
    {user.temporary_expires_at ? <p className="text-sm text-warning">Mot de passe initial valable jusqu’au {new Intl.DateTimeFormat("fr-MA", { dateStyle: "short", timeStyle: "short", timeZone: "Africa/Casablanca" }).format(new Date(user.temporary_expires_at))}. S’il est perdu ou expiré, réinitialisez-le.</p> : null}
    {user.state !== "active" ? <p>Une réinitialisation du mot de passe permet la connexion de ce compte.</p> : null}
    <div className="grid gap-4 sm:flex sm:flex-wrap">
      {actions.map(({ action, label, description }) => <AlertDialog key={action} open={open === action} onOpenChange={value => {
        if (!busy) { setOpen(value ? action : undefined); clear(); setError(""); }
      }}>
        <AlertDialogTrigger asChild><Button action={action === "delete" ? "remove" : "password"} variant={action === "delete" ? "destructive" : "outline"} disabled={busy}>{label}</Button></AlertDialogTrigger>
        <AlertDialogContent onEscapeKeyDown={event => { if (busy) event.preventDefault(); }}>
          <AlertDialogTitle>{label} ?</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription>
          <p className="wrap-anywhere font-medium">{user.display_name}</p>
          {action === "reset-password" ? <div className="grid min-w-0 gap-4">
            <div className="grid gap-2"><Label htmlFor="initial-password">Nouveau mot de passe initial</Label><PasswordField id="initial-password" autoComplete="new-password" value={temporary} disabled={busy} onChange={event => setTemporary(event.target.value)} /><p className="text-sm text-muted-foreground">12 caractères minimum. Expire après 24 heures.</p></div>
            <div className="grid gap-2"><Label htmlFor="admin-password">Votre mot de passe administrateur</Label><Input id="admin-password" type="password" data-private-credential autoComplete="current-password" value={password} maxLength={1024} disabled={busy} onChange={event => setPassword(event.target.value)} /></div>
          </div> : null}
          {error ? <div className="grid gap-4"><p role="alert" className="text-danger">{error}</p><Button action="refresh" variant="outline" onClick={() => window.location.reload()}>Recharger la fiche</Button></div> : null}
          <div className="flex flex-wrap gap-2"><AlertDialogCancel asChild><Button action="cancel" variant="outline" disabled={busy}>Annuler</Button></AlertDialogCancel><Button action={action === "delete" ? "remove" : "password"} variant={action === "delete" ? "destructive" : "default"} disabled={busy || (action === "reset-password" && (!password || !temporaryPasswordSchema.safeParse(temporary).success))} onClick={() => void execute(action)}>{busy ? "Traitement…" : label}</Button></div>
        </AlertDialogContent>
      </AlertDialog>)}
    </div>
    {feedback ? <p role="status" className="text-success">{feedback}</p> : null}
  </section>;
}
