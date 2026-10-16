"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { useHydrated } from "@/hooks/use-hydrated";
import { ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { editEnquirySchema, enquirySchema, statusLabels, type Enquiry } from "./contracts";
import { CommandError } from "./record-states";

const fields = editEnquirySchema.omit({ expected_version: true });
type Values = z.infer<typeof fields>;
export function LeadEditor({ enquiry }: { enquiry: Enquiry }) {
  const hydrated = useHydrated();
  const form = useForm<Values>({ resolver: zodResolver(fields), defaultValues: { message: enquiry.message, status: enquiry.status } });
  const [version, setVersion] = useState(enquiry.version);
  const [error, setError] = useState<ApiError>();
  const [success, setSuccess] = useState(false);
  const attempt = useRef({ body: "", key: "" });
  const current = enquirySchema.safeParse(error?.details?.current);
  async function submit(values: Values) {
    setError(undefined); setSuccess(false);
    const body = { ...values, expected_version: version };
    const fingerprint = JSON.stringify(body);
    if (attempt.current.body !== fingerprint) attempt.current = { body: fingerprint, key: crypto.randomUUID() };
    try { const result = await apiCommand(`/api/v1/enquiries/${enquiry.id}`, body, enquirySchema, attempt.current.key, "PATCH"); setVersion(result.version); setSuccess(true); }
    catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); }
  }
  return <Form {...form}><form noValidate className="form-surface grid max-w-reading gap-6" aria-busy={form.formState.isSubmitting} onSubmit={event => void form.handleSubmit(submit)(event)}>
    <p className="wrap-anywhere">Contact : <Link className="inline-flex min-h-control items-center text-link underline" href={`/contacts/${enquiry.contact.id}`}>{enquiry.contact.name}</Link></p>
    <fieldset disabled={!hydrated || form.formState.isSubmitting} className="grid gap-4">
      <FormField control={form.control} name="message" render={({ field }) => <FormItem><FormLabel>Message de la demande</FormLabel><FormControl><Textarea {...field} rows={5} maxLength={4000} /></FormControl><FormMessage /></FormItem>} />
      <FormField control={form.control} name="status" render={({ field }) => <FormItem><FormLabel>Statut</FormLabel><FormControl><NativeSelect {...field}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></FormControl><FormMessage /></FormItem>} />
    </fieldset>
    <CommandError error={error} dismiss={() => setError(undefined)} />
    {current.success ? <section className="grid gap-4 rounded-md border border-warning bg-warning-background p-4" aria-label="Comparaison de la demande"><h2 className="font-medium">Version actuelle {current.data.version}</h2><p>{statusLabels[current.data.status]}</p><p className="whitespace-pre-wrap wrap-anywhere">{current.data.message || "Aucun message."}</p><p>Votre saisie est conservée. Comparez-la avant de remplacer cette version.</p><div className="flex flex-wrap gap-2"><Button action="refresh" type="button" variant="outline" onClick={() => { form.reset({ message: current.data.message, status: current.data.status }); setVersion(current.data.version); setError(undefined); }}>Charger la version actuelle</Button><Button action="compare" type="button" variant="outline" className="h-auto min-h-control whitespace-normal" onClick={() => { setVersion(current.data.version); setError(undefined); }}>Conserver ma saisie pour remplacer cette version</Button></div></section> : null}
    {success ? <p role="status" className="text-success">Demande enregistrée.</p> : null}
    <p className="text-sm text-muted-foreground">La source, la référence initiale et le contact lié sont conservés. Un responsable peut gérer l’attribution depuis le détail de la demande.</p>
    <div className="flex flex-wrap gap-2"><Button action="save" disabled={!hydrated || form.formState.isSubmitting} type="submit">{form.formState.isSubmitting ? "Enregistrement…" : "Enregistrer la demande"}</Button><Button action="back" asChild variant="outline"><Link href={`/leads/${enquiry.id}`}>Voir le Lead</Link></Button></div>
  </form></Form>;
}
