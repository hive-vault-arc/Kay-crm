"use client";
import { CompletedIcon, DevelopmentIcon, LocationIcon } from "@/components/icons";
import { SectionHeading } from "@/components/shared/section-heading";
import { useDossierDraft } from "@/components/shared/dossier-form";
import type { StaffRole } from "@/features/contacts/contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ContactSelector } from "@/features/contacts/contact-selector";
import { useQuery } from "@/features/contacts/use-query";
import { RecordError } from "@/features/contacts/record-states";
import { useHydrated } from "@/hooks/use-hydrated";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { categoryLabels } from "./contracts";
import { developmentFieldsSchema, developmentsSchema, developmentPhaseLabels, programmePhaseLabel, type Development } from "./development-contracts";
import { InventoryDraftSummary } from "./inventory-draft-summary";
import { InventoryWizardSteps } from "./inventory-wizard-steps";
import { InventoryError } from "./states";
import { useDevelopmentCreation } from "./use-development-creation";

type Values = { phase: "" | keyof typeof developmentPhaseLabels; reference: string; name: string; category: Development["category"]; location: string; briefing_text: string; developer_marketing_display: string };
const steps = [
  { label: "Identité du programme", mobileLabel: "Programme", icon: DevelopmentIcon },
  { label: "Localisation et contexte", mobileLabel: "Détails", icon: LocationIcon },
  { label: "Vérification", mobileLabel: "Résumé", icon: CompletedIcon },
] as const;

