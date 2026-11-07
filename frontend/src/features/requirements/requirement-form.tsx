"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useDossierDraft } from "@/components/shared/dossier-form";
import { RecordSection } from "@/components/shared/record-workspace";
import { useUnsavedGuard } from "@/components/shared/unsaved-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { useHydrated } from "@/hooks/use-hydrated";
import { categoryLabels } from "@/features/inventory/contracts";
import { criterionKeys, criterionLabels, editRequirementSchema, fieldsSchema, importanceLabels, newRequirementSchema, type Requirement, type RequirementFields } from "./contracts";
import { compareRequirement, editableRequirement } from "./model";
import { RequirementFailure, useRequirementCommand, type RequirementDenied, type RequirementSaved } from "./use-requirement-command";

export function RequirementForm({ contactId, value, writable = true, saved, denied, cancel }: { contactId: string; value?: Requirement; writable?: boolean; saved: RequirementSaved; denied: RequirementDenied; cancel: () => void }) {
  const [fields, setFields] = useState(() => editableRequirement(value)), [source, setSource] = useState(value), [version, setVersion] = useState(value?.version), [invalid, setInvalid] = useState<Record<string, string>>({});
  const id = useId(), form = useRef<HTMLFormElement>(null), title = useRef<HTMLInputElement>(null), hydrated = useHydrated(), guard = useUnsavedGuard();
  const command = useRequirementCommand({ id: value?.id, writable, saved: onSaved, denied, compare: async signal => { const current = await compareRequirement(contactId, value?.id, signal); return { ...current, blocked: current.blocked ?? (current.value?.shortlist_count && current.value.intent !== fields.intent ? "Retirez les offres sélectionnées avant de changer le type de recherche." : undefined) }; } });
  const draft = useDossierDraft({ fields, recovery: command.uncertain }, command.busy);
  async function onSaved(result: { id: string; version: number }, signal: AbortSignal) { draft.accept({ fields, recovery: false }); await saved(result, signal); }
  useEffect(() => { title.current?.focus(); }, []);
  useEffect(() => { if (Object.keys(invalid).length) form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(); }, [invalid]);
  const disabled = !hydrated || !writable || command.busy || command.uncertain;
  function change<K extends keyof RequirementFields>(key: K, next: RequirementFields[K]) { if (disabled || command.locked()) return; setFields(current => ({ ...current, [key]: next })); setInvalid({}); }
  function criterion(index: number, key: "value" | "importance", next: RequirementFields["criteria"][number][typeof key]) { if (disabled || command.locked()) return; setFields(current => ({ ...current, criteria: current.criteria.map((item, position) => position === index ? { ...item, [key]: next } : item) })); setInvalid({}); }
  function error(key: string) { return invalid[key] ? `${id}-validation` : undefined; }
  return <form ref={form} className="kay-drawer-form" noValidate aria-label={value ? "Modifier la recherche" : "Nouvelle recherche"} data-draft-managed data-live-dirty={draft.dirty} data-write-recovery={command.uncertain} aria-busy={command.busy} onSubmit={event => {
    event.preventDefault(); if (disabled || command.locked()) return;
    const values = { ...fields, budget_min_mad: fields.budget_min_mad?.trim().replace(",", ".") ?? null, budget_max_mad: fields.budget_max_mad?.trim().replace(",", ".") ?? null, criteria: fields.criteria.map(item => ({ ...item, value: item.key === "area_sqm" && typeof item.value === "string" ? item.value.trim().replace(",", ".") : item.value })) };
    const checked = fieldsSchema.safeParse(values);
    const parsed = !checked.success ? checked : value ? editRequirementSchema.safeParse({ ...checked.data, expected_version: version }) : newRequirementSchema.safeParse({ ...checked.data, contact_id: contactId });
    if (!parsed.success) { setInvalid(Object.fromEntries(parsed.error.issues.map(issue => [issue.path.join("."), issue.message]))); return; }
    setInvalid({}); void command.save(value ? `/api/v1/requirements/${value.id}` : "/api/v1/requirements", parsed.data, value ? "PATCH" : "POST");
  }}>
    <fieldset disabled={disabled} className="grid min-w-0 gap-5 border-0 p-0"><legend className="sr-only">Besoin et critères de recherche</legend>
      <RecordSection title={value ? "Modifier la recherche" : "Nouvelle recherche"} description="Chaque recherche garde ses propres critères, choix et avis.">
        <div className="grid min-w-0 gap-2"><Label htmlFor={`${id}-title`}>Nom de la recherche</Label><Input ref={title} id={`${id}-title`} name="title" value={fields.title} maxLength={160} aria-required aria-invalid={Boolean(invalid.title)} aria-describedby={error("title")} onChange={event => change("title", event.target.value)} /></div>
        <div className="kay-form-pair"><div className="grid min-w-0 gap-2"><Label htmlFor={`${id}-intent`}>Type de recherche</Label><NativeSelect id={`${id}-intent`} name="intent" value={fields.intent} disabled={Boolean(source?.shortlist_count)} onChange={event => { const intent = event.target.value as RequirementFields["intent"]; change("intent", intent); change("budget_period", intent === "sale" ? null : "month"); }}><option value="sale">Achat</option><option value="rental">Location</option></NativeSelect></div>{fields.intent === "rental" ? <div className="grid min-w-0 gap-2"><Label htmlFor={`${id}-period`}>Période du budget</Label><NativeSelect id={`${id}-period`} name="budget_period" value={fields.budget_period ?? "month"} onChange={event => change("budget_period", event.target.value as "month" | "year")}><option value="month">Par mois</option><option value="year">Par an</option></NativeSelect></div> : null}</div>
        {source?.shortlist_count ? <p className="text-sm text-muted-foreground">Retirez les offres sélectionnées avant de changer le type de recherche.</p> : null}
        <div className="kay-form-pair">{(["budget_min_mad", "budget_max_mad"] as const).map(name => <div key={name} className="grid min-w-0 gap-2"><Label htmlFor={`${id}-${name}`}>{name === "budget_min_mad" ? "Budget minimum (MAD)" : "Budget maximum (MAD)"}</Label><Input id={`${id}-${name}`} name={name} inputMode="decimal" maxLength={19} value={fields[name] ?? ""} aria-invalid={Boolean(invalid[name])} aria-describedby={error(name)} onChange={event => change(name, event.target.value || null)} /></div>)}</div>
        <p className="text-sm text-muted-foreground">Vide signifie non renseigné, pas zéro. Les loyers gardent leur période d’origine ; leur comparaison annuelle utilise exactement douze mois.</p>
      </RecordSection>
      <RecordSection title="Critères obligatoires et souhaités" label="Critères de recherche">
        {criterionKeys.map((key, index) => { const item = fields.criteria[index], name = `criteria.${index}.value`; return <div key={key} className="kay-form-pair">
          <div className="grid min-w-0 gap-2"><Label htmlFor={`${id}-${key}`}>{criterionLabels[key]}</Label>{key === "parking" || key === "elevator" ? <NativeSelect id={`${id}-${key}`} name={name} value={item.value === null ? "unknown" : String(item.value)} onChange={event => criterion(index, "value", event.target.value === "unknown" ? null : event.target.value === "true")}><option value="unknown">Non renseigné</option><option value="true">Oui</option><option value="false">Non</option></NativeSelect> : key === "category" ? <NativeSelect id={`${id}-${key}`} name={name} value={String(item.value ?? "")} onChange={event => criterion(index, "value", event.target.value || null)}><option value="">Non renseignée</option>{Object.entries(categoryLabels).map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}</NativeSelect> : <Input id={`${id}-${key}`} name={name} value={String(item.value ?? "")} inputMode={key === "rooms" ? "numeric" : key === "area_sqm" ? "decimal" : "text"} maxLength={key === "location" ? 500 : 19} aria-invalid={Boolean(invalid[name])} aria-describedby={error(name)} onChange={event => criterion(index, "value", event.target.value === "" ? null : key === "rooms" && /^\d+$/.test(event.target.value) ? Number(event.target.value) : event.target.value)} />}</div>
          <div className="grid min-w-0 gap-2"><Label htmlFor={`${id}-${key}-importance`}>Importance : {criterionLabels[key]}</Label><NativeSelect id={`${id}-${key}-importance`} name={`criteria.${index}.importance`} value={item.importance} onChange={event => criterion(index, "importance", event.target.value as "required" | "preferred")}>{Object.entries(importanceLabels).map(([importance, label]) => <option key={importance} value={importance}>{label}</option>)}</NativeSelect></div>
        </div>; })}
      </RecordSection>
    </fieldset>
    {!writable ? <p role="status">Ce dossier est en lecture seule.</p> : null}
    {Object.keys(invalid).length ? <p id={`${id}-validation`} role="alert" className="text-sm text-danger">Vérifiez les champs indiqués, les montants positifs et l’ordre des budgets. Les pièces doivent former un entier positif ; une valeur vide reste inconnue.</p> : null}
    <RequirementFailure command={command} keep={current => { if (current.value) { setSource(current.value); setVersion(current.value.version); draft.accept({ fields: editableRequirement(current.value), recovery: false }); } }} reload={current => { if (!current.value) return; guard.request(() => { if (!current.value) return; const fields = editableRequirement(current.value); setFields(fields); setSource(current.value); setVersion(current.value.version); setInvalid({}); draft.accept({ fields, recovery: false }); command.clear(); title.current?.focus(); }, form.current ?? undefined); }} />
    <footer className="kay-form-footer"><Button action="cancel" type="button" variant="outline" disabled={command.busy} onClick={() => { if (!command.isBusy()) guard.request(cancel, form.current ?? undefined); }}>Annuler</Button><Button action="save" type="submit" disabled={disabled}>{command.busy ? "Enregistrement…" : "Enregistrer la recherche"}</Button></footer>
    {guard.dialog}
  </form>;
}
