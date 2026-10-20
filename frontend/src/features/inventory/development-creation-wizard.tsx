"use client";
import { CompletedIcon, DevelopmentIcon, LocationIcon } from "@/components/icons";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ContactSelector } from "@/features/contacts/contact-selector";
import { useHydrated } from "@/hooks/use-hydrated";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { categoryLabels } from "./contracts";
import { developmentFieldsSchema, type Development } from "./development-contracts";
import { InventoryDraftSummary } from "./inventory-draft-summary";
import { InventoryWizardSteps } from "./inventory-wizard-steps";
import { InventoryError } from "./states";
import { useInventoryCommand } from "./use-command";

type Values = { reference: string; name: string; category: Development["category"]; location: string; briefing_text: string; developer_marketing_display: string };
const steps = [
  { label: "Identité du programme", mobileLabel: "Programme", icon: DevelopmentIcon },
  { label: "Localisation et contexte", mobileLabel: "Détails", icon: LocationIcon },
  { label: "Vérification", mobileLabel: "Vérifier", icon: CompletedIcon },
] as const;

export function DevelopmentCreationWizard() {
  const router = useRouter();
  const hydrated = useHydrated();
  const command = useInventoryCommand();
  const [step, setStep] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const [developer, setDeveloper] = useState<Development["developer"]["contact"]>(null);
  const [showDeveloper, setShowDeveloper] = useState(false);
  const [validation, setValidation] = useState("");
  const form = useForm<Values>({ defaultValues: { reference: "", name: "", category: "mixed", location: "", briefing_text: "", developer_marketing_display: "" }, shouldUnregister: false });
  const draft = useWatch({ control: form.control });
  const details = (values: Values) => ({
    ...values,
    location: values.location.trim() || null,
    briefing_text: values.briefing_text.trim() || null,
    developer_contact_id: developer?.id ?? null,
    developer_marketing_display: values.developer_marketing_display.trim() || null,
  });
  function focusStep(next: number) {
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
    if (check(step === 0 ? ["reference", "name", "category"] : ["location", "briefing_text", "developer_marketing_display"])) focusStep(step + 1);
  }
  async function save(values: Values) {
    if (!check(["reference", "name", "category", "location", "briefing_text", "developer_marketing_display"])) {
      const first = ["reference", "name", "category"].some(field => form.getFieldState(field as keyof Values).invalid);
      focusStep(first ? 0 : 1);
      return;
    }
    const parsed = developmentFieldsSchema.safeParse(details(values));
    if (!parsed.success) return;
    await command.submit("/api/v1/developments", parsed.data, "POST", id => router.push(`/projects/${id}`));
  }
  const facts = [
    { label: "Référence", value: draft.reference?.trim() },
    { label: "Nom", value: draft.name?.trim() },
    { label: "Catégorie", value: !draft.category || draft.category === "mixed" ? "Mixte" : categoryLabels[draft.category] },
    { label: "Localisation", value: draft.location?.trim() },
    { label: "Présentation", value: draft.briefing_text?.trim() ? "Renseignée" : null },
    { label: "Promoteur", value: developer ? "Contact lié" : null },
    { label: "Libellé public du promoteur", value: draft.developer_marketing_display?.trim() },
  ];
  return <form noValidate className="form-surface grid min-w-0 items-start gap-5 lg:grid-cols-[14rem_minmax(0,1fr)]" aria-label="Créer un programme" aria-busy={command.pending} onSubmit={event => { event.preventDefault(); if (step === 2) void form.handleSubmit(save)(event); else next(); }}>
    <InventoryWizardSteps steps={steps} current={step} />
    <div className="grid min-w-0 gap-5">
      <div>
        <h2 ref={heading} tabIndex={-1} className="sr-only">{steps[step].label}</h2>
        <SectionHeading icon={steps[step].icon}>{steps[step].label}</SectionHeading>
        <p className="mt-2 text-sm text-muted-foreground">{step === 0 ? "Un programme regroupe plusieurs biens. Sa fiche ne décrit pas un appartement précis." : step === 1 ? "Ajoutez le contexte connu. Le promoteur et la présentation sont facultatifs." : "Vérifiez le programme avant de le créer. Les blocs, étages, unités et offres viendront ensuite."}</p>
      </div>
      <fieldset disabled={!hydrated || command.pending} className="grid min-w-0 gap-4">
        {step === 0 ? <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <div className="grid gap-2"><Label htmlFor="development-reference">Référence du programme</Label><Input id="development-reference" maxLength={80} required aria-invalid={Boolean(form.formState.errors.reference)} aria-describedby={form.formState.errors.reference ? "development-validation" : undefined} {...form.register("reference")} /></div>
          <div className="grid gap-2"><Label htmlFor="development-name">Nom du programme</Label><Input id="development-name" maxLength={160} required aria-invalid={Boolean(form.formState.errors.name)} aria-describedby={form.formState.errors.name ? "development-validation" : undefined} {...form.register("name")} /></div>
          <div className="grid gap-2 sm:col-span-2"><Label htmlFor="development-category">Catégorie du programme</Label><NativeSelect id="development-category" {...form.register("category")}><option value="mixed">Mixte</option>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div>
        </div> : null}
        {step === 1 ? <div className="grid min-w-0 gap-4">
          <div className="grid gap-2"><Label htmlFor="development-location">Localisation du programme (facultative)</Label><Input id="development-location" maxLength={500} aria-invalid={Boolean(form.formState.errors.location)} aria-describedby={form.formState.errors.location ? "development-validation" : undefined} {...form.register("location")} /></div>
          <div className="grid gap-2"><Label htmlFor="development-briefing">Présentation partagée (facultative)</Label><Textarea id="development-briefing" rows={4} aria-invalid={Boolean(form.formState.errors.briefing_text)} aria-describedby="briefing-help development-validation" {...form.register("briefing_text")} /><p id="briefing-help" className="text-sm text-muted-foreground">Décrivez le programme sans coordonnées ni notes privées. 10 000 caractères maximum.</p></div>
          {!showDeveloper ? <Button action="add" type="button" variant="outline" className="justify-self-start" onClick={() => setShowDeveloper(true)}>Ajouter un promoteur (facultatif)</Button> : <fieldset className="grid min-w-0 gap-4 border-t pt-4"><legend className="font-medium">Promoteur (facultatif)</legend>{developer ? <><p>Contact lié au programme.</p><Button action="release" type="button" variant="outline" className="justify-self-start" onClick={() => setDeveloper(null)}>Dissocier le promoteur</Button></> : <ContactSelector choose={setDeveloper} />}<div className="grid gap-2"><Label htmlFor="developer-display">Libellé commercial du promoteur (facultatif)</Label><Input id="developer-display" maxLength={160} aria-invalid={Boolean(form.formState.errors.developer_marketing_display)} aria-describedby={form.formState.errors.developer_marketing_display ? "development-validation" : undefined} {...form.register("developer_marketing_display")} /></div><p className="text-sm text-muted-foreground">Le nom privé du contact n’est pas copié dans le libellé partagé.</p></fieldset>}
        </div> : null}
        {step === 2 ? <InventoryDraftSummary icon={DevelopmentIcon} title="Programme à créer" facts={facts} onlyFilled wide next="Après la création, structurez les blocs, les étages et les unités physiques. Les offres du programme restent distinctes de celles des unités." /> : null}
      </fieldset>
      {validation ? <p id="development-validation" role="alert" className="text-danger">{validation}</p> : null}
      <InventoryError level="development" error={command.error} />
      <div role="group" aria-label="Navigation du formulaire" className="flex flex-wrap gap-2 border-t pt-4">
        {step > 0 ? <Button action="back" type="button" variant="outline" disabled={command.pending} onClick={() => { setValidation(""); focusStep(step - 1); }}>Précédent</Button> : null}
        {step < 2 ? <Button action="forward" variant="creation" type="button" disabled={!hydrated || command.pending} onClick={event => { event.preventDefault(); next(); }}>Suivant</Button> : <Button action="create" type="submit" disabled={!hydrated || command.pending}>{command.pending ? "Enregistrement…" : "Créer le programme"}</Button>}
        <Button action="cancel" variant="outline" asChild><Link href="/projects">Annuler</Link></Button>
      </div>
    </div>
  </form>;
}
