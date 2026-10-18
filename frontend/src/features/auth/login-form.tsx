"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiGet, apiPost, ApiError } from "@/lib/api/client";
import { loginSchema, meSchema, safeReturnPath } from "@/lib/auth/contracts";
import { useHydrated } from "@/hooks/use-hydrated";
import { EmailIcon, PasswordIcon, ForwardIcon, ShowPasswordIcon, HidePasswordIcon } from "@/components/icons";

type Values = z.infer<typeof loginSchema>;
export function LoginForm({ returnTo }: { returnTo: string }) {
  const hydrated = useHydrated();
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);
  const form = useForm<Values>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  async function submit(values: Values) {
    setError("");
    try {
      await apiPost("/api/v1/auth/login", values, z.object({ signed_in: z.literal(true) }));
      form.resetField("password");
      const profile = await apiGet("/api/v1/auth/me", meSchema);
      window.location.replace(profile.must_change_password ? "/change-password" : safeReturnPath(returnTo));
    } catch (reason) {
      form.resetField("password");
      setError(reason instanceof ApiError ? reason.message : "La connexion a échoué. Réessayez.");
    }
  }
  return <Form {...form}><form noValidate onSubmit={form.handleSubmit(submit)} className="grid gap-7" aria-busy={form.formState.isSubmitting}>
    <FormField control={form.control} name="email" render={({ field }) => <FormItem>
      <FormLabel><EmailIcon size={16} className="shrink-0" />Adresse e-mail</FormLabel><FormControl><Input {...field} className="rounded-lg" disabled={!hydrated || form.formState.isSubmitting} type="email" autoComplete="username" autoCapitalize="none" maxLength={254} placeholder="Votre adresse e-mail professionnelle" /></FormControl><FormMessage />
    </FormItem>} />
    <FormField control={form.control} name="password" render={({ field }) => <FormItem>
      <FormLabel><PasswordIcon size={16} className="shrink-0" />Mot de passe</FormLabel><div className="relative"><FormControl><Input {...field} className="rounded-lg pr-14" disabled={!hydrated || form.formState.isSubmitting} type={visible ? "text" : "password"} autoComplete="current-password" maxLength={1024} placeholder="Saisissez votre mot de passe" /></FormControl><Button type="button" variant="ghost" size="icon" className="absolute right-0.5 top-1/2 -translate-y-1/2 rounded-lg" disabled={!hydrated || form.formState.isSubmitting} aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"} aria-pressed={visible} onClick={() => setVisible(current => !current)}>{visible ? <HidePasswordIcon aria-hidden="true" /> : <ShowPasswordIcon aria-hidden="true" />}</Button></div><FormMessage />
    </FormItem>} />
    {error ? <Alert variant="destructive" className="bg-danger-background text-danger"><AlertDescription className="text-danger">{error}</AlertDescription></Alert> : null}
    <Button type="submit" size="lg" className="h-14 rounded-lg" disabled={!hydrated || form.formState.isSubmitting}>{form.formState.isSubmitting ? "Connexion en cours…" : "Se connecter"}<ForwardIcon size={20} className="shrink-0" /></Button>
  </form></Form>;
}
