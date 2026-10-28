"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import type { KayIconComponent } from "@/components/icons";
import { InlineFieldForm, InlineFieldLoading, InlineRecordField, type InlineEditorControls } from "@/components/shared/inline-record-field";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useHydrated } from "@/hooks/use-hydrated";
import { BudgetInput } from "./qualification-inputs";
import { campaignLabels, ratingLabels, qualificationMetadataSchema, type QualificationMetadata } from "./qualification-contracts";
import { editEnquirySchema, enquirySchema, type Enquiry } from "./contracts";
import { RecordError } from "./record-states";
import { useQuery } from "./use-query";
import { useEnquiryCommand, type EnquiryDenied } from "./use-enquiry-command";

export type LeadField = "initial_budget" | "campaign_source" | "rating" | "message";
export function leadInlineValues(enquiry: Enquiry) {
  return { message: enquiry.message, status: enquiry.status, initial_budget: enquiry.initial_budget ?? "", campaign_source: enquiry.campaign_source, rating: enquiry.rating };
}
type Props = { enquiry: Enquiry; field: LeadField; label: string; icon: KayIconComponent; display: ReactNode; writable: boolean; saved: (value: Enquiry) => void; denied: EnquiryDenied };
export function LeadInlineField(props: Props) {
  return <InlineRecordField label={props.label} icon={props.icon} display={props.display} writable={props.writable && props.enquiry.status !== "converted" && !props.enquiry.archived_at && !props.enquiry.contact.archived_at} editor={controls => <LeadFieldMetadata {...props} controls={controls} />} />;
}
function LeadFieldMetadata(props: Props & { controls: InlineEditorControls }) {
  const { denied } = props;
  const query = useQuery("/api/v1/contacts/metadata", qualificationMetadataSchema);
  const [loaded, setLoaded] = useState<QualificationMetadata>();
  if (query.value && query.value !== loaded) setLoaded(query.value);
  useEffect(() => { if (query.error && ["FORBIDDEN", "NOT_FOUND", "UNAUTHENTICATED", "PASSWORD_CHANGE_REQUIRED"].includes(query.error.code)) denied(query.error); }, [query.error, denied]);
  if (query.error && [401, 403, 404].includes(query.error.status)) return <><RecordError error={query.error} retry={query.refresh} /><Button autoFocus action="cancel" variant="quiet" onClick={props.controls.cancel}>Annuler</Button></>;
  const metadata = query.value ?? loaded;
  return metadata ? <>{query.error ? <RecordError error={query.error} retry={query.refresh} /> : null}<LeadFieldEditor key={props.enquiry.id + ":" + props.enquiry.contact.id + ":" + props.field} {...props} metadata={metadata} unavailable={Boolean(query.error)} /></> : query.error ? <><RecordError error={query.error} retry={query.refresh} /><Button autoFocus action="cancel" variant="quiet" onClick={props.controls.cancel}>Annuler</Button></> : <InlineFieldLoading cancel={props.controls.cancel} />;
}
export function LeadFieldEditor({ enquiry, field, label, controls, metadata, saved, denied, unavailable = false }: Props & { controls: InlineEditorControls; metadata: QualificationMetadata; unavailable?: boolean }) {
  const [reviewed, setReviewed] = useState(enquiry), [values, setValues] = useState(() => leadInlineValues(enquiry));
  const [invalid, setInvalid] = useState("");
  const id = useId(), hydrated = useHydrated();
  const command = useEnquiryCommand({ id: reviewed.id, contactId: reviewed.contact.id, denied, saved: async (result, signal) => { saved(result); if (!signal.aborted) controls.saved(); } });
  const { error } = command;
  const current = enquirySchema.safeParse(error?.details?.current);
  const budgetRequired = field === "initial_budget" || !reviewed.initial_budget;
  function change(value: string) { if (command.canEdit()) setValues(previous => ({ ...previous, [field]: value })); }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (command.uncertain) { await command.retry(); return; } if (!command.canEdit() || unavailable || enquiry.id !== reviewed.id || enquiry.contact.id !== reviewed.contact.id) return;
    const parsed = editEnquirySchema.safeParse({ ...values, expected_version: reviewed.version });
    if (!parsed.success) { setInvalid(!values.initial_budget.trim() ? "Renseignez le budget avant d’enregistrer." : field === "message" ? "Vérifiez la description : 4 000 caractères au maximum." : "Choisissez une valeur autorisée pour ce champ."); return; }
    setInvalid(""); await command.submit(parsed.data);
  }
  function reload(keep: boolean) {
    if (!current.success || current.data.id !== reviewed.id || current.data.contact.id !== reviewed.contact.id || current.data.archived_at || current.data.contact.archived_at || current.data.status === "converted" || !command.begin()) return;
    setValues({ ...leadInlineValues(current.data), ...(keep ? { [field]: values[field], ...(!current.data.initial_budget ? { initial_budget: values.initial_budget } : {}) } : {}) }); setReviewed(current.data); setInvalid("");
  }
  if (command.accessError) return <RecordError error={command.accessError} />;
  return <InlineFieldForm label={label} busy={command.busy} recovering={command.uncertain} disabled={!hydrated || enquiry.id !== reviewed.id || enquiry.contact.id !== reviewed.contact.id || !command.uncertain && (unavailable || enquiry.archived_at !== null || Boolean(enquiry.contact.archived_at))} dirty={JSON.stringify(values) !== JSON.stringify(leadInlineValues(reviewed))} submit={event => void submit(event)} cancel={() => { if (command.canEdit()) controls.cancel(); }}>
    {field === "message" ? <><Label className="sr-only" htmlFor={id}>{label}</Label><Textarea id={id} value={values.message} rows={3} maxLength={4000} onChange={event => change(event.target.value)} /></> : field === "rating" ? <><Label className="sr-only" htmlFor={id}>{label}</Label><NativeSelect id={id} value={values.rating} onChange={event => change(event.target.value)}>{Object.entries(ratingLabels).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</NativeSelect></> : field === "campaign_source" ? <><Label className="sr-only" htmlFor={id}>{label}</Label><NativeSelect id={id} value={values.campaign_source} onChange={event => change(event.target.value)}>{Object.entries(campaignLabels).map(([value, text]) => <option key={value} value={value}>{metadata.campaign_sources.find(option => option.value === value)?.label ?? text}</option>)}</NativeSelect></> : null}
    {budgetRequired ? <div className="grid gap-2"><Label htmlFor={id + "-budget"}>{field === "initial_budget" ? label : "Budget à qualifier"}</Label><BudgetInput id={id + "-budget"} metadata={metadata} value={values.initial_budget} onChange={initial_budget => { if (command.canEdit()) setValues(previous => ({ ...previous, initial_budget })); }} /></div> : null}
    {invalid ? <p role="alert" className="kay-inline-error">{invalid}</p> : null}{error ? <RecordError error={error} /> : null}
    {command.uncertain ? <p role="status">{command.acknowledged ? "La modification est enregistrée. Réessayez pour actualiser son résultat." : "La réponse est interrompue. Réessayez la même modification pour retrouver son résultat."}</p> : null}
    {current.success && current.data.id === reviewed.id && current.data.contact.id === reviewed.contact.id && !command.uncertain ? <div className="kay-inline-conflict"><p>Version actuelle {current.data.version} : <strong className="whitespace-pre-wrap">{field === "rating" ? ratingLabels[current.data.rating] : field === "campaign_source" ? campaignLabels[current.data.campaign_source] : current.data[field] || "Non renseigné"}</strong></p><p>Les autres champs seront conservés depuis cette version.</p>{!current.data.archived_at && !current.data.contact.archived_at && current.data.status !== "converted" ? <div className="flex flex-wrap gap-2"><Button action="refresh" type="button" variant="outline" onClick={() => reload(false)}>Charger ce champ</Button><Button action="compare" type="button" variant="outline" onClick={() => reload(true)}>Conserver ma saisie</Button></div> : <p>Ce prospect est désormais en lecture seule.</p>}</div> : null}
    {field === "message" && !values.message ? <p className="text-xs text-muted-foreground">Le message peut rester vide ; sa provenance est conservée.</p> : null}
  </InlineFieldForm>;
}
