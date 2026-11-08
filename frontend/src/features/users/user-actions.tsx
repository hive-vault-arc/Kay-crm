"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useHydrated } from "@/hooks/use-hydrated";
import { ApiError } from "@/lib/api/client";
import { RecordError } from "@/features/contacts/record-states";
import { states, temporaryPasswordSchema, type StaffUser } from "./contracts";
import { PasswordField } from "./password-field";
import { staffAuthorityErrors, StaffCommandFailure, useStaffCommand } from "./use-staff-command";

type Action = "reset-password" | "delete";
export function UserActions({ user, actorId, changed, disabled = false, denied }: { user: StaffUser; actorId: string; changed: (user: StaffUser) => void; disabled?: boolean; denied?: (error: ApiError) => void }) {
  const hydrated = useHydrated();
  const [open, setOpen] = useState<Action>(), [reviewed, setReviewed] = useState<StaffUser>();
  const blocked = useRef(disabled);
  useEffect(() => { blocked.current = disabled; }, [disabled]);
  const [feedback, setFeedback] = useState("");
  const [password, setPassword] = useState("");
  const [temporary, setTemporary] = useState("");
  function clearCredentials() { setPassword(""); setTemporary(""); }
  const command = useStaffCommand({ actorId, targetId: user.id, denied: failure => {
    clearCredentials(); setOpen(undefined); setReviewed(undefined); denied?.(failure);
  }, rejected: failure => { if (failure.code === "ADMIN_PASSWORD_INVALID") setPassword(""); }, completed: (result, operation) => {
    clearCredentials();
    if (operation.method === "DELETE") { window.location.replace(result.id === actorId ? "/login" : "/settings/users"); return; }
    changed(result);
    setOpen(undefined); setReviewed(undefined);
    setFeedback("Mot de passe réinitialisé. Le compte est actif ; la personne doit choisir son propre mot de passe à la prochaine connexion.");
  } });
  const protectedOperation = command.busy || command.uncertain;
  async function execute(action: Action) {
    if (!hydrated || blocked.current || command.locked() || command.otherBusy() || !reviewed || open !== action) return;
    if (action === "reset-password" && (!password || !temporaryPasswordSchema.safeParse(temporary).success)) return;
    const target = reviewed;
    setFeedback("");
    const body = action === "reset-password"
      ? { expected_version: target.version, admin_password: password, temporary_password: temporary }
      : { expected_version: target.version };
    await command.save(`/api/v1/users/${target.id}${action === "reset-password" ? "/reset-password" : ""}`, body, action === "delete" ? "DELETE" : "POST");
  }
  if (command.error && staffAuthorityErrors.has(command.error.code)) return <RecordError error={command.error} />;
  const actions: { action: Action; label: string; description: string }[] = [
    ...(user.id !== actorId ? [{ action: "reset-password" as const, label: "Réinitialiser le mot de passe", description: "Choisissez un nouveau mot de passe initial et transmettez-le en privé. Les sessions seront révoquées. Confirmez avec votre propre mot de passe administrateur." }] : []),
    { action: "delete", label: "Supprimer l’utilisateur", description: "Ce compte sera retiré de la liste et ne pourra plus se connecter. Ses sessions seront révoquées. Son identité et ses actions dans l’historique CRM seront conservées." },
  ];
  return <section className="grid min-w-0 gap-4" aria-label="Accès du compte">
    <dl className="kay-settings-facts"><div><dt>Statut</dt><dd><Badge variant={user.state === "active" ? "success" : user.state === "pending_handoff" ? "warning" : "neutral"}>{states[user.state]}</Badge></dd></div></dl>{user.must_change_password ? <p>Changement de mot de passe obligatoire à la prochaine connexion.</p> : null}
    {user.temporary_expires_at ? <p className="text-sm text-warning">Mot de passe initial valable jusqu’au {new Intl.DateTimeFormat("fr-MA", { dateStyle: "short", timeStyle: "short", timeZone: "Africa/Casablanca" }).format(new Date(user.temporary_expires_at))}. S’il est perdu ou expiré, réinitialisez-le.</p> : null}
    {user.state !== "active" ? <p>Une réinitialisation du mot de passe permet la connexion de ce compte.</p> : null}
    <div className="grid gap-3">
      {actions.map(({ action, label, description }) => <AlertDialog key={action} open={open === action} onOpenChange={value => {
        if (!command.locked() && !command.otherBusy() && !blocked.current && command.clear()) { clearCredentials(); setReviewed(value ? user : undefined); setOpen(value ? action : undefined); }
      }}>
        <AlertDialogTrigger asChild><Button action={action === "delete" ? "remove" : "password"} variant={action === "delete" ? "destructive" : "outline"} disabled={!hydrated || disabled || command.scopeActive} className="h-auto min-h-control justify-start whitespace-normal">{label}</Button></AlertDialogTrigger>
        <AlertDialogContent aria-busy={protectedOperation} onEscapeKeyDown={event => { if (command.locked()) event.preventDefault(); }}>
          <AlertDialogTitle>{label} ?</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription>
          <p className="wrap-anywhere font-medium">{(open === action ? reviewed : user)?.display_name}</p>
          {action === "reset-password" ? <div className="grid min-w-0 gap-4">
            <div className="grid gap-2"><Label htmlFor="initial-password">Nouveau mot de passe initial</Label><PasswordField id="initial-password" autoComplete="new-password" value={temporary} disabled={!hydrated || disabled || protectedOperation} onChange={event => { if (!command.locked() && !blocked.current) setTemporary(event.target.value); }} /><p className="text-sm text-muted-foreground">12 caractères minimum. Expire après 24 heures.</p></div>
            <div className="grid gap-2"><Label htmlFor="admin-password">Votre mot de passe administrateur</Label><Input id="admin-password" type="password" data-private-credential autoComplete="current-password" value={password} maxLength={1024} disabled={!hydrated || disabled || protectedOperation} onChange={event => { if (!command.locked() && !blocked.current) setPassword(event.target.value); }} /></div>
          </div> : null}
          {open === action ? <StaffCommandFailure command={command} reload={() => { if (!command.locked() && !command.otherBusy()) window.location.reload(); }} /> : null}
          <div className="flex flex-wrap gap-2"><AlertDialogCancel asChild><Button action="cancel" variant="outline" disabled={!hydrated || disabled || protectedOperation}>Annuler</Button></AlertDialogCancel><Button action={action === "delete" ? "remove" : "password"} variant={action === "delete" ? "destructive" : "default"} disabled={!hydrated || disabled || protectedOperation || (action === "reset-password" && (!password || !temporaryPasswordSchema.safeParse(temporary).success))} onClick={() => void execute(action)}>{command.busy ? "Traitement…" : label}</Button></div>
        </AlertDialogContent>
      </AlertDialog>)}
    </div>
    {feedback ? <p role="status" className="text-success">{feedback}</p> : null}
  </section>;
}
