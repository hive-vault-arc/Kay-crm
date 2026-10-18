"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useHydrated } from "@/hooks/use-hydrated";
import { ApiError } from "@/lib/api/client";
import { commandSchema, namedUserSchema, roles, temporaryPasswordSchema, type StaffUser } from "./contracts";
import { userCommand } from "./api";
import { PasswordField } from "./password-field";

const fieldsSchema = namedUserSchema.extend({ temporary_password: z.string().max(1024) });
type Values = z.infer<typeof fieldsSchema>;
export function UserForm({ user, actorId, changed }: { user?: StaffUser; actorId: string; changed?: (user: StaffUser) => void }) {
  const hydrated = useHydrated();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [created, setCreated] = useState<StaffUser>();
  const attempt = useRef({ key: "", body: "" });
  const schema = fieldsSchema.superRefine((values, context) => {
    if (!user && !temporaryPasswordSchema.safeParse(values.temporary_password).success)
      context.addIssue({ code: "custom", path: ["temporary_password"], message: "Utilisez entre 12 et 1 024 caractères, pas uniquement des espaces." });
  });
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: {
    display_name: user?.display_name ?? "", email: user?.email ?? "", role: user?.role ?? "agent", temporary_password: "",
  } });
  async function submit(values: Values) {
    setError(""); setSuccess("");
    const { display_name, email, role } = values;
    const body = user ? { display_name, email, role, expected_version: user.version } : values;
    const fingerprint = JSON.stringify(body);
    if (attempt.current.body !== fingerprint) attempt.current = { key: crypto.randomUUID(), body: fingerprint };
    try {
      if (user) {
        const result = await userCommand(`/api/v1/users/${user.id}`, body, commandSchema, attempt.current.key, "PATCH");
        if (user.id === actorId) { window.location.replace("/login"); return; }
        changed?.(result.user); setSuccess("Compte enregistré. Les anciennes sessions ont été révoquées.");
      } else {
        const result = await userCommand("/api/v1/users", body, commandSchema, attempt.current.key);
        form.reset(); attempt.current = { key: "", body: "" }; setCreated(result.user);
      }
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : "L’enregistrement a échoué. Réessayez."); }
  }
  if (created) return <div className="grid gap-6">
    <p role="status">Compte créé et actif. La personne peut se connecter avec le mot de passe que vous avez choisi, puis doit choisir son propre mot de passe.</p>
    <Link className="min-h-control py-3 text-link underline" href={`/settings/users/${created.id}/edit`}>Gérer le compte</Link>
    <Link className="min-h-control py-3 text-link underline" href="/settings/users">Tous les utilisateurs</Link>
  </div>;
  return <Form {...form}><form noValidate onSubmit={(event) => void form.handleSubmit(submit)(event)} className="form-surface grid max-w-reading gap-6" aria-busy={form.formState.isSubmitting}>
    <fieldset disabled={!hydrated || form.formState.isSubmitting} className="grid min-w-0 gap-4">
      <FormField control={form.control} name="display_name" render={({ field }) => <FormItem><FormLabel>Nom complet</FormLabel><FormControl><Input {...field} autoComplete="name" maxLength={160} /></FormControl><FormMessage /></FormItem>} />
      <FormField control={form.control} name="email" render={({ field }) => <FormItem><FormLabel>Adresse e-mail</FormLabel><FormControl><Input {...field} type="email" autoComplete="email" autoCapitalize="none" maxLength={254} /></FormControl><FormMessage /></FormItem>} />
      <FormField control={form.control} name="role" render={({ field }) => <FormItem><FormLabel>Rôle</FormLabel><FormControl><NativeSelect {...field}>{Object.entries(roles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></FormControl><FormMessage /></FormItem>} />
      {!user ? <FormField control={form.control} name="temporary_password" render={({ field }) => <FormItem><FormLabel>Mot de passe initial</FormLabel><FormControl><PasswordField {...field} autoComplete="new-password" /></FormControl><p className="text-sm text-muted-foreground">12 caractères minimum. Transmettez-le en privé ; il expire après 24 heures.</p><FormMessage /></FormItem>} /> : null}
    </fieldset>
    <p className="text-sm text-muted-foreground">{user ? "Enregistrer révoque les sessions de ce compte. Modifier votre propre compte nécessite une nouvelle connexion." : "Le compte est actif dès sa création. À la première connexion, la personne doit choisir un nouveau mot de passe."}</p>
    {error ? <p role="alert" className="text-danger">{error}</p> : null}
    {success ? <p role="status" className="text-success">{success}</p> : null}
    <div className="flex flex-wrap gap-2"><Button action={user ? "save" : "create"} type="submit" disabled={!hydrated || form.formState.isSubmitting}>{form.formState.isSubmitting ? "Enregistrement…" : user ? "Enregistrer" : "Créer le compte"}</Button><Button action="cancel" asChild variant="outline"><Link href="/settings/users">Annuler</Link></Button></div>
    {error ? <Button action="refresh" type="button" variant="outline" onClick={() => window.location.reload()}>Recharger la fiche</Button> : null}
  </form></Form>;
}
