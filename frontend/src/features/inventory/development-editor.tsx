"use client";
import { DevelopmentIcon } from "@/components/icons";
import { SectionHeading } from "@/components/shared/section-heading";
import { useDossierDraft } from "@/components/shared/dossier-form";
import { RecordEntry } from "@/components/shared/record-entry";
import { RecordSection } from "@/components/shared/record-workspace";
import { useUnsavedGuard } from "@/components/shared/unsaved-guard";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { StaffRole } from "@/features/contacts/contracts";
import { ContactSelector } from "@/features/contacts/contact-selector";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { RecordError } from "@/features/contacts/record-states";
import { categoryLabels } from "./contracts";
import { developmentFieldsSchema, developmentSchema, developmentPhaseLabels, programmePhaseLabel, type Development } from "./development-contracts";
import { InventoryError } from "./states";
import { useInventoryRecordCommand } from "./use-record-command";
import type { InventoryRecord } from "./record-scope";
import { InventoryDraftSummary } from "./inventory-draft-summary";
import { DevelopmentCreationWizard } from "./development-creation-wizard";

type Values = { phase: "" | keyof typeof developmentPhaseLabels; reference: string; name: string; category: Development["category"]; location: string; briefing_text: string; developer_marketing_display: string };
function currentValues(development: Development): Values {
  return { phase: development.phase ?? "", reference: development.reference, name: development.name, category: development.category, location: development.location ?? "", briefing_text: development.briefing_text ?? "", developer_marketing_display: development.developer.marketing_display ?? "" };
}
function draftValues(values: Partial<Values>, developerId?: string | null, phaseSupported = true) {
  return { reference: values.reference?.trim() ?? "", name: values.name?.trim() ?? "", category: values.category ?? "mixed", phase: phaseSupported ? values.phase ?? "" : "", location: values.location?.trim() ?? "", briefing_text: values.briefing_text?.trim() ?? "", developer_marketing_display: values.developer_marketing_display?.trim() ?? "", developerId };
}
export function DevelopmentEditor({ development, actorId, role, cancel, onSaved }: { development?: Development; actorId?: string; role?: StaffRole; cancel?: () => void; onSaved?: (record: InventoryRecord) => void }) {
  return development ? <DevelopmentEditForm development={development} cancel={cancel} onSaved={onSaved} /> : <DevelopmentCreationWizard key={`${actorId ?? ""}:${role ?? ""}`} actorId={actorId} role={role} />;
}
function DevelopmentEditForm({ development, cancel, onSaved }: { development: Development; cancel?: () => void; onSaved?: (record: InventoryRecord) => void }) {
  const router = useRouter(); const hydrated = useHydrated(); const command = useInventoryRecordCommand({ kind: "development-facts", root: "developments", id: development.id, version: development.version });
  const guard = useUnsavedGuard(), scope = useRef<HTMLFormElement>(null), alive = useRef(true), lock = useRef(false), reading = useRef<AbortController | null>(null), reported = useRef(false);
  const [version, setVersion] = useState(development?.version ?? 1);
  const [current, setCurrent] = useState(development), [comparison, setComparison] = useState<Development>(), [readBusy, setReadBusy] = useState(false), [readError, setReadError] = useState<ApiError>(), [denied, setDenied] = useState<ApiError>();
  const [developer, setDeveloper] = useState(development?.developer.contact ?? null);
  const [developerChanged, setDeveloperChanged] = useState(false);
  const [notice, setNotice] = useState("");
  const form = useForm<Values>({ defaultValues: currentValues(development) });
  const draft = useWatch({ control: form.control });
  const busy = command.pending || readBusy, blocked = Boolean(current.archived_at || comparison?.archived_at), changes = useDossierDraft(draftValues(draft, developerChanged ? developer?.id ?? null : current.developer.contact?.id, current.phase_supported === true), command.protected || readBusy);
  const displayedDeveloper = developerChanged ? developer : (development.version >= current.version ? development : current).developer.contact;
  useEffect(() => { alive.current = true; return () => { alive.current = false; reading.current?.abort(); }; }, []);
  function failure(error: ApiError) { if ([401, 403, 404].includes(error.status)) { command.deny(error); setDenied(error); changes.accept(); setComparison(undefined); } }
  function field(name: keyof Values) { const registered = form.register(name); return { ...registered, onChange: (event: Parameters<typeof registered.onChange>[0]) => { if (!lock.current && command.canEdit() && !comparison && !blocked) return registered.onChange(event); } }; }
  async function compare() {
    if (!hydrated || lock.current || command.locked()) return;
    lock.current = true; setReadBusy(true); setReadError(undefined); reading.current?.abort(); const abort = new AbortController(); reading.current = abort;
    try { const value = await command.inspect(signal => apiGet(`/api/v1/developments/${development.id}`, developmentSchema, signal), abort.signal); if (alive.current && !abort.signal.aborted) setComparison(value); }
    catch (reason) { if (alive.current && !abort.signal.aborted) { const error = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503); setReadError(error); failure(error); } }
    finally { if (alive.current) { lock.current = false; setReadBusy(false); } }
  }
  function adopt(keep: boolean) {
    if (!comparison || comparison.archived_at || !command.accept(comparison)) return;
    const values = currentValues(comparison); setVersion(comparison.version); setCurrent(comparison);
    if (!keep) { form.reset(values); setDeveloperChanged(false); setDeveloper(comparison.developer.contact); form.clearErrors(); setNotice(""); }
    else if (!developerChanged) setDeveloper(comparison.developer.contact);
    changes.accept(draftValues(values, comparison.developer.contact?.id, comparison.phase_supported === true)); setComparison(undefined); setReadError(undefined);
  }
  async function save(values: Values) {
    if (!hydrated || lock.current || command.pending) return;
    if (command.uncertain) { lock.current = true; try { const error = await command.retry(); if (error && alive.current) failure(error); } finally { lock.current = false; } return; }
    if (!command.canEdit() || comparison || blocked || denied) return;
    form.clearErrors();
    const { phase, ...shared } = values;
    const parsed = developmentFieldsSchema.safeParse({ ...shared, ...(current.phase_supported ? { phase: phase || null } : {}), location: values.location.trim() || null, briefing_text: values.briefing_text.trim() || null, developer_contact_id: developer?.id ?? null, developer_marketing_display: values.developer_marketing_display.trim() || null });
    if (!parsed.success) { setNotice("Vérifiez les champs : référence et nom obligatoires, présentation de 10 000 caractères maximum."); const fields = parsed.error.issues.map(issue => issue.path[0]).filter((key): key is keyof Values => typeof key === "string" && ["reference", "name", "category", "phase", "location", "briefing_text", "developer_marketing_display"].includes(key)); fields.forEach(key => form.setError(key, { type: "validate" })); form.setFocus(fields[0] ?? "reference"); return; }
    const { developer_contact_id, ...fields } = parsed.data;
    setNotice(""); lock.current = true; reported.current = false;
    try { const error = await command.submit(`/api/v1/developments/${development.id}`, { ...fields, ...(developerChanged ? { developer_contact_id } : {}), expected_version: version }, "PATCH", (record, signal) => { if (!alive.current || signal.aborted || reported.current) return; if (!onSaved) router.push(`/projects/${record.id}`); if (alive.current && !signal.aborted) { reported.current = true; changes.accept(); onSaved?.(record); } }); if (error && alive.current) failure(error); }
    finally { lock.current = false; }
  }
  if (denied) return <RecordError error={denied} />;
  return <>{guard.dialog}<form ref={scope} data-draft-managed data-live-dirty={changes.dirty ? "true" : undefined} data-write-recovery={command.uncertain ? "true" : undefined} className="kay-development-edit grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(19rem,1fr)]" noValidate aria-label="Modifier le programme" aria-busy={busy || command.uncertain} onSubmit={event => void form.handleSubmit(save)(event)}>
    <div className="form-surface grid min-w-0 gap-5">
    <SectionHeading icon={DevelopmentIcon}>Identité du programme</SectionHeading>
    <p className="text-sm text-muted-foreground">Un brouillon peut rester incomplet. La présentation est partagée avec toute l’équipe et ne remplace pas les propriétaires légaux.</p>
    {command.needsReview || readError ? <div className="grid gap-3">{readError ? <RecordError error={readError} /> : <p role="status">Le programme a changé. Comparez la version actuelle avant de conserver votre saisie.</p>}<Button action="compare" type="button" variant="outline" className="justify-self-start" disabled={busy || command.uncertain} onClick={() => void compare()}>Comparer la version actuelle</Button></div> : null}
    {comparison ? <RecordSection title={`Version actuelle ${comparison.version}`} description="Votre saisie est conservée. Comparez le programme avant de réessayer."><RecordEntry icon={DevelopmentIcon} title={comparison.name} meta={[{ label: "Référence", value: comparison.reference }, { label: "Catégorie", value: comparison.category === "mixed" ? "Mixte" : categoryLabels[comparison.category] }, ...(comparison.phase_supported ? [{ label: "État du programme", value: programmePhaseLabel(comparison.phase ?? null) }] : []), { label: "Localisation", value: comparison.location }, { label: "Libellé public du promoteur", value: comparison.developer.marketing_display }, { label: "Contact promoteur", value: comparison.developer.contact?.name ?? "Non renseigné ou protégé" }]} /><p className="whitespace-pre-wrap wrap-anywhere">{comparison.briefing_text ?? "Aucune présentation renseignée."}</p>{blocked ? <p role="status">Ce programme est archivé. Revenez à sa fiche pour consulter son état actuel.</p> : <div className="flex flex-wrap gap-2"><Button action="retry" type="button" variant="outline" disabled={busy} onClick={() => guard.request(() => adopt(false), scope.current ?? undefined)}>Recharger le programme</Button><Button action="compare" type="button" variant="outline" disabled={busy} onClick={() => adopt(true)}>Conserver ma saisie sur cette version</Button></div>}</RecordSection> : null}
    <fieldset disabled={!hydrated || busy || blocked || Boolean(comparison) || !command.canEdit()} className="grid min-w-0 gap-4 sm:grid-cols-2">
      <div className="grid gap-2"><Label htmlFor="development-reference">Référence du programme</Label><Input id="development-reference" maxLength={80} required aria-invalid={Boolean(form.formState.errors.reference)} aria-describedby={form.formState.errors.reference ? "development-validation" : undefined} {...field("reference")} /></div>
      <div className="grid gap-2"><Label htmlFor="development-name">Nom du programme</Label><Input id="development-name" maxLength={160} required aria-invalid={Boolean(form.formState.errors.name)} aria-describedby={form.formState.errors.name ? "development-validation" : undefined} {...field("name")} /></div>
      {current.phase_supported ? <div className="grid gap-2"><Label htmlFor="development-phase">État du programme</Label><NativeSelect id="development-phase" aria-invalid={Boolean(form.formState.errors.phase)} aria-describedby={form.formState.errors.phase ? "development-validation" : undefined} {...field("phase")}><option value="">À renseigner</option>{Object.entries(developmentPhaseLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div> : null}
      <div className="grid gap-2"><Label htmlFor="development-category">Catégorie du programme</Label><NativeSelect id="development-category" {...field("category")}><option value="mixed">Mixte</option>{Object.entries(categoryLabels).filter(([value]) => ["villa", "house", "apartment", "land", "commercial"].includes(value)).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div>
      <div className="grid gap-2 sm:col-span-2"><Label htmlFor="development-location">Localisation du programme (facultative)</Label><Input id="development-location" maxLength={500} aria-invalid={Boolean(form.formState.errors.location)} aria-describedby={form.formState.errors.location ? "development-validation" : undefined} {...field("location")} /></div>
      <div className="grid gap-2 sm:col-span-2"><Label htmlFor="development-briefing">Présentation partagée (facultative)</Label><Textarea id="development-briefing" rows={5} aria-invalid={Boolean(form.formState.errors.briefing_text)} aria-describedby="briefing-help development-validation" {...field("briefing_text")} /><p id="briefing-help" className="text-sm text-muted-foreground">Texte simple, 10 000 caractères maximum. Aucune coordonnée, note ou pièce privée. Laissez vide pour effacer la présentation.</p></div>
      <div className="grid min-w-0 gap-4 sm:col-span-2"><h2 className="font-medium">Promoteur (facultatif)</h2>{displayedDeveloper ? <><p className="wrap-anywhere">Contact protégé : {displayedDeveloper.name}</p><Button action="release" type="button" variant="outline" className="justify-self-start" onClick={() => { if (lock.current || !command.canEdit() || comparison || blocked) return; setDeveloper(null); setDeveloperChanged(true); }}>Dissocier le promoteur</Button></> : <ContactSelector denied={failure} choose={contact => { if (lock.current || !command.canEdit() || comparison || blocked) return; setDeveloper(contact); setDeveloperChanged(true); }} />}<Label htmlFor="developer-display">Libellé commercial du promoteur (facultatif)</Label><Input id="developer-display" maxLength={160} aria-invalid={Boolean(form.formState.errors.developer_marketing_display)} aria-describedby={form.formState.errors.developer_marketing_display ? "development-validation" : undefined} {...field("developer_marketing_display")} /><p className="text-sm text-muted-foreground">Le nom privé n’est jamais copié automatiquement dans ce libellé partagé. Le promoteur n’est pas automatiquement propriétaire.</p></div>
    </fieldset>
    <p id="development-validation" role={notice ? "alert" : undefined} className="text-danger">{notice}</p>
    <InventoryError level="development" error={command.error} />
    {command.uncertain ? <p role="status">{command.acknowledged ? "La modification est enregistrée. Actualisez son résultat sans l’enregistrer à nouveau." : "La réponse est interrompue. Réessayez la même opération pour retrouver son résultat."}</p> : null}
    <div className="kay-inventory-form-actions flex flex-wrap gap-2 border-t pt-4"><Button action="save" type="submit" disabled={!hydrated || busy || !command.uncertain && (blocked || Boolean(comparison) || !command.canEdit())}>{command.pending ? "Enregistrement…" : command.uncertain ? command.acknowledged ? "Actualiser le résultat" : "Réessayer la même opération" : "Enregistrer le programme"}</Button>{cancel ? <Button action="cancel" type="button" variant="outline" disabled={busy || command.uncertain} onClick={() => { if (!lock.current && !command.locked()) cancel(); }}>Annuler</Button> : <Button action="cancel" variant="outline" disabled={busy || command.uncertain} asChild><Link href={`/projects/${development.id}`} aria-disabled={busy || command.uncertain} tabIndex={busy || command.uncertain ? -1 : undefined} onClick={event => { if (lock.current || command.locked()) event.preventDefault(); }}>Annuler</Link></Button>}</div>
    </div>
    <InventoryDraftSummary icon={DevelopmentIcon} title="Programme en préparation" facts={[
      { label: "Référence", value: draft.reference?.trim() },
      { label: "Nom", value: draft.name?.trim() },
      ...(current.phase_supported ? [{ label: "État du programme", value: programmePhaseLabel(draft.phase || null) }] : []),
      { label: "Catégorie", value: !draft.category || draft.category === "mixed" ? "Mixte" : categoryLabels[draft.category] },
      { label: "Localisation", value: draft.location?.trim() },
      { label: "Promoteur affiché", value: draft.developer_marketing_display?.trim() },
      { label: "Présentation", value: draft.briefing_text?.trim() ? "Renseignée" : null },
    ]} next="Après l’enregistrement, vous pourrez structurer les blocs, étages et unités physiques, puis définir les offres du programme entier séparément de celles des unités." />
  </form></>;
}
