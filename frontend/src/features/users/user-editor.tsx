"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RecordError } from "@/features/contacts/record-states";
import { apiGet, ApiError } from "@/lib/api/client";
import { userSchema, type StaffUser } from "./contracts";
import { UserForm } from "./user-form";
import { UserActions } from "./user-actions";
import { SettingsWorkspace } from "./settings-workspace";

export function UserEditor({ id, actorId }: { id: string; actorId: string }) {
  return <StaffEditorLifetime key={`${actorId}:${id}`} id={id} actorId={actorId} />;
}
function StaffEditorLifetime({ id, actorId }: { id: string; actorId: string }) {
  const [user, setUser] = useState<StaffUser>(), [error, setError] = useState<ApiError>();
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    apiGet(`/api/v1/users/${id}`, userSchema, controller.signal).then(value => {
      if (controller.signal.aborted) return;
      if (value.id !== id) throw new ApiError("INVALID_RESPONSE", 503);
      setUser(value);
    }).catch(reason => {
      if (!controller.signal.aborted) { setUser(undefined); setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); }
    });
    return () => controller.abort();
  }, [id, retry]);
  if (error || !user) return <SettingsWorkspace backToUsers active="users" route={`/settings/users/${id}/edit`} title="Modifier l’utilisateur" description="Accès de l’équipe">{error ? <div className="grid gap-4"><RecordError error={error} /><Button action="retry" variant="outline" onClick={() => { setUser(undefined); setError(undefined); setRetry(retry + 1); }}>Réessayer</Button></div> : <p role="status">Chargement du compte…</p>}</SettingsWorkspace>;
  return <UserForm key={`${user.id}:${user.version}`} user={user} actorId={actorId} notice={notice} changed={value => { setNotice("Compte enregistré. Les anciennes sessions ont été révoquées."); setUser(value); }} security={blocked => <UserActions user={user} actorId={actorId} disabled={blocked} changed={value => { setNotice("Mot de passe réinitialisé. La personne doit choisir son propre mot de passe à la prochaine connexion."); setUser(value); }} denied={failure => { setUser(undefined); setError(failure); }} />} />;
}
