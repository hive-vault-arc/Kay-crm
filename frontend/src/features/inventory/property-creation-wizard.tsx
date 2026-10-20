"use client";
import { CompletedIcon, LocationIcon, PropertyIcon } from "@/components/icons";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { useHydrated } from "@/hooks/use-hydrated";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { categoryLabels, propertyFieldsSchema, type Property } from "./contracts";
import { InventoryDraftSummary } from "./inventory-draft-summary";
import { InventoryWizardSteps } from "./inventory-wizard-steps";
import { LevelPicker } from "./level-picker";
import { InventoryError } from "./states";
import { useInventoryCommand } from "./use-command";

type Values = { reference: string; category: Property["category"]; marketing_name: string; location: string; area_sqm: string; rooms: string };
const steps = [
  { label: "Type et identité", mobileLabel: "Type", icon: PropertyIcon },
  { label: "Caractéristiques", mobileLabel: "Détails", icon: LocationIcon },
  { label: "Vérification", mobileLabel: "Vérifier", icon: CompletedIcon },
] as const;
const hasRooms = (category: Property["category"]) => category === "apartment" || category === "villa" || category === "house";

export function PropertyCreationWizard({ developmentId }: { developmentId?: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const command = useInventoryCommand();
  const [step, setStep] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const [validation, setValidation] = useState("");
  const [placement, setPlacement] = useState({ block_id: "", floor_id: "", unit_type_id: "" });
  const form = useForm<Values>({ defaultValues: { reference: "", category: "apartment", marketing_name: "", location: "", area_sqm: "", rooms: "" }, shouldUnregister: false });
  const draft = useWatch({ control: form.control });
  const category = draft.category ?? "apartment";
  const categoryField = form.register("category");
  const details = (values: Values) => ({
    ...values,
    marketing_name: values.marketing_name.trim() || null,
    location: values.location.trim() || null,
    area_sqm: values.area_sqm.trim().replace(",", ".") || null,
    rooms: hasRooms(values.category) && values.rooms.trim() ? Number(values.rooms) : null,
    ...(developmentId ? { development_id: developmentId, floor_id: values.category === "apartment" ? placement.floor_id || null : null, unit_type_id: values.category === "apartment" ? placement.unit_type_id || null : null } : {}),
  });
  function focusStep(next: number) {
    setStep(next);
    requestAnimationFrame(() => heading.current?.focus());
  }
  function check(fields: (keyof Values)[]) {
    form.clearErrors();
    const parsed = propertyFieldsSchema.safeParse(details(form.getValues()));
    const invalid = parsed.success ? [] : parsed.error.issues.map(issue => issue.path[0]).filter((field): field is keyof Values => typeof field === "string" && fields.includes(field as keyof Values));
    invalid.forEach(field => form.setError(field, { type: "validate" }));
    if (invalid.length) {
      setValidation(fields.includes("reference") ? "Renseignez une référence valide (80 caractères maximum)." : "Vérifiez la surface et le nombre de pièces. La surface doit être positive et comporter au plus deux décimales.");
      form.setFocus(invalid[0]);
      return false;
    }
    if (fields.includes("area_sqm") && developmentId && category === "apartment" && (!placement.block_id || !placement.floor_id || !placement.unit_type_id)) {
      setValidation("Pour un appartement du programme, choisissez un bloc, un étage et un type réutilisable.");
      document.getElementById(!placement.block_id ? "picker-Bloc-de-l’unité" : !placement.floor_id ? "picker-Étage-de-l’unité" : "picker-Type-réutilisable-de-l’unité")?.focus();
      return false;
    }
    setValidation("");
    return true;
  }
  function next() {
    if (check(step === 0 ? ["reference", "category", "marketing_name"] : ["location", "area_sqm", "rooms"])) focusStep(step + 1);
  }
  async function save(values: Values) {
    if (!check(["reference", "category", "marketing_name", "location", "area_sqm", "rooms"])) {
      const first = ["reference", "category", "marketing_name"].some(field => form.getFieldState(field as keyof Values).invalid);
      focusStep(first ? 0 : 1);
      requestAnimationFrame(() => form.setFocus(first ? "reference" : "area_sqm"));
      return;
    }
    const parsed = propertyFieldsSchema.safeParse(details(values));
    if (!parsed.success) return;
    await command.submit("/api/v1/properties", parsed.data, "POST", id => router.push(`/projects/properties/${id}`));
  }
  const facts = [
    { label: "Référence", value: draft.reference?.trim() },
    { label: "Catégorie", value: categoryLabels[category] },
    { label: "Nom commercial", value: draft.marketing_name?.trim() },
    { label: "Localisation", value: draft.location?.trim() },
    { label: "Surface", value: draft.area_sqm?.trim() ? `${draft.area_sqm.trim()} m²` : null },
    ...(hasRooms(category) ? [{ label: "Pièces", value: draft.rooms?.trim() }] : []),
    ...(developmentId && category === "apartment" ? [{ label: "Étage et type", value: placement.floor_id && placement.unit_type_id ? "Renseignés" : null }] : []),
  ];
  return <form noValidate className="form-surface grid min-w-0 items-start gap-5 lg:grid-cols-[14rem_minmax(0,1fr)]" aria-label={developmentId ? "Créer une unité physique" : "Créer un bien indépendant"} aria-busy={command.pending} onSubmit={event => { event.preventDefault(); if (step === 2) void form.handleSubmit(save)(event); else next(); }}>
    <InventoryWizardSteps steps={steps} current={step} />
    <div className="grid min-w-0 gap-5">
      <div>
        <h2 ref={heading} tabIndex={-1} className="sr-only">{steps[step].label}</h2>
        <SectionHeading icon={steps[step].icon} tone="teal">{steps[step].label}</SectionHeading>
        <p className="mt-2 text-sm text-muted-foreground">{step === 0 ? developmentId ? "Identifiez l’unité physique à ajouter au programme." : "Identifiez le bien physique à ajouter à l’inventaire." : step === 1 ? "Renseignez seulement les caractéristiques connues pour ce type de bien." : "Vérifiez la fiche avant création. Les offres et pièces jointes s’ajoutent ensuite."}</p>
      </div>
      <fieldset disabled={!hydrated || command.pending} className="grid min-w-0 gap-4">
        {step === 0 ? <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <div className="grid gap-2"><Label htmlFor="property-reference">Référence du bien</Label><Input id="property-reference" maxLength={80} required aria-invalid={Boolean(form.formState.errors.reference)} aria-describedby={form.formState.errors.reference ? "property-validation" : undefined} {...form.register("reference")} /></div>
          <div className="grid gap-2"><Label htmlFor="property-category">Catégorie</Label><NativeSelect id="property-category" {...categoryField} onChange={event => { void categoryField.onChange(event); if (!hasRooms(event.target.value as Property["category"])) form.setValue("rooms", ""); if (event.target.value !== "apartment") setPlacement({ block_id: "", floor_id: "", unit_type_id: "" }); }}>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div>
          <div className="grid gap-2 sm:col-span-2"><Label htmlFor="property-name">Nom commercial (facultatif)</Label><Input id="property-name" maxLength={160} aria-invalid={Boolean(form.formState.errors.marketing_name)} aria-describedby={form.formState.errors.marketing_name ? "property-validation" : undefined} {...form.register("marketing_name")} /></div>
        </div> : null}
        {step === 1 ? <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2"><Label htmlFor="property-location">Localisation (facultative)</Label><Input id="property-location" maxLength={500} aria-invalid={Boolean(form.formState.errors.location)} aria-describedby={form.formState.errors.location ? "property-validation" : undefined} {...form.register("location")} /></div>
          <div className="grid gap-2"><Label htmlFor="property-area">{category === "land" ? "Surface du terrain en m² (facultative)" : category === "commercial" ? "Surface du local en m² (facultative)" : "Surface en m² (facultative)"}</Label><Input id="property-area" inputMode="decimal" maxLength={19} aria-invalid={Boolean(form.formState.errors.area_sqm)} aria-describedby={form.formState.errors.area_sqm ? "property-validation" : undefined} {...form.register("area_sqm")} /></div>
          {hasRooms(category) ? <div className="grid gap-2"><Label htmlFor="property-rooms">Nombre de pièces (facultatif)</Label><Input id="property-rooms" inputMode="numeric" maxLength={4} aria-invalid={Boolean(form.formState.errors.rooms)} aria-describedby={form.formState.errors.rooms ? "property-validation" : undefined} {...form.register("rooms")} /></div> : null}
          {developmentId && category === "apartment" ? <fieldset className="grid min-w-0 gap-4 sm:col-span-2"><legend className="mb-3 font-medium">Rattachement de l’unité</legend><LevelPicker parent={developmentId} kind="blocks" label="Bloc de l’unité" value={placement.block_id} change={value => setPlacement(previous => ({ ...previous, block_id: value, floor_id: "" }))} />{placement.block_id ? <LevelPicker key={placement.block_id} parent={placement.block_id} kind="floors" label="Étage de l’unité" value={placement.floor_id} change={value => setPlacement(previous => ({ ...previous, floor_id: value }))} /> : null}<LevelPicker parent={developmentId} kind="unit-types" label="Type réutilisable de l’unité" value={placement.unit_type_id} change={value => setPlacement(previous => ({ ...previous, unit_type_id: value }))} /></fieldset> : null}
        </div> : null}
        {step === 2 ? <InventoryDraftSummary icon={PropertyIcon} title={developmentId ? "Unité à créer" : "Bien à créer"} facts={facts} onlyFilled wide next="Après la création, vous pourrez ajouter les propriétaires, les campagnes vente ou location et les pièces jointes depuis la fiche." /> : null}
      </fieldset>
      {step === 2 ? <p className="text-sm text-muted-foreground">Ces informations seront lisibles par toute l’équipe. N’y saisissez pas de coordonnées privées.</p> : null}
      {validation ? <p id="property-validation" role="alert" className="text-danger">{validation}</p> : null}
      <InventoryError error={command.error} />
      <div role="group" aria-label="Navigation du formulaire" className="flex flex-wrap gap-2 border-t pt-4">
        {step > 0 ? <Button action="back" type="button" variant="outline" disabled={command.pending} onClick={() => { setValidation(""); focusStep(step - 1); }}>Précédent</Button> : null}
        {step < 2 ? <Button action="forward" variant="creation" type="button" disabled={!hydrated || command.pending} onClick={event => { event.preventDefault(); next(); }}>Suivant</Button> : <Button action="create" type="submit" disabled={!hydrated || command.pending}>{command.pending ? "Enregistrement…" : developmentId ? "Créer l’unité" : "Créer le bien"}</Button>}
        <Button action="cancel" variant="outline" asChild><Link href={developmentId ? `/projects/${developmentId}` : "/projects"}>Annuler</Link></Button>
      </div>
    </div>
  </form>;
}
