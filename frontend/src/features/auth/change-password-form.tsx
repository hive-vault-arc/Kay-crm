"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiGet, apiPost, ApiError } from "@/lib/api/client";
import { changeSchema, meSchema } from "@/lib/auth/contracts";
import { useHydrated } from "@/hooks/use-hydrated";

const schema = changeSchema.extend({ confirmation: z.string() }).refine(
  (value) => value.new_password === value.confirmation,
  { path: ["confirmation"], message: "Les mots de passe ne correspondent pas." },
);
type Values = z.infer<typeof schema>;
export function ChangePasswordForm() {
  const hydrated = useHydrated();
  const [error, setError] = useState("");
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { old_password: "", new_password: "", confirmation: "" } });
  async function submit(values: Values) {
    setError("");
    try {
      const profile = await apiGet("/api/v1/auth/me", meSchema);
      await apiPost("/api/v1/auth/change-password", { old_password: values.old_password, new_password: values.new_password },
        z.object({ fresh_login_required: z.literal(true) }), profile.csrf_token);
      form.reset();
      window.location.replace("/login?changed=1");
    } catch (reason) {
      form.reset();
      setError(reason instanceof ApiError ? reason.message : "Le changement a échoué. Réessayez.");
    }
  }
  return <Form {...form}><form noValidate onSubmit={form.handleSubmit(submit)} className="grid gap-6" aria-busy={form.formState.isSubmitting}>
    {([
      ["old_password", "Mot de passe actuel", "current-password"],
      ["new_password", "Nouveau mot de passe", "new-password"],
      ["confirmation", "Confirmer le nouveau mot de passe", "new-password"],
    ] as const).map(([name, label, autoComplete]) => <FormField key={name} control={form.control} name={name} render={({ field }) => <FormItem>
      <FormLabel>{label}</FormLabel><FormControl><Input {...field} disabled={!hydrated || form.formState.isSubmitting} type="password" autoComplete={autoComplete} maxLength={1024} /></FormControl>
      {name === "new_password" ? <FormDescription>Au moins 12 caractères. Les phrases de passe sont acceptées.</FormDescription> : null}<FormMessage />
    </FormItem>} />)}
    {error ? <Alert variant="destructive" className="bg-danger-background text-danger"><AlertDescription className="text-danger">{error}</AlertDescription></Alert> : null}
    <Button action="password" disabled={!hydrated || form.formState.isSubmitting} type="submit">{form.formState.isSubmitting ? "Enregistrement en cours…" : "Changer le mot de passe"}</Button>
  </form></Form>;
}
