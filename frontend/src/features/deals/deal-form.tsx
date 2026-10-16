"use client";
import { ContactIcon, DealIcon } from "@/components/icons";
import { SectionHeading } from "@/components/shared/section-heading";
import Link from "next/link";
import { useRef, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RecordError } from "@/features/contacts/record-states";
import type { Offering } from "@/features/inventory/contracts";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { dealSchema, fieldsSchema, ordinaryStages, resultSchema, stageLabels, type Deal, type DealContext } from "./contracts";
import { OfferingPicker, RequirementPicker } from "./context-picker";

const textSchema = z.object({ title: fieldsSchema.shape.title, next_action: fieldsSchema.shape.next_action }).strict();
export function DealForm({ contact, context = {}, offering = null, value, saved, cancel, busyChanged }: { contact: Deal["contact"]; context?: DealContext; offering?: Offering | null; value?: Deal; saved: (id: string) => Promise<void>; cancel?: () => void; busyChanged?: (busy: boolean) => void }) {
  const form = useForm<z.infer<typeof textSchema>>({ resolver: zodResolver(textSchema), defaultValues: { title: value?.title ?? "", next_action: value?.next_action ?? "" } });
  const [requirement, setRequirement] = useState(value?.requirement_id ?? context.requirement_id ?? null); const [selected, setSelected] = useState<Offering | null>(value?.offering ?? offering);
  const [stage, setStage] = useState<(typeof ordinaryStages)[number]>("new"); const [version, setVersion] = useState(value?.version); const [current, setCurrent] = useState<Deal>(); const [error, setError] = useState<ApiError>();
  const attempt = useRef({ key: "", body: "" }); const hydrated = useHydrated(); const pending = form.formState.isSubmitting;
  async function submit(text: z.infer<typeof textSchema>) {
    setError(undefined); busyChanged?.(true);
    const fields = { ...text, requirement_id: requirement, offering_id: selected?.id ?? null, expected_offering_version: selected?.version ?? null };
    const body = value ? { ...fields, expected_version: version } : { ...fields, contact_id: contact.id, enquiry_id: context.enquiry_id ?? null, stage };
    const serialized = JSON.stringify(body); if (attempt.current.body !== serialized) attempt.current = { key: crypto.randomUUID(), body: serialized };
    try { const result = await apiCommand(value ? `/api/v1/deals/${value.id}` : "/api/v1/deals", body, resultSchema, attempt.current.key, value ? "PATCH" : "POST"); await saved(result.id); }
    catch (reason) { const failure = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503); setError(failure); if (value && failure.code === "DEAL_VERSION_CONFLICT") { try { setCurrent(await apiGet(`/api/v1/deals/${value.id}`, dealSchema)); } catch (comparison) { if (comparison instanceof ApiError && ["NOT_FOUND", "FORBIDDEN", "UNAUTHENTICATED"].includes(comparison.code)) setError(comparison); } } }
    finally { busyChanged?.(false); }
  }
  if (error && ["NOT_FOUND", "FORBIDDEN", "UNAUTHENTICATED", "CONTACT_ARCHIVED"].includes(error.code)) return <RecordError error={error} />;
  return <Form {...form}><form noValidate aria-label={value ? "Modifier l’affaire" : "Nouvelle affaire"} aria-busy={pending} className="form-surface grid min-w-0 max-w-reading gap-6" onSubmit={event => void form.handleSubmit(submit)(event)}><fieldset disabled={!hydrated || pending} className="grid min-w-0 gap-6"><section className="grid gap-2"><SectionHeading icon={ContactIcon}>{value ? "Modifier l’affaire" : "Contact de l’affaire"}</SectionHeading><p className="wrap-anywhere">{contact.name}</p><p className="wrap-anywhere">Responsable actuel : {contact.primary_agent.display_name}. Il suit le contact, sans réattribution automatique.</p>{context.enquiry_id || value?.enquiry_id ? <Link className="inline-flex min-h-control items-center justify-self-start text-link underline" href={`/leads/${context.enquiry_id ?? value?.enquiry_id}`}>Demande d’origine conservée</Link> : <p>Sans demande d’origine liée.</p>}</section>
    <SectionHeading icon={DealIcon} tone="purple">Suivi de l’affaire</SectionHeading>
    <FormField control={form.control} name="title" render={({ field }) => <FormItem><FormLabel>Titre de l’affaire</FormLabel><FormControl><Input {...field} maxLength={160} /></FormControl><FormMessage /></FormItem>} />
    {!value ? <div className="grid gap-2"><Label htmlFor="initial-stage">Étape initiale</Label><NativeSelect id="initial-stage" value={stage} onChange={e => setStage(e.target.value as typeof stage)}>{ordinaryStages.map(id => <option key={id} value={id}>{stageLabels[id]}</option>)}</NativeSelect></div> : null}
    <FormField control={form.control} name="next_action" render={({ field }) => <FormItem><FormLabel>Prochaine action</FormLabel><FormControl><Textarea {...field} maxLength={1000} /></FormControl><FormMessage /></FormItem>} />
    <RequirementPicker contactId={contact.id} selected={requirement} choose={setRequirement} /><OfferingPicker selected={selected} choose={setSelected} />
    {error ? <div className="grid gap-2"><RecordError error={error} /><p>Votre saisie est conservée. Si la réponse a été interrompue, réessayez sans la modifier pour éviter un doublon.</p></div> : null}
    {current ? <section aria-label="Version actuelle de l’affaire" className="grid gap-4 border-y py-4"><h3 className="font-medium">Version actuelle {current.version}</h3><p className="wrap-anywhere">{current.title} · {stageLabels[current.stage]}</p><p className="whitespace-pre-wrap wrap-anywhere">Prochaine action : {current.next_action || "Non renseignée"}</p><p>Recherche : {current.requirement_id ?? "Aucune"}. Offre : {current.offering?.target?.reference ?? "Aucune"}.</p><Button type="button" variant="outline" className="h-auto min-h-control justify-self-start whitespace-normal" onClick={() => { setVersion(current.version); setCurrent(undefined); setError(undefined); }}>Conserver ma saisie sur cette version</Button></section> : null}
    <div className="flex flex-wrap gap-2"><Button type="submit" disabled={Boolean(current)}>{pending ? "Enregistrement…" : value ? "Enregistrer l’affaire" : "Créer l’affaire"}</Button>{cancel ? <Button type="button" variant="outline" onClick={cancel}>Annuler les modifications</Button> : <Button asChild variant="outline"><Link href="/deals">Retour aux affaires</Link></Button>}</div></fieldset></form></Form>;
}
