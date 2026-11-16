"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { RecordError } from "@/features/contacts/record-states";
import { apiGet, ApiError } from "@/lib/api/client";
import { userSchema, type StaffUser } from "./contracts";
import { UserForm } from "./user-form";
import { UserActions } from "./user-actions";
import { SettingsWorkspace } from "./settings-workspace";
import { StaffOperationScope } from "./staff-operation-scope";

type EditorProps = { id: string; actorId: string; agentAccountsOnly: boolean };

export function UserEditor(props: EditorProps) {
  return <StaffEditorLifetime key={`${props.actorId}:${props.id}:${props.agentAccountsOnly}`} {...props} />;
}
function StaffEditorLifetime({ id, actorId, agentAccountsOnly }: EditorProps) {
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
  const route = `/settings/users/${id}/edit`;
  const title = agentAccountsOnly ? "Compte agent" : "Modifier l’utilisateur";
  if (error || !user) return <SettingsWorkspace backToUsers active="users" route={route} title={title} description="Accès de l’équipe" agentAccountsOnly={agentAccountsOnly}>{error ? <RecordError error={error} retry={error.status >= 500 ? () => { setError(undefined); setRetry(value => value + 1); } : undefined} /> : <section className="kay-surface kay-settings-form-card grid gap-4" role="status"><span className="sr-only">Chargement du compte…</span><Skeleton className="h-6 w-36" /><Skeleton className="h-24 w-full" /></section>}</SettingsWorkspace>;
  const deny = (failure: ApiError) => { setUser(undefined); setError(failure); };
  if (agentAccountsOnly) return <SettingsWorkspace backToUsers active="users" route={route} title={title} agentAccountsOnly>
    <section className="kay-surface kay-settings-form-card grid gap-4">
      <div><h2 className="font-semibold wrap-anywhere">{user.display_name}</h2><p className="text-muted-foreground wrap-anywhere">{user.email}</p></div>
      <StaffOperationScope><UserActions user={user} actorId={actorId} changed={setUser} denied={deny} allowDelete={false} /></StaffOperationScope>
    </section>
  </SettingsWorkspace>;
  return <UserForm key={`${user.id}:${user.version}`} user={user} actorId={actorId} notice={notice} changed={value => { setNotice("Compte enregistré. Les anciennes sessions ont été révoquées."); setUser(value); }} security={blocked => <UserActions user={user} actorId={actorId} disabled={blocked} changed={value => { setNotice("Mot de passe réinitialisé. Les anciennes sessions ont été révoquées."); setUser(value); }} denied={deny} />} />;
}
