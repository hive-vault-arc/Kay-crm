"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useHydrated } from "@/hooks/use-hydrated";
import { ApiError } from "@/lib/api/client";
import { commandSchema, issuedSchema, namedUserSchema, roles, type StaffUser, type IssuedCredential } from "./contracts";
import { userCommand } from "./api";
import { CredentialNotice } from "./credential-notice";

type Values = z.infer<typeof namedUserSchema>;
export function UserForm({ user, actorId, changed }: { user?: StaffUser; actorId: string; changed?: (user: StaffUser) => void }) {
  const hydrated = useHydrated();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [issued, setIssued] = useState<IssuedCredential>();
  const [created, setCreated] = useState<StaffUser>();
  const attempt = useRef({ key: "", body: "" });
  const clear = useCallback(() => setIssued(undefined), []);
  const form = useForm<Values>({ resolver: zodResolver(namedUserSchema), defaultValues: user ? { display_name: user.display_name, email: user.email, role: user.role } : { display_name: "", email: "", role: "agent" } });
  async function submit(values: Values) {
    setError(""); setSuccess(""); clear();
    const body = user ? { ...values, expected_version: user.version } : values;
    const fingerprint = JSON.stringify(body);
    if (attempt.current.body !== fingerprint) attempt.current = { key: crypto.randomUUID(), body: fingerprint };
    try {
      if (user) {
        const result = await userCommand(`/api/v1/users/${user.id}`, body, commandSchema, attempt.current.key, "PATCH");
        if (user.id === actorId) { window.location.replace("/login"); return; }
        changed?.(result.user); setSuccess("Compte enregistré. Les anciennes sessions ont été révoquées.");
      } else {
        const result = await userCommand("/api/v1/users", body, issuedSchema, attempt.current.key);
        setCreated(result.user); setIssued(result);
      }
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : "L’enregistrement a échoué. Réessayez."); }
  }
  if (created) return <div className="grid gap-6">
    {issued ? <CredentialNotice issued={issued} clear={clear} /> : <p role="status">Compte créé, affichage effacé. Le mot de passe ne peut plus être réaffiché.</p>}
    <Link className="min-h-control py-3 text-link underline" href={`/settings/users/${created.id}/edit`}>Gérer le compte</Link>
    <Link className="min-h-control py-3 text-link underline" href="/settings/users">Tous les utilisateurs</Link>
  </div>;
  return <Form {...form}><form noValidate onSubmit={(event) => void form.handleSubmit(submit)(event)} className="form-surface grid max-w-reading gap-6" aria-busy={form.formState.isSubmitting}>
    <fieldset disabled={!hydrated || form.formState.isSubmitting} className="grid min-w-0 gap-4">
      <FormField control={form.control} name="display_name" render={({ field }) => <FormItem><FormLabel>Nom complet</FormLabel><FormControl><Input {...field} autoComplete="name" maxLength={160} /></FormControl><FormMessage /></FormItem>} />
      <FormField control={form.control} name="email" render={({ field }) => <FormItem><FormLabel>Adresse e-mail</FormLabel><FormControl><Input {...field} type="email" autoComplete="email" autoCapitalize="none" maxLength={254} /></FormControl><FormMessage /></FormItem>} />
      <FormField control={form.control} name="role" render={({ field }) => <FormItem><FormLabel>Rôle</FormLabel><FormControl><NativeSelect {...field}>{Object.entries(roles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></FormControl><FormMessage /></FormItem>} />
    </fieldset>
    <p className="text-sm text-muted-foreground">{user ? "Enregistrer révoque les sessions de ce compte. Modifier votre propre compte nécessite une nouvelle connexion." : "Un mot de passe aléatoire sera affiché une fois. Le compte restera en attente jusqu’à la remise en personne."}</p>
    {error ? <p role="alert" className="text-danger">{error}</p> : null}
    {success ? <p role="status" className="text-success">{success}</p> : null}
    <div className="flex flex-wrap gap-2"><Button action={user ? "save" : "create"} type="submit" disabled={!hydrated || form.formState.isSubmitting}>{form.formState.isSubmitting ? "Enregistrement…" : user ? "Enregistrer" : "Créer le compte"}</Button><Button action="cancel" asChild variant="outline"><Link href="/settings/users">Annuler</Link></Button></div>
    {error ? <Button action="refresh" type="button" variant="outline" onClick={() => window.location.reload()}>Recharger la fiche</Button> : null}
  </form></Form>;
}
