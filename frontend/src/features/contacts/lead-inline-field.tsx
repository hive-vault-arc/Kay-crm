"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { KayIconComponent } from "@/components/icons";
import { InlineFieldForm, InlineFieldLoading, InlineRecordField, type InlineEditorControls } from "@/components/shared/inline-record-field";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { apiCommand } from "@/lib/api/command";
import { ApiError } from "@/lib/api/client";
import { useHydrated } from "@/hooks/use-hydrated";
import { BudgetInput } from "./qualification-inputs";
import { campaignLabels, ratingLabels, qualificationMetadataSchema, type QualificationMetadata } from "./qualification-contracts";
import { editEnquirySchema, enquirySchema, type Enquiry } from "./contracts";
import { RecordError } from "./record-states";
import { useQuery } from "./use-query";

export type LeadField = "initial_budget" | "campaign_source" | "rating" | "message";
export function leadInlineValues(enquiry: Enquiry) {
  return { message: enquiry.message, status: enquiry.status, initial_budget: enquiry.initial_budget ?? "", campaign_source: enquiry.campaign_source, rating: enquiry.rating };
}
type Props = { enquiry: Enquiry; field: LeadField; label: string; icon: KayIconComponent; display: ReactNode; writable: boolean; saved: (value: Enquiry) => void; denied: (error: ApiError) => void };
export function LeadInlineField(props: Props) {
  return <InlineRecordField label={props.label} icon={props.icon} display={props.display} writable={props.writable && props.enquiry.status !== "converted" && !props.enquiry.archived_at && !props.enquiry.contact.archived_at} editor={controls => <LeadFieldMetadata {...props} controls={controls} />} />;
}
function LeadFieldMetadata(props: Props & { controls: InlineEditorControls }) {
  const { denied } = props;
  const query = useQuery("/api/v1/contacts/metadata", qualificationMetadataSchema);
  useEffect(() => { if (query.error && ["FORBIDDEN", "NOT_FOUND", "UNAUTHENTICATED", "PASSWORD_CHANGE_REQUIRED"].includes(query.error.code)) denied(query.error); }, [query.error, denied]);
  if (query.error) return <><RecordError error={query.error} retry={query.refresh} /><Button autoFocus action="cancel" variant="quiet" onClick={props.controls.cancel}>Annuler</Button></>;
  return query.value ? <LeadFieldEditor {...props} metadata={query.value} /> : <InlineFieldLoading cancel={props.controls.cancel} />;
}
export function LeadFieldEditor({ enquiry, field, label, controls, metadata, saved, denied }: Props & { controls: InlineEditorControls; metadata: QualificationMetadata }) {
  const [reviewed, setReviewed] = useState(enquiry), [values, setValues] = useState(() => leadInlineValues(enquiry));
  const [busy, setBusy] = useState(false), [error, setError] = useState<ApiError>(), [invalid, setInvalid] = useState("");
  const id = useId(), hydrated = useHydrated(), lock = useRef(false), attempt = useRef({ body: "", key: "" });
  const current = enquirySchema.safeParse(error?.details?.current);
  const budgetRequired = field === "initial_budget" || !reviewed.initial_budget;
  function change(value: string) { setValues(previous => ({ ...previous, [field]: value })); }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (lock.current || enquiry.id !== reviewed.id) return;
    const parsed = editEnquirySchema.safeParse({ ...values, expected_version: reviewed.version });
    if (!parsed.success) { setInvalid(!values.initial_budget.trim() ? "Renseignez le budget avant d’enregistrer." : field === "message" ? "Vérifiez la description : 4 000 caractères au maximum." : "Choisissez une valeur autorisée pour ce champ."); return; }
    const fingerprint = JSON.stringify(parsed.data);
    if (attempt.current.body !== fingerprint) attempt.current = { body: fingerprint, key: crypto.randomUUID() };
    lock.current = true; setBusy(true); setError(undefined); setInvalid("");
    try { const result = await apiCommand(`/api/v1/enquiries/${reviewed.id}`, parsed.data, enquirySchema, attempt.current.key, "PATCH"); saved(result); controls.saved(); }
    catch (reason) { const failure = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503); setError(failure); if (["FORBIDDEN", "NOT_FOUND", "UNAUTHENTICATED", "PASSWORD_CHANGE_REQUIRED"].includes(failure.code)) denied(failure); }
    finally { lock.current = false; setBusy(false); }
  }
  function reload(keep: boolean) {
    if (!current.success || current.data.id !== reviewed.id || current.data.archived_at || current.data.contact.archived_at || current.data.status === "converted") return;
    setValues({ ...leadInlineValues(current.data), ...(keep ? { [field]: values[field], ...(!current.data.initial_budget ? { initial_budget: values.initial_budget } : {}) } : {}) }); setReviewed(current.data); setError(undefined); setInvalid("");
  }
  return <InlineFieldForm label={label} busy={busy} disabled={!hydrated || enquiry.id !== reviewed.id || enquiry.archived_at !== null || Boolean(enquiry.contact.archived_at)} dirty={JSON.stringify(values) !== JSON.stringify(leadInlineValues(reviewed))} submit={event => void submit(event)} cancel={controls.cancel}>
    {field === "message" ? <><Label className="sr-only" htmlFor={id}>{label}</Label><Textarea id={id} value={values.message} rows={3} maxLength={4000} onChange={event => change(event.target.value)} /></> : field === "rating" ? <><Label className="sr-only" htmlFor={id}>{label}</Label><NativeSelect id={id} value={values.rating} onChange={event => change(event.target.value)}>{Object.entries(ratingLabels).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</NativeSelect></> : field === "campaign_source" ? <><Label className="sr-only" htmlFor={id}>{label}</Label><NativeSelect id={id} value={values.campaign_source} onChange={event => change(event.target.value)}>{Object.entries(campaignLabels).map(([value, text]) => <option key={value} value={value}>{metadata.campaign_sources.find(option => option.value === value)?.label ?? text}</option>)}</NativeSelect></> : null}
    {budgetRequired ? <div className="grid gap-2"><Label htmlFor={id + "-budget"}>{field === "initial_budget" ? label : "Budget à qualifier"}</Label><BudgetInput id={id + "-budget"} metadata={metadata} value={values.initial_budget} onChange={initial_budget => setValues(previous => ({ ...previous, initial_budget }))} /></div> : null}
    {invalid ? <p role="alert" className="kay-inline-error">{invalid}</p> : null}{error ? <RecordError error={error} /> : null}
    {current.success && current.data.id === reviewed.id ? <div className="kay-inline-conflict"><p>Version actuelle {current.data.version} : <strong className="whitespace-pre-wrap">{field === "rating" ? ratingLabels[current.data.rating] : field === "campaign_source" ? campaignLabels[current.data.campaign_source] : current.data[field] || "Non renseigné"}</strong></p><p>Les autres champs seront conservés depuis cette version.</p>{!current.data.archived_at && !current.data.contact.archived_at && current.data.status !== "converted" ? <div className="flex flex-wrap gap-2"><Button action="refresh" type="button" variant="outline" onClick={() => reload(false)}>Charger ce champ</Button><Button action="compare" type="button" variant="outline" onClick={() => reload(true)}>Conserver ma saisie</Button></div> : <p>Ce prospect est désormais en lecture seule.</p>}</div> : null}
    {field === "message" && !values.message ? <p className="text-xs text-muted-foreground">Le message peut rester vide ; sa provenance est conservée.</p> : null}
  </InlineFieldForm>;
}