export function DevelopmentCreationWizard({ actorId, role, cancel }: { actorId?: string; role?: StaffRole; cancel?: () => void } = {}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const capabilities = useQuery("/api/v1/developments?page=1&page_size=1", developmentsSchema);
  const [reviewedPhaseSupport, setReviewedPhaseSupport] = useState<boolean>();
  const phaseSupported = reviewedPhaseSupport ?? capabilities.value?.phase_supported === true;
  const phaseReady = reviewedPhaseSupport !== undefined || Boolean(capabilities.value);
  const command = useDevelopmentCreation({ actorId, role, available: phaseReady && !capabilities.error });
  const scope = useRef<HTMLFormElement>(null), alive = useRef(true), lock = useRef(false), reported = useRef(false);
  const [step, setStep] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const [developer, setDeveloper] = useState<Development["developer"]["contact"]>(null);
  const [showDeveloper, setShowDeveloper] = useState(false);
  const [validation, setValidation] = useState("");
  const form = useForm<Values>({ defaultValues: { phase: "preparation", reference: "", name: "", category: "mixed", location: "", briefing_text: "", developer_marketing_display: "" }, shouldUnregister: false });
  const draft = useWatch({ control: form.control });
  const changes = useDossierDraft({ ...draft, reference: draft.reference?.trim() ?? "", name: draft.name?.trim() ?? "", location: draft.location?.trim() ?? "", briefing_text: draft.briefing_text?.trim() ?? "", developer_marketing_display: draft.developer_marketing_display?.trim() ?? "", developerId: developer?.id ?? null }, command.protected);
  const denyCreation = command.deny;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { if (capabilities.error && [401, 403, 404].includes(capabilities.error.status)) denyCreation(capabilities.error); }, [capabilities.error, denyCreation]);
  function field(name: keyof Values) { const registered = form.register(name); return { ...registered, onChange: (event: Parameters<typeof registered.onChange>[0]) => { if (!lock.current && command.canEdit()) return registered.onChange(event); } }; }
  const details = ({ phase, ...values }: Values) => ({
    ...values,
    ...(phaseSupported ? { phase: phase || null } : {}),
    location: values.location.trim() || null,
    briefing_text: values.briefing_text.trim() || null,
    developer_contact_id: developer?.id ?? null,
    developer_marketing_display: values.developer_marketing_display.trim() || null,
  });
  function focusStep(next: number) {
    if (!hydrated || lock.current || command.locked()) return;
    setStep(next);
    requestAnimationFrame(() => heading.current?.focus());
  }
  function check(fields: (keyof Values)[]) {
    form.clearErrors();
    const parsed = developmentFieldsSchema.safeParse(details(form.getValues()));
    const invalid = parsed.success ? [] : parsed.error.issues.map(issue => issue.path[0]).filter((field): field is keyof Values => typeof field === "string" && fields.includes(field as keyof Values));
    invalid.forEach(field => form.setError(field, { type: "validate" }));
    if (invalid.length) {
      setValidation(fields.includes("reference") ? "Renseignez une référence et un nom valides pour le programme." : "Vérifiez la localisation, la présentation et le libellé du promoteur.");
      form.setFocus(invalid[0]);
      return false;
    }
    setValidation("");
    return true;
  }
  function next() {
    if (lock.current || command.locked()) return;
    if (check(step === 0 ? ["reference", "name", "category", "phase"] : ["location", "briefing_text", "developer_marketing_display"])) focusStep(step + 1);
  }
  async function save(values: Values) {
    if (!hydrated || lock.current || command.pending) return;
    if (command.uncertain) { lock.current = true; try { await command.retry(); } finally { lock.current = false; } return; }
    if (!command.canEdit()) return;
    if (!phaseReady) { setValidation("Le statut du programme est en cours de chargement. Réessayez dans un instant."); return; }
    if (!check(["reference", "name", "category", "phase", "location", "briefing_text", "developer_marketing_display"])) {
      const first = ["reference", "name", "category", "phase"].some(field => form.getFieldState(field as keyof Values).invalid);
      focusStep(first ? 0 : 1);
      return;
    }
    const parsed = developmentFieldsSchema.safeParse(details(values));
    if (!parsed.success) return;
    if (reviewedPhaseSupport === undefined) setReviewedPhaseSupport(phaseSupported);
    lock.current = true; reported.current = false;
    try { await command.submit(parsed.data, (record, signal) => { if (!alive.current || signal.aborted || reported.current) return; router.push(`/projects/${record.id}`); if (alive.current && !signal.aborted) { reported.current = true; changes.accept(); } }); }
    finally { lock.current = false; }
  }
  const facts = [
    { label: "Référence", value: draft.reference?.trim() },
    { label: "Nom", value: draft.name?.trim() },
    ...(phaseSupported ? [{ label: "État du programme", value: programmePhaseLabel(draft.phase || null) }] : []),
    { label: "Catégorie", value: !draft.category || draft.category === "mixed" ? "Mixte" : categoryLabels[draft.category] },
    { label: "Localisation", value: draft.location?.trim() },
    { label: "Présentation", value: draft.briefing_text?.trim() ? "Renseignée" : null },
    { label: "Promoteur", value: developer ? "Contact lié" : null },
    { label: "Libellé public du promoteur", value: draft.developer_marketing_display?.trim() },
  ];
  if (command.denied) return <>{command.acknowledged ? <p role="status">Le programme est enregistré. Les droits d’accès ont changé.</p> : null}<RecordError error={command.denied} /></>;
  return <form ref={scope} data-draft-managed data-live-dirty={changes.dirty ? "true" : undefined} data-write-recovery={command.uncertain ? "true" : undefined} noValidate className="form-surface kay-inventory-wizard grid min-w-0 items-start gap-5" aria-label="Créer un programme" aria-busy={command.protected} onSubmit={event => { event.preventDefault(); if (step === 2) void form.handleSubmit(save)(event); else next(); }}>
    <InventoryWizardSteps steps={steps} current={step} change={next => { if (lock.current || command.locked()) return; setValidation(""); focusStep(next); }} disabled={!hydrated || command.protected} />
    <div className="grid min-w-0 gap-5">
      <div>
        <h2 ref={heading} tabIndex={-1} className="sr-only">{steps[step].label}</h2>
        <SectionHeading icon={steps[step].icon}>{steps[step].label}</SectionHeading>
        <p className="mt-2 text-sm text-muted-foreground">{step === 0 ? "Un programme regroupe plusieurs biens. Sa fiche ne décrit pas un appartement précis." : step === 1 ? "Ajoutez le contexte connu. Le promoteur et la présentation sont facultatifs." : "Vérifiez le programme avant de le créer. Les blocs, étages, unités et offres viendront ensuite."}</p>
      </div>
      <fieldset disabled={!command.editable} className="grid min-w-0 gap-4">
        {step === 0 ? <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <div className="grid gap-2"><Label htmlFor="development-reference">Référence du programme</Label><Input id="development-reference" maxLength={80} required aria-invalid={Boolean(form.formState.errors.reference)} aria-describedby={form.formState.errors.reference ? "development-validation" : undefined} {...field("reference")} /></div>
          <div className="grid gap-2"><Label htmlFor="development-name">Nom du programme</Label><Input id="development-name" maxLength={160} required aria-invalid={Boolean(form.formState.errors.name)} aria-describedby={form.formState.errors.name ? "development-validation" : undefined} {...field("name")} /></div>
          {phaseSupported ? <div className="grid gap-2 sm:col-span-2"><Label htmlFor="development-phase">État du programme</Label><NativeSelect id="development-phase" aria-invalid={Boolean(form.formState.errors.phase)} aria-describedby={form.formState.errors.phase ? "development-validation" : undefined} {...field("phase")}><option value="">À renseigner</option>{Object.entries(developmentPhaseLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div> : null}
          <div className="grid gap-2 sm:col-span-2"><Label htmlFor="development-category">Catégorie du programme</Label><NativeSelect id="development-category" {...field("category")}><option value="mixed">Mixte</option>{Object.entries(categoryLabels).filter(([value]) => ["villa", "house", "apartment", "land", "commercial"].includes(value)).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div>
        </div> : null}
        {step === 1 ? <div className="grid min-w-0 gap-4">
          <div className="grid gap-2"><Label htmlFor="development-location">Localisation du programme (facultative)</Label><Input id="development-location" maxLength={500} aria-invalid={Boolean(form.formState.errors.location)} aria-describedby={form.formState.errors.location ? "development-validation" : undefined} {...field("location")} /></div>
          <div className="grid gap-2"><Label htmlFor="development-briefing">Présentation partagée (facultative)</Label><Textarea id="development-briefing" rows={4} aria-invalid={Boolean(form.formState.errors.briefing_text)} aria-describedby="briefing-help development-validation" {...field("briefing_text")} /><p id="briefing-help" className="text-sm text-muted-foreground">Décrivez le programme sans coordonnées ni notes privées. 10 000 caractères maximum.</p></div>
          {!showDeveloper ? <Button action="add" type="button" variant="outline" className="justify-self-start" onClick={() => { if (!lock.current && command.canEdit()) setShowDeveloper(true); }}>Ajouter un promoteur (facultatif)</Button> : <fieldset className="grid min-w-0 gap-4 border-t pt-4"><legend className="font-medium">Promoteur (facultatif)</legend>{developer ? <><p>Contact lié au programme.</p><Button action="release" type="button" variant="outline" className="justify-self-start" onClick={() => { if (!lock.current && command.canEdit()) setDeveloper(null); }}>Dissocier le promoteur</Button></> : <ContactSelector denied={command.deny} choose={contact => { if (!lock.current && command.canEdit()) setDeveloper(contact); }} />}<div className="grid gap-2"><Label htmlFor="developer-display">Libellé commercial du promoteur (facultatif)</Label><Input id="developer-display" maxLength={160} aria-invalid={Boolean(form.formState.errors.developer_marketing_display)} aria-describedby={form.formState.errors.developer_marketing_display ? "development-validation" : undefined} {...field("developer_marketing_display")} /></div><p className="text-sm text-muted-foreground">Le nom privé du contact n’est pas copié dans le libellé partagé.</p></fieldset>}
        </div> : null}
        {step === 2 ? <InventoryDraftSummary icon={DevelopmentIcon} title="Programme à créer" facts={facts} onlyFilled wide next="Après la création, structurez les blocs, les étages et les unités physiques. Les offres du programme restent distinctes de celles des unités." /> : null}
      </fieldset>
      {validation ? <p id="development-validation" role="alert" className="text-danger">{validation}</p> : null}
      {capabilities.error ? <RecordError error={capabilities.error} retry={command.protected ? undefined : capabilities.refresh} /> : null}
      <InventoryError level="development" error={command.error} />
      {command.uncertain ? <p role="status">{command.acknowledged ? "Le programme est enregistré. Actualisez son résultat sans le créer à nouveau." : "La réponse est interrompue. Réessayez la même opération pour retrouver le programme."}</p> : null}
      <div role="group" aria-label="Navigation du formulaire" className="kay-inventory-form-actions flex flex-wrap gap-2 border-t pt-4">
        {step > 0 ? <Button action="back" type="button" variant="outline" disabled={command.protected} onClick={() => { if (lock.current || command.locked()) return; setValidation(""); focusStep(step - 1); }}>Précédent</Button> : null}
        {step < 2 ? <Button action="forward" variant="creation" type="button" disabled={!hydrated || command.protected} onClick={event => { event.preventDefault(); next(); }}>Suivant</Button> : <Button action="create" type="submit" disabled={!hydrated || command.pending || !command.uncertain && !command.canEdit()}>{command.pending ? "Enregistrement…" : command.uncertain ? command.acknowledged ? "Actualiser le résultat" : "Réessayer la même opération" : "Créer le programme"}</Button>}
        {cancel ? <Button action="cancel" type="button" variant="outline" disabled={command.protected} onClick={() => { if (!lock.current && !command.locked()) cancel(); }}>Annuler</Button> : <Button action="cancel" variant="outline" disabled={command.protected} asChild><Link href="/projects?kind=programmes" aria-disabled={command.protected} tabIndex={command.protected ? -1 : undefined} onClick={event => { if (lock.current || command.locked()) event.preventDefault(); }}>Annuler</Link></Button>}
      </div>
    </div>
  </form>;
}
