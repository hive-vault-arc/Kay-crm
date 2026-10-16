"use client";
import { PropertyIcon } from "@/components/icons";
import { SectionHeading } from "@/components/shared/section-heading";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { useHydrated } from "@/hooks/use-hydrated";
import { categoryLabels, propertyFieldsSchema, type Property } from "./contracts";
import { InventoryError } from "./states";
import { useInventoryCommand } from "./use-command";
import { LevelPicker } from "./level-picker";

type Values = { reference: string; category: Property["category"]; marketing_name: string; location: string; area_sqm: string; rooms: string };
export function PropertyEditor({ property, developmentId = property?.development_id ?? undefined }: { property?: Property; developmentId?: string }) {
  const [placement, setPlacement] = useState({ block_id: property?.hierarchy?.block?.id ?? "", floor_id: property?.floor_id ?? "", unit_type_id: property?.unit_type_id ?? "" });
  const router = useRouter();
  const hydrated = useHydrated();
  const form = useForm<Values>({ defaultValues: { reference: property?.reference ?? "", category: property?.category ?? "apartment", marketing_name: property?.marketing_name ?? "", location: property?.location ?? "", area_sqm: property?.area_sqm ?? "", rooms: property?.rooms ? String(property.rooms) : "" } });
  const [version, setVersion] = useState(property?.version ?? 1);
  const [validation, setValidation] = useState("");
  const command = useInventoryCommand();
  async function save(values: Values) {
    form.clearErrors();
    const parsed = propertyFieldsSchema.safeParse({ ...values, rooms: values.rooms.trim() ? Number(values.rooms) : null, ...(developmentId ? { development_id: developmentId, floor_id: placement.floor_id || null, unit_type_id: placement.unit_type_id || null } : {}), marketing_name: values.marketing_name.trim() || null, location: values.location.trim() || null, area_sqm: values.area_sqm.trim().replace(",", ".") || null });
    if (!parsed.success) { setValidation("Vérifiez la référence, les longueurs et la surface (positive, deux décimales maximum). Laissez les informations inconnues vides."); const fields = parsed.error.issues.map(issue => issue.path[0]).filter((field): field is keyof Values => typeof field === "string" && ["reference", "category", "marketing_name", "location", "area_sqm", "rooms"].includes(field)); fields.forEach(field => form.setError(field, { type: "validate" })); form.setFocus(fields[0] ?? "reference"); return; }
    setValidation("");
    await command.submit(property ? `/api/v1/properties/${property.id}` : "/api/v1/properties", { ...parsed.data, ...(property ? { expected_version: version } : {}) }, property ? "PATCH" : "POST", id => router.push(`/projects/properties/${id}`));
  }
  return <form noValidate className="form-surface grid max-w-reading gap-6" aria-label={property ? "Modifier le bien" : developmentId ? "Créer une unité physique" : "Créer un bien indépendant"} aria-busy={command.pending} onSubmit={event => void form.handleSubmit(save)(event)}>
    <SectionHeading icon={PropertyIcon} tone="teal">Caractéristiques du bien</SectionHeading>
    <p>{developmentId ? "Unité physique du programme : un appartement exige un étage et un type du même programme. Les faits saisis appartiennent à cette unité ; un type ne les réécrit jamais." : "Les informations inconnues restent vides. Le bien est physique et indépendant, y compris un appartement sans programme."}</p>
    <fieldset disabled={!hydrated || command.pending} className="grid min-w-0 gap-4 sm:grid-cols-2">
      <div className="grid gap-2"><Label htmlFor="property-reference">Référence du bien</Label><Input id="property-reference" aria-invalid={Boolean(form.formState.errors.reference)} aria-describedby={form.formState.errors.reference ? "property-validation" : undefined} maxLength={80} required {...form.register("reference")} /></div>
      <div className="grid gap-2"><Label htmlFor="property-category">Catégorie</Label><NativeSelect id="property-category" {...form.register("category")}>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div>
      <div className="grid gap-2 sm:col-span-2"><Label htmlFor="property-name">Nom commercial (facultatif)</Label><Input id="property-name" aria-invalid={Boolean(form.formState.errors.marketing_name)} aria-describedby={form.formState.errors.marketing_name ? "property-validation" : undefined} maxLength={160} {...form.register("marketing_name")} /></div>
      <div className="grid gap-2 sm:col-span-2"><Label htmlFor="property-location">Localisation (facultatif)</Label><Input id="property-location" aria-invalid={Boolean(form.formState.errors.location)} aria-describedby={form.formState.errors.location ? "property-validation" : undefined} maxLength={500} {...form.register("location")} /></div>
      <div className="grid gap-2"><Label htmlFor="property-area">Surface en m² (facultative)</Label><Input id="property-area" aria-invalid={Boolean(form.formState.errors.area_sqm)} aria-describedby={form.formState.errors.area_sqm ? "property-validation" : undefined} inputMode="decimal" maxLength={19} {...form.register("area_sqm")} /></div>
      <div className="grid gap-2"><Label htmlFor="property-rooms">Nombre de pièces (facultatif)</Label><Input id="property-rooms" inputMode="numeric" maxLength={4} aria-invalid={Boolean(form.formState.errors.rooms)} aria-describedby={form.formState.errors.rooms ? "property-validation" : undefined} {...form.register("rooms")} /></div>
      {developmentId ? <fieldset disabled={Boolean(property?.offerings.length)} className="grid min-w-0 gap-4 sm:col-span-2"><legend className="font-medium">Rattachement de l’unité</legend><LevelPicker parent={developmentId} kind="blocks" label="Bloc de l’unité" value={placement.block_id} selectedLabel={property?.hierarchy?.block?.label} change={value => setPlacement({ ...placement, block_id: value, floor_id: "" })} />{placement.block_id ? <LevelPicker key={placement.block_id} parent={placement.block_id} kind="floors" label="Étage de l’unité" value={placement.floor_id} selectedLabel={property?.hierarchy?.floor?.label} change={value => setPlacement({ ...placement, floor_id: value })} /> : null}<LevelPicker parent={developmentId} kind="unit-types" label="Type réutilisable de l’unité" value={placement.unit_type_id} selectedLabel={property?.hierarchy?.unit_type?.label} change={value => setPlacement({ ...placement, unit_type_id: value })} /><p className="text-sm text-muted-foreground">Les surfaces et pièces restent explicites, même avec un type. Le rattachement d’un bien ayant une campagne nécessite une revue de stock.</p></fieldset> : null}
    </fieldset>
    <p className="text-sm text-muted-foreground">Ces informations seront lisibles par toute l’équipe. N’y saisissez pas de coordonnées privées.</p>
    {validation ? <p id="property-validation" role="alert" className="text-danger">{validation}</p> : null}
    <InventoryError error={command.error} id={property?.id} choose={current => { setVersion(current.version); command.clear(); }} />
    <div className="flex flex-wrap gap-2"><Button type="submit" disabled={!hydrated || command.pending}>{command.pending ? "Enregistrement…" : property ? "Enregistrer le bien" : developmentId ? "Créer l’unité" : "Créer le bien"}</Button><Button variant="outline" asChild><Link href={property ? `/projects/properties/${property.id}` : "/projects"}>Annuler</Link></Button></div>
  </form>;
}
