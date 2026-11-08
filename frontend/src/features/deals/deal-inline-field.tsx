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
import type { DealCommandRecovery } from "./deal-command-intent";

export type DealField = "initial_budget" | "rating" | "campaign_source" | "purchase_reasons" | "payment_method" | "number_of_rooms" | "projects" | "notes" | "next_action";
export function dealInlineValues(deal: Deal) {
  return { initial_budget: deal.initial_budget ?? "", rating: deal.rating, campaign_source: deal.campaign_source, purchase_reasons: deal.purchase_reasons, payment_method: deal.payment_method, number_of_rooms: deal.number_of_rooms, notes: deal.notes, next_action: deal.next_action, requirement_id: deal.requirement_id, offering_id: deal.offering?.id ?? null, expected_offering_version: deal.offering?.version ?? null };
}
export function dealProjectValues(deal: Deal): { id: string; selected?: ProjectSelection }[] {
  return deal.projects.length ? deal.projects.map(project => ({ id: String(project.position), selected: { label: project.name, choice: project.development_id ? { development_id: project.development_id } : project.property_id ? { property_id: project.property_id } : { external_name: project.external_name } } })) : [{ id: "1" }];
}
type Props = { deal: Deal; field: DealField; label: string; icon: KayIconComponent; display: ReactNode; writable: boolean; busy: boolean; mutate: MutateDeal; recovery?: DealCommandRecovery; error?: ApiError; denied?: (error: ApiError) => void };
export function DealInlineField(props: Props) {
  const writable = props.writable && !props.deal.archived_at && !props.deal.contact.archived_at && [...ordinaryStages, "reserved"].includes(props.deal.stage);
  return <InlineRecordField label={props.label} icon={props.icon} display={props.display} writable={writable} disabled={props.busy || props.recovery?.protected} canOpen={() => !props.busy && (!props.recovery || props.recovery.canEdit())} editor={controls => <DealFieldMetadata {...props} controls={controls} />} />;
}
function DealFieldMetadata(props: Props & { controls: InlineEditorControls }) {
  const { denied } = props;
  const query = useQuery("/api/v1/contacts/metadata", qualificationMetadataSchema);
  const [loaded, setLoaded] = useState<QualificationMetadata>();
  if (query.value && loaded !== query.value) setLoaded(query.value);
  const failure = query.error && [401, 403, 404].includes(query.error.status) ? query.error : undefined;
  useEffect(() => { if (failure) denied?.(failure); }, [failure, denied]);
  if (failure) return <RecordError error={failure} />;
  const metadata = query.value ?? loaded;
  return metadata ? <>{query.error ? <RecordError error={query.error} retry={query.refresh} /> : null}<DealFieldEditor key={props.deal.id + ":" + props.field} {...props} metadata={metadata} unavailable={Boolean(query.error || !query.value)} /></> : query.error ? <><RecordError error={query.error} retry={query.refresh} /><Button autoFocus action="cancel" variant="quiet" onClick={props.controls.cancel}>Annuler</Button></> : <InlineFieldLoading cancel={props.controls.cancel} />;
}
export function DealFieldEditor({ deal, field, label, controls, metadata, mutate, busy, error, writable, recovery, denied, unavailable = false }: Props & { controls: InlineEditorControls; metadata: QualificationMetadata; unavailable?: boolean }) {
  const [reviewed, setReviewed] = useState(deal), [values, setValues] = useState(() => dealInlineValues(deal)), [projects, setProjects] = useState(() => dealProjectValues(deal));
  const [invalid, setInvalid] = useState(""), [attempted, setAttempted] = useState(false), [saving, setSaving] = useState(false);
  const [readonly, setReadonly] = useState(false);
  const [comparison, setComparison] = useState<Deal>();
  const id = useId(), lock = useRef(false), alive = useRef(true);
  const reported = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  function finish() { if (alive.current && !reported.current) { reported.current = true; controls.saved(); } }
  const editingProjects = field === "projects" || !reviewed.projects.length;
  const editingReasons = field === "purchase_reasons" || !reviewed.purchase_reasons.length;
  const editingBudget = field === "initial_budget" || !reviewed.initial_budget;
  const editingPayment = field === "payment_method" || Boolean(values.payment_method && !Object.hasOwn(paymentLabels, values.payment_method));
  const paymentId = field === "payment_method" ? id : id + "-payment";
  const dirty = JSON.stringify(values) !== JSON.stringify(dealInlineValues(reviewed)) || JSON.stringify(projects) !== JSON.stringify(dealProjectValues(reviewed));
  const canChange = () => alive.current && !lock.current && !busy && !unavailable && writable && !readonly && deal.id === reviewed.id && deal.contact.id === reviewed.contact.id && (!recovery || recovery.canEdit());
  function change(patch: Partial<typeof values>) { if (canChange()) { setValues(previous => ({ ...previous, ...patch })); setInvalid(""); } }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (lock.current || busy) return;
    if (recovery?.uncertain) { lock.current = true; setSaving(true); try { if (await recovery.retry() && alive.current) finish(); } finally { lock.current = false; if (alive.current) setSaving(false); } return; }
    if (!canChange()) return;
    const parsed = editDealSchema.safeParse({ ...values, projects: projects.map(project => project.selected?.choice), expected_version: reviewed.version });
    if (!parsed.success) { setInvalid("Vérifiez le budget, les motifs d’achat et les projets. Le bouton Modifier permet de revoir toute la qualification."); return; }
    lock.current = true; reported.current = false; setSaving(true); setInvalid(""); setAttempted(true);
    try { if (await mutate(`/api/v1/deals/${reviewed.id}`, parsed.data, "PATCH", { dealId: reviewed.id, completed: () => finish() }) && alive.current) finish(); }
    finally { lock.current = false; if (alive.current) setSaving(false); }
  }
  async function inspectCurrent() {
    if (!recovery || lock.current || recovery.locked()) return;
    lock.current = true; setSaving(true); setComparison(undefined);
    try { const current = await recovery.inspect(); if (alive.current && recovery.active()) setComparison(current); }
    catch { /* The owning command retains the read/authority error. */ }
    finally { lock.current = false; if (alive.current) setSaving(false); }
  }
  function rebase(keep: boolean) {
    if (!recovery || lock.current || recovery.locked()) return;
    const current = comparison;
    if (current && alive.current && recovery.active()) {
      if (current.contact.id !== reviewed.contact.id || current.archived_at || current.contact.archived_at || ![...ordinaryStages, "reserved"].includes(current.stage)) { setReadonly(true); recovery.accept(current); return; }
      if (!recovery.accept(current)) { setComparison(undefined); setInvalid("Comparez de nouveau la version actuelle avant de reprendre."); return; }
      const next = { ...dealInlineValues(current), ...(keep && field !== "projects" ? { [field]: values[field] } : {}) };
      if (keep && !current.initial_budget && !reviewed.initial_budget) next.initial_budget = values.initial_budget;
      if (keep && !current.purchase_reasons.length && !reviewed.purchase_reasons.length) next.purchase_reasons = values.purchase_reasons;
      setValues(next); setProjects(keep && (field === "projects" || !current.projects.length && !reviewed.projects.length) ? projects : dealProjectValues(current)); setReviewed(current); setInvalid(""); setAttempted(false); setComparison(undefined);
    }
  }
  if (readonly) return <div className="grid gap-2"><p role="status">Ce dossier a changé. Fermez ce champ pour consulter la fiche actualisée.</p><Button action="cancel" type="button" variant="quiet" onClick={controls.cancel}>Fermer</Button></div>;
  const comparisonValue = comparison ? field === "projects" ? comparison.projects.map(project => project.name).join(" · ") : field === "purchase_reasons" ? comparison.purchase_reasons.map(reason => purchaseReasonLabels[reason]).join(", ") : String(comparison[field] ?? "Non renseigné") : "";
  const review = recovery?.needsReview ? <div className="kay-inline-conflict">{comparison ? <><p>Version actuelle {comparison.version} : <strong className="whitespace-pre-wrap">{comparisonValue}</strong></p><p>Les autres champs seront conservés depuis cette version.</p><div className="flex flex-wrap gap-2"><Button action="refresh" type="button" variant="outline" disabled={busy || saving} onClick={() => rebase(false)}>Charger ce champ</Button><Button action="compare" type="button" variant="outline" disabled={busy || saving} onClick={() => rebase(true)}>Conserver ma saisie</Button></div></> : <Button action="compare" type="button" variant="outline" disabled={busy || saving} onClick={() => void inspectCurrent()}>Comparer le champ actuel</Button>}</div> : undefined;
  return <InlineFieldForm label={label} busy={busy || saving} recovering={Boolean(recovery?.uncertain)} reviewRequired={Boolean(recovery?.needsReview)} review={review} disabled={!recovery?.uncertain && (!writable || unavailable || deal.id !== reviewed.id || deal.contact.id !== reviewed.contact.id)} dirty={dirty} submit={event => void submit(event)} cancel={() => { if (!lock.current && !recovery?.locked()) controls.cancel(); }}>
    {field === "notes" || field === "next_action" ? <><Label htmlFor={id} className="sr-only">{label}</Label><Textarea id={id} rows={3} maxLength={field === "notes" ? 4000 : 1000} value={values[field]} onChange={event => change({ [field]: event.target.value })} /></> : null}
    {field === "rating" ? <><Label htmlFor={id} className="sr-only">{label}</Label><NativeSelect id={id} value={values.rating} onChange={event => change({ rating: event.target.value as typeof values.rating })}>{Object.entries(ratingLabels).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</NativeSelect></> : null}
    {field === "campaign_source" ? <><Label htmlFor={id} className="sr-only">{label}</Label><NativeSelect id={id} value={values.campaign_source} onChange={event => change({ campaign_source: event.target.value as typeof values.campaign_source })}>{Object.entries(campaignLabels).map(([value, text]) => <option key={value} value={value}>{metadata.campaign_sources.find(option => option.value === value)?.label ?? text}</option>)}</NativeSelect></> : null}
    {editingPayment ? <><Label htmlFor={paymentId} className={field === "payment_method" ? "sr-only" : "text-sm"}>{field === "payment_method" ? label : "Financement à vérifier"}</Label><NativeSelect id={paymentId} value={values.payment_method ?? ""} onChange={event => change({ payment_method: event.target.value || null })}><option value="">Non renseigné</option>{values.payment_method && !Object.hasOwn(paymentLabels, values.payment_method) ? <option value={values.payment_method}>{values.payment_method}</option> : null}{Object.entries(paymentLabels).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</NativeSelect></> : null}
    {field === "number_of_rooms" ? <><Label htmlFor={id} className="sr-only">{label}</Label><Input id={id} type="number" min={0} max={50} step={1} value={values.number_of_rooms ?? ""} onChange={event => change({ number_of_rooms: event.target.value === "" ? null : Number(event.target.value) })} /></> : null}
    {editingBudget ? <div className="grid gap-2"><Label htmlFor={id + "-budget"}>{field === "initial_budget" ? label : "Budget à qualifier"}</Label><BudgetInput id={id + "-budget"} value={values.initial_budget} metadata={metadata} onChange={initial_budget => change({ initial_budget })} /></div> : null}
    {editingReasons ? <fieldset className="grid gap-2"><legend className="mb-2 text-sm font-medium">Motifs d’achat</legend>{Object.entries(purchaseReasonLabels).map(([value, text]) => <Label key={value} className="flex min-h-control items-center gap-2"><Checkbox checked={values.purchase_reasons.includes(value as typeof values.purchase_reasons[number])} onCheckedChange={checked => change({ purchase_reasons: checked ? [...new Set([...values.purchase_reasons, value as typeof values.purchase_reasons[number]])] : values.purchase_reasons.filter(reason => reason !== value) })} />{text}</Label>)}</fieldset> : null}
    {editingProjects ? <div className="grid gap-4">{projects.map((project, index) => <div key={project.id} className="kay-inline-project"><ProjectPicker selected={project.selected} choose={selected => { if (canChange()) setProjects(previous => previous.map(row => row.id === project.id ? { ...row, selected } : row)); }} denied={denied} />{projects.length > 1 ? <Button action="remove" type="button" variant="quiet" onClick={() => { if (canChange()) setProjects(previous => previous.filter(row => row.id !== project.id)); }}>Retirer le projet {index + 1}</Button> : null}</div>)}{projects.length < 3 ? <Button action="add" type="button" variant="quiet" onClick={() => { if (canChange()) setProjects(previous => [...previous, { id: crypto.randomUUID() }]); }}>Ajouter un projet</Button> : null}</div> : null}
    {invalid ? <p role="alert" className="kay-inline-error">{invalid}</p> : null}{attempted && error ? <RecordError error={error} /> : null}
    {recovery?.uncertain ? <p role="status">{recovery.acknowledged ? "La modification est enregistrée. Actualisez son résultat sans l’enregistrer à nouveau." : "La réponse est interrompue. Réessayez la même modification pour retrouver son résultat."}</p> : null}
  </InlineFieldForm>;
}
