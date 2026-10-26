"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { KayIconComponent } from "@/components/icons";
import { InlineFieldForm, InlineFieldLoading, InlineRecordField, type InlineEditorControls } from "@/components/shared/inline-record-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { BudgetInput } from "@/features/contacts/qualification-inputs";
import { campaignLabels, purchaseReasonLabels, qualificationMetadataSchema, ratingLabels, type QualificationMetadata } from "@/features/contacts/qualification-contracts";
import { RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import type { ApiError } from "@/lib/api/client";
import { paymentLabels } from "./qualification-contracts";
import { editDealSchema, ordinaryStages, type Deal } from "./contracts";
import { ProjectPicker, type ProjectSelection } from "./project-picker";
import type { MutateDeal } from "./pipeline";

export type DealField = "initial_budget" | "rating" | "campaign_source" | "purchase_reasons" | "payment_method" | "number_of_rooms" | "projects" | "notes" | "next_action";
export function dealInlineValues(deal: Deal) {
  return { initial_budget: deal.initial_budget ?? "", rating: deal.rating, campaign_source: deal.campaign_source, purchase_reasons: deal.purchase_reasons, payment_method: deal.payment_method, number_of_rooms: deal.number_of_rooms, notes: deal.notes, next_action: deal.next_action, requirement_id: deal.requirement_id, offering_id: deal.offering?.id ?? null, expected_offering_version: deal.offering?.version ?? null };
}
export function dealProjectValues(deal: Deal): { id: string; selected?: ProjectSelection }[] {
  return deal.projects.length ? deal.projects.map(project => ({ id: String(project.position), selected: { label: project.name, choice: project.development_id ? { development_id: project.development_id } : project.property_id ? { property_id: project.property_id } : { external_name: project.external_name } } })) : [{ id: "1" }];
}
type Props = { deal: Deal; field: DealField; label: string; icon: KayIconComponent; display: ReactNode; writable: boolean; busy: boolean; mutate: MutateDeal; error?: ApiError; denied?: (error: ApiError) => void };
export function DealInlineField(props: Props) {
  const writable = props.writable && !props.deal.archived_at && !props.deal.contact.archived_at && [...ordinaryStages, "reserved"].includes(props.deal.stage);
  return <InlineRecordField label={props.label} icon={props.icon} display={props.display} writable={writable} disabled={props.busy} editor={controls => <DealFieldMetadata {...props} controls={controls} />} />;
}
function DealFieldMetadata(props: Props & { controls: InlineEditorControls }) {
  const { denied } = props;
  const query = useQuery("/api/v1/contacts/metadata", qualificationMetadataSchema);
  useEffect(() => { if (query.error && ["FORBIDDEN", "NOT_FOUND", "UNAUTHENTICATED", "PASSWORD_CHANGE_REQUIRED"].includes(query.error.code)) denied?.(query.error); }, [query.error, denied]);
  if (query.error) return <><RecordError error={query.error} retry={query.refresh} /><Button autoFocus action="cancel" variant="quiet" onClick={props.controls.cancel}>Annuler</Button></>;
  return query.value ? <DealFieldEditor {...props} metadata={query.value} /> : <InlineFieldLoading cancel={props.controls.cancel} />;
}
export function DealFieldEditor({ deal, field, label, controls, metadata, mutate, busy, error, writable }: Props & { controls: InlineEditorControls; metadata: QualificationMetadata }) {
  const [reviewed] = useState(deal), [values, setValues] = useState(() => dealInlineValues(deal)), [projects, setProjects] = useState(() => dealProjectValues(deal));
  const [invalid, setInvalid] = useState(""), [attempted, setAttempted] = useState(false), [saving, setSaving] = useState(false);
  const id = useId(), lock = useRef(false);
  const editingProjects = field === "projects" || !reviewed.projects.length;
  const editingReasons = field === "purchase_reasons" || !reviewed.purchase_reasons.length;
  const editingBudget = field === "initial_budget" || !reviewed.initial_budget;
  const dirty = JSON.stringify(values) !== JSON.stringify(dealInlineValues(reviewed)) || JSON.stringify(projects) !== JSON.stringify(dealProjectValues(reviewed));
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (lock.current || busy || !writable || deal.id !== reviewed.id) return;
    const parsed = editDealSchema.safeParse({ ...values, projects: projects.map(project => project.selected?.choice), expected_version: reviewed.version });
    if (!parsed.success) { setInvalid("Vérifiez le budget, les motifs d’achat et les projets. Le bouton Modifier permet de revoir toute la qualification."); return; }
    lock.current = true; setSaving(true); setInvalid(""); setAttempted(true);
    try { if (await mutate(`/api/v1/deals/${reviewed.id}`, parsed.data, "PATCH")) controls.saved(); }
    finally { lock.current = false; setSaving(false); }
  }
  return <InlineFieldForm label={label} busy={busy || saving} disabled={!writable || deal.id !== reviewed.id} dirty={dirty} submit={event => void submit(event)} cancel={controls.cancel}>
    {field === "notes" || field === "next_action" ? <><Label htmlFor={id} className="sr-only">{label}</Label><Textarea id={id} rows={3} maxLength={field === "notes" ? 4000 : 1000} value={values[field]} onChange={event => setValues(previous => ({ ...previous, [field]: event.target.value }))} /></> : null}
    {field === "rating" ? <><Label htmlFor={id} className="sr-only">{label}</Label><NativeSelect id={id} value={values.rating} onChange={event => setValues(previous => ({ ...previous, rating: event.target.value as typeof values.rating }))}>{Object.entries(ratingLabels).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</NativeSelect></> : null}
    {field === "campaign_source" ? <><Label htmlFor={id} className="sr-only">{label}</Label><NativeSelect id={id} value={values.campaign_source} onChange={event => setValues(previous => ({ ...previous, campaign_source: event.target.value as typeof values.campaign_source }))}>{Object.entries(campaignLabels).map(([value, text]) => <option key={value} value={value}>{metadata.campaign_sources.find(option => option.value === value)?.label ?? text}</option>)}</NativeSelect></> : null}
    {field === "payment_method" ? <><Label htmlFor={id} className="sr-only">{label}</Label><NativeSelect id={id} value={values.payment_method ?? ""} onChange={event => setValues(previous => ({ ...previous, payment_method: event.target.value || null }))}><option value="">Non renseigné</option>{values.payment_method && !Object.hasOwn(paymentLabels, values.payment_method) ? <option value={values.payment_method}>{values.payment_method}</option> : null}{Object.entries(paymentLabels).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</NativeSelect></> : null}
    {field === "number_of_rooms" ? <><Label htmlFor={id} className="sr-only">{label}</Label><Input id={id} type="number" min={0} max={50} step={1} value={values.number_of_rooms ?? ""} onChange={event => setValues(previous => ({ ...previous, number_of_rooms: event.target.value === "" ? null : Number(event.target.value) }))} /></> : null}
    {editingBudget ? <div className="grid gap-2"><Label htmlFor={id + "-budget"}>{field === "initial_budget" ? label : "Budget à qualifier"}</Label><BudgetInput id={id + "-budget"} value={values.initial_budget} metadata={metadata} onChange={initial_budget => setValues(previous => ({ ...previous, initial_budget }))} /></div> : null}
    {editingReasons ? <fieldset className="grid gap-2"><legend className="mb-2 text-sm font-medium">Motifs d’achat</legend>{Object.entries(purchaseReasonLabels).map(([value, text]) => <Label key={value} className="flex min-h-control items-center gap-2"><Checkbox checked={values.purchase_reasons.includes(value as typeof values.purchase_reasons[number])} onCheckedChange={checked => setValues(previous => ({ ...previous, purchase_reasons: checked ? [...previous.purchase_reasons, value as typeof values.purchase_reasons[number]] : previous.purchase_reasons.filter(reason => reason !== value) }))} />{text}</Label>)}</fieldset> : null}
    {editingProjects ? <div className="grid gap-4">{projects.map((project, index) => <div key={project.id} className="kay-inline-project"><ProjectPicker selected={project.selected} choose={selected => setProjects(previous => previous.map(row => row.id === project.id ? { ...row, selected } : row))} />{projects.length > 1 ? <Button action="remove" type="button" variant="quiet" onClick={() => setProjects(previous => previous.filter(row => row.id !== project.id))}>Retirer le projet {index + 1}</Button> : null}</div>)}{projects.length < 3 ? <Button action="add" type="button" variant="quiet" onClick={() => setProjects(previous => [...previous, { id: crypto.randomUUID() }])}>Ajouter un projet</Button> : null}</div> : null}
    {invalid ? <p role="alert" className="kay-inline-error">{invalid}</p> : null}{attempted && error ? <RecordError error={error} /> : null}
    {attempted && error?.code === "VERSION_CONFLICT" ? <p className="text-sm text-muted-foreground">Votre saisie reste ici. Comparez la version actuelle dans le message du dossier avant de reprendre.</p> : null}
  </InlineFieldForm>;
}
