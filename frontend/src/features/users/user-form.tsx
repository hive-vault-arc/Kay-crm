"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ContactsIcon, SettingsIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useDossierDraft } from "@/components/shared/dossier-form";
import { useUnsavedGuard } from "@/components/shared/unsaved-guard";
import { RecordError } from "@/features/contacts/record-states";
import { useHydrated } from "@/hooks/use-hydrated";
import { namedUserSchema, roles, temporaryPasswordSchema, type StaffUser } from "./contracts";
import { PasswordField } from "./password-field";
import { SettingsWorkspace } from "./settings-workspace";
import { StaffOperationScope } from "./staff-operation-scope";
import { staffAuthorityErrors, StaffCommandFailure, useStaffCommand } from "./use-staff-command";

const fieldsSchema = namedUserSchema.extend({ temporary_password: z.string().max(1024) });
type Values = z.infer<typeof fieldsSchema>;
type UserFormProps = { user?: StaffUser; actorId: string; changed?: (user: StaffUser) => void; security?: (blocked: boolean) => ReactNode; notice?: string };
export function UserForm(props: UserFormProps) {
  return <StaffOperationScope key={`${props.actorId}:${props.user?.id ?? "new"}`}><StaffFormLifetime {...props} /></StaffOperationScope>;
}
function StaffFormLifetime({ user: initialUser, actorId, changed, security, notice = "" }: UserFormProps) {
  const [user] = useState(initialUser), [success, setSuccess] = useState("");
  const [created, setCreated] = useState<StaffUser>();
  const hydrated = useHydrated(), router = useRouter(), guard = useUnsavedGuard(), id = useId();
  const operation = useRef(false);
  const schema = fieldsSchema.superRefine((values, context) => {
    if (!user && !temporaryPasswordSchema.safeParse(values.temporary_password).success)
      context.addIssue({ code: "custom", path: ["temporary_password"], message: "Utilisez entre 12 et 1 024 caractères, pas uniquement des espaces." });
  });
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: {
    display_name: user?.display_name ?? "", email: user?.email ?? "", role: user?.role ?? "agent", temporary_password: "",
  } });
  const fields = useWatch({ control: form.control });
  const command = useStaffCommand({ actorId, targetId: user?.id, denied: () => form.reset(), completed: result => {
    form.reset({ display_name: result.display_name, email: result.email, role: result.role, temporary_password: "" });
    draft.accept({ display_name: result.display_name, email: result.email, role: result.role, initialPasswordEdited: false });
    if (user) {
      if (user.id === actorId) { window.location.replace("/login"); return; }
      changed?.(result); setSuccess("Compte enregistré. Les anciennes sessions ont été révoquées.");
    } else setCreated(result);
  } });
  const busy = form.formState.isSubmitting || command.busy, protectedOperation = busy || command.scopeActive;
  // Only a non-secret presence marker enters the draft baseline; credentials stay in their inputs/retry owner.
  const draftValues = { display_name: fields.display_name, email: fields.email, role: fields.role, initialPasswordEdited: Boolean(fields.temporary_password) };
  const draft = useDossierDraft(draftValues, protectedOperation);
  const route = user ? `/settings/users/${user.id}/edit` : "/settings/users/new";
  const error = command.error, denied = error && staffAuthorityErrors.has(error.code);
  async function submit(values: Values) {
    setSuccess("");
    const { display_name, email, role } = values;
    const body = user ? { display_name, email, role, expected_version: user.version } : values;
    await command.save(user ? `/api/v1/users/${user.id}` : "/api/v1/users", body, user ? "PATCH" : "POST");
  }
  async function submitEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hydrated || operation.current || busy || denied || !command.reserve()) return;
    operation.current = true;
    try { await form.handleSubmit(submit)(event); }
    finally { operation.current = false; command.cancelReservation(); }
  }
  const cancel = () => { if (!operation.current && !command.locked() && !command.otherBusy()) guard.request(() => router.push("/settings/users")); };
  const actions = !created && !denied ? <><Button action="cancel" type="button" variant="outline" disabled={protectedOperation} onClick={cancel}>Annuler</Button><Button action={user ? "save" : "create"} type="submit" form={id} disabled={!hydrated || protectedOperation}>{busy ? "Enregistrement…" : user ? "Enregistrer" : "Créer le compte"}</Button></> : undefined;
  return <SettingsWorkspace backToUsers active="users" route={route} title={user ? "Modifier l’utilisateur" : "Créer un utilisateur"} description="Accès de l’équipe" actions={actions}>{guard.dialog}
    {denied ? <RecordError error={error} /> : created ? <section className="kay-surface kay-settings-form-card grid gap-4"><p role="status">Compte créé et actif. La personne peut se connecter avec le mot de passe que vous avez choisi, puis doit choisir son propre mot de passe.</p><Button action="contact" asChild variant="outline"><Link href={`/settings/users/${created.id}/edit`}>Gérer le compte</Link></Button><Button action="back" asChild variant="ghost"><Link href="/settings/users">Tous les utilisateurs</Link></Button></section> : <>
    <header className="kay-settings-content-head"><div><h2>{user ? "Profil du collaborateur" : "Nouveau collaborateur"}</h2><p>{user ? "Modifiez les coordonnées et le rôle de ce compte." : "Renseignez l’identité et les accès du nouveau compte."}</p></div></header>
    <div className="kay-settings-user-layout"><Form {...form}><form id={id} method="post" aria-label={user ? "Modifier l’utilisateur" : "Créer un utilisateur"} noValidate onSubmit={event => void submitEvent(event)} className="kay-surface kay-settings-form-card" data-draft-managed data-live-dirty={draft.dirty ? "true" : undefined} aria-busy={protectedOperation}>
      <header className="kay-settings-panel-head"><ContactsIcon size={20} aria-hidden="true" /><div><h3>Identité</h3><p>Les coordonnées utilisées pour accéder au CRM.</p></div></header>
      <fieldset disabled={!hydrated || protectedOperation} className="grid min-w-0 gap-6"><div className="kay-settings-user-fields">
        <FormField control={form.control} name="display_name" render={({ field }) => <FormItem><FormLabel>Nom complet *</FormLabel><FormControl><Input {...field} aria-required autoComplete="name" maxLength={160} /></FormControl><FormMessage /></FormItem>} />
        <FormField control={form.control} name="email" render={({ field }) => <FormItem><FormLabel>Adresse e-mail *</FormLabel><FormControl><Input {...field} aria-required type="email" autoComplete="email" autoCapitalize="none" maxLength={254} /></FormControl><FormMessage /></FormItem>} />
      </div><section className="kay-settings-form-section"><header className="kay-settings-panel-head"><SettingsIcon size={20} aria-hidden="true" /><h3>Rôle et connexion</h3></header><FormField control={form.control} name="role" render={({ field }) => <FormItem><FormLabel>Rôle</FormLabel><FormControl><NativeSelect {...field}>{Object.entries(roles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></FormControl><FormMessage /></FormItem>} />
        {!user ? <FormField control={form.control} name="temporary_password" render={({ field }) => <FormItem><FormLabel>Mot de passe initial *</FormLabel><FormControl><PasswordField {...field} aria-required autoComplete="new-password" /></FormControl><p className="text-sm text-muted-foreground">12 caractères minimum. Transmettez-le en privé ; il expire après 24 heures.</p><FormMessage /></FormItem>} /> : null}
      </section></fieldset>
      <p className="mt-5 text-sm text-muted-foreground">{user ? "Enregistrer révoque les sessions de ce compte. Modifier votre propre compte nécessite une nouvelle connexion." : "Le compte est actif dès sa création. À la première connexion, la personne doit choisir un nouveau mot de passe."}</p>
      {error ? <div className="mt-4"><StaffCommandFailure command={command} reload={() => { if (!command.locked() && !command.otherBusy()) guard.request(() => window.location.reload()); }} /></div> : null}{success || notice ? <p role="status" className="mt-4 text-success">{success || notice}</p> : null}
    </form></Form><aside className="kay-settings-support"><section className="kay-surface kay-settings-form-card kay-settings-security-card"><header className="kay-settings-panel-head"><SettingsIcon size={20} aria-hidden="true" /><h3>{user ? "Sécurité du compte" : "Première connexion"}</h3></header>{security ? security(busy || command.uncertain || draft.dirty) : <p>Le collaborateur changera son mot de passe lors de sa première connexion.</p>}<p className="mt-5 text-xs text-muted-foreground">Les actions passées restent attribuées à leur auteur.</p></section></aside></div></>}
  </SettingsWorkspace>;
}
