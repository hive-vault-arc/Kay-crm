"use client";

import { CompletedIcon, LocationIcon, PropertyIcon, SettingsIcon, FinanceIcon } from "@/components/icons";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useHydrated } from "@/hooks/use-hydrated";
import { formatMAD } from "@/lib/format";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { amenityLabels, categoryLabels, createPropertySchema, kindLabels, type Property } from "./contracts";
import { InventoryDraftSummary } from "./inventory-draft-summary";
import { InventoryWizardSteps } from "./inventory-wizard-steps";
import { InventoryError } from "./states";
import { useInventoryCommand } from "./use-command";

type Category = Property["category"];
type Market = keyof typeof kindLabels;
type Field = "reference" | "marketing_name" | "price_mad" | "location" | "address" | "region" | "city" | "district" | "neighborhood" | "google_maps_url" | "area_sqm" | "rooms" | "bedrooms" | "bathrooms" | "capacity" | "minimum_nights" | "condition" | "age_band" | "floor_type" | "unit_floor" | "building_floors" | "orientation" | "plot_area_sqm" | "land_delivery" | "land_status" | "garden_area_sqm" | "terrace_area_sqm" | "garage_spaces" | "description";
type Values = Record<Field, string> & { category: Category; market: Market; period: "day" | "week" | "month" | "year" | ""; amenities: (keyof typeof amenityLabels)[] };
const initial: Values = { reference: "", marketing_name: "", price_mad: "", location: "", address: "", region: "", city: "", district: "", neighborhood: "", google_maps_url: "", area_sqm: "", rooms: "", bedrooms: "", bathrooms: "", capacity: "", minimum_nights: "", condition: "", age_band: "", floor_type: "", unit_floor: "", building_floors: "", orientation: "", plot_area_sqm: "", land_delivery: "", land_status: "", garden_area_sqm: "", terrace_area_sqm: "", garage_spaces: "", description: "", category: "apartment", market: "sale", period: "", amenities: [] };
const steps = [
  { label: "Bien et offre", mobileLabel: "Offre", icon: PropertyIcon },
  { label: "Localisation", mobileLabel: "Adresse", icon: LocationIcon },
  { label: "Caractéristiques", mobileLabel: "Détails", icon: SettingsIcon },
  { label: "Équipements", mobileLabel: "Options", icon: FinanceIcon },
  { label: "Vérification", mobileLabel: "Vérifier", icon: CompletedIcon },
] as const;
const residential = new Set<Category>(["apartment", "house", "villa", "riad", "room"]);
const hasRooms = (category: Category) => residential.has(category) && category !== "room";
const holidayCategories = new Set<Category>(["apartment", "house", "villa", "riad", "room"]);
const floorCategories = new Set<Category>(["apartment", "room", "commercial", "office"]);
const buildingCategories = new Set<Category>(["house", "villa", "riad"]);
const plotCategories = new Set<Category>(["house", "villa", "riad", "farm"]);
const conditionOptions = { new_or_renovated: "Neuf ou rénové", good: "Bon état", to_renovate: "À rénover" };
const ageOptions = { under_1: "Moins d’un an", "1_5": "1 à 5 ans", "5_10": "5 à 10 ans", "10_20": "10 à 20 ans", "20_30": "20 à 30 ans", "30_50": "30 à 50 ans", "50_70": "50 à 70 ans", "70_100": "70 à 100 ans", over_100: "Plus de 100 ans" };
const floorOptions = { parquet: "Parquet", marble: "Marbre", tile: "Carrelage", other: "Autre" };
const orientationOptions = { north: "Nord", west: "Ouest", east: "Est", south: "Sud" };
const amenityAllowed: Partial<Record<Category, (keyof typeof amenityLabels)[]>> = {
  land: [], farm: ["garage", "storage_room", "security"],
  commercial: ["garage", "elevator", "concierge", "storage_room", "air_conditioning", "central_heating", "security", "double_glazing", "reinforced_door", "fitted_kitchen"],
  office: ["garage", "elevator", "concierge", "storage_room", "air_conditioning", "central_heating", "security", "double_glazing", "reinforced_door", "fitted_kitchen", "garden", "terrace", "sea_view", "mountain_view", "fridge", "microwave", "internet", "pets_allowed"],
};
const trim = (value: string) => value.trim();
const numberOrNull = (value: string) => trim(value) ? Number(value) : null;
const amountOrNull = (value: string) => trim(value).replace(",", ".") || null;
const textOrNull = (value: string) => trim(value) || null;

function buildPayload(values: Values) {
  const category = values.category;
  const options = values.amenities.filter(option => (amenityAllowed[category] ?? Object.keys(amenityLabels)).includes(option));
  const details = {
    condition: category === "land" || category === "farm" ? null : textOrNull(values.condition),
    address: textOrNull(values.address), region: textOrNull(values.region), city: textOrNull(values.city), district: textOrNull(values.district), neighborhood: textOrNull(values.neighborhood), google_maps_url: textOrNull(values.google_maps_url),
    bedrooms: hasRooms(category) ? numberOrNull(values.bedrooms) : null,
    bathrooms: category === "land" || category === "farm" ? null : numberOrNull(values.bathrooms),
    capacity: values.market === "holiday" ? numberOrNull(values.capacity) : null,
    minimum_nights: values.market === "holiday" ? numberOrNull(values.minimum_nights) : null,
    age_band: category === "land" || category === "farm" ? null : textOrNull(values.age_band),
    floor_type: category === "land" || category === "farm" ? null : textOrNull(values.floor_type),
    unit_floor: floorCategories.has(category) ? numberOrNull(values.unit_floor) : null,
    building_floors: buildingCategories.has(category) ? numberOrNull(values.building_floors) : null,
    orientation: residential.has(category) && category !== "room" ? textOrNull(values.orientation) : null,
    plot_area_sqm: plotCategories.has(category) ? amountOrNull(values.plot_area_sqm) : null,
    land_delivery: category === "land" ? textOrNull(values.land_delivery) : null,
    land_status: category === "land" ? textOrNull(values.land_status) : null,
    amenities: options,
    garden_area_sqm: options.includes("garden") ? amountOrNull(values.garden_area_sqm) : null,
    terrace_area_sqm: options.includes("terrace") ? amountOrNull(values.terrace_area_sqm) : null,
    garage_spaces: options.includes("garage") ? numberOrNull(values.garage_spaces) : null,
    description: textOrNull(values.description),
  };
  return {
    reference: trim(values.reference), category, marketing_name: textOrNull(values.marketing_name), location: textOrNull(values.location) ?? textOrNull(values.city), area_sqm: amountOrNull(values.area_sqm), rooms: hasRooms(category) ? numberOrNull(values.rooms) : null,
    listing_details: details,
    initial_offering: { kind: values.market, price_mad: amountOrNull(values.price_mad), price_period: values.market === "sale" ? null : values.period, currency: "MAD" },
  };
}

export function StandalonePropertyWizard() {
  const router = useRouter();
  const hydrated = useHydrated();
  const command = useInventoryCommand();
  const [values, setValues] = useState<Values>(initial);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const set = (field: Field, value: string) => setValues(previous => ({ ...previous, [field]: value }));
  const field = (name: Field, label: string, options?: { required?: boolean; type?: "number" | "url"; hint?: string; maxLength?: number }) => <div className="grid min-w-0 gap-2"><Label htmlFor={`property-${name}`}>{label}{options?.required ? " *" : ""}</Label><Input id={`property-${name}`} value={values[name]} onChange={event => set(name, event.target.value)} required={options?.required} type={options?.type ?? "text"} inputMode={options?.type === "number" ? "decimal" : undefined} min={options?.type === "number" ? 0 : undefined} step={options?.type === "number" ? "any" : undefined} maxLength={options?.maxLength} aria-describedby={options?.hint ? `hint-${name}` : undefined} />{options?.hint ? <p id={`hint-${name}`} className="text-xs text-muted-foreground">{options.hint}</p> : null}</div>;
  const select = (name: Field, label: string, options: Record<string, string>) => <div className="grid min-w-0 gap-2"><Label htmlFor={`property-${name}`}>{label}</Label><NativeSelect id={`property-${name}`} value={values[name]} onChange={event => set(name, event.target.value)}><option value="">Non renseigné</option>{Object.entries(options).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</NativeSelect></div>;
  function chooseCategory(category: Category) {
    setValues(previous => ({ ...previous, category, market: previous.market === "holiday" && !holidayCategories.has(category) ? "sale" : category === "room" && previous.market === "sale" ? "rental" : previous.market, amenities: previous.amenities.filter(option => (amenityAllowed[category] ?? Object.keys(amenityLabels)).includes(option)) }));
  }
  function chooseMarket(market: Market) {
    setValues(previous => ({ ...previous, market, period: market === "sale" ? "" : market === "holiday" ? "day" : "month" }));
  }
  function focus(next: number) { setStep(next); setError(""); requestAnimationFrame(() => heading.current?.focus()); }
  function validate(current: number): boolean {
    const payload = buildPayload(values);
    const required: [boolean, string][] = current === 0 ? [
      [Boolean(trim(values.reference)), "Saisissez la référence du bien."],
      [Boolean(amountOrNull(values.price_mad)), "Indiquez un prix en MAD."],
    ] : current === 1 ? [
      [Boolean(trim(values.region) && trim(values.city)), "Indiquez la région et la ville."],
    ] : current === 2 ? [
      [Boolean(amountOrNull(values.area_sqm)), "Indiquez la surface du bien."],
      [!hasRooms(values.category) || Boolean(values.rooms && values.bedrooms && values.bathrooms), "Indiquez les pièces, chambres et salles de bain."],
      [values.category !== "room" && values.category !== "commercial" && values.category !== "office" || values.bathrooms !== "", "Indiquez le nombre de salles de bain."],
      [values.market !== "holiday" || Boolean(values.capacity && values.minimum_nights), "Indiquez la capacité et la durée minimale du séjour."],
    ] : current === 3 ? [
      [!values.amenities.includes("garden") || Boolean(values.garden_area_sqm), "Indiquez la surface du jardin."],
      [!values.amenities.includes("terrace") || Boolean(values.terrace_area_sqm), "Indiquez la surface de la terrasse."],
      [!values.amenities.includes("garage") || Boolean(values.garage_spaces), "Indiquez le nombre de places de garage."],
    ] : [];
    const missing = required.find(([valid]) => !valid);
    if (missing) { setError(missing[1]); return false; }
    const parsed = createPropertySchema.safeParse(payload);
    if (!parsed.success) {
      const section = current === 0 ? ["reference", "marketing_name", "initial_offering"] : current === 1 ? ["location", "region", "city", "google_maps_url", "address", "district", "neighborhood"] : current === 2 ? ["area_sqm", "rooms", "bedrooms", "bathrooms", "capacity", "minimum_nights", "condition", "age_band", "floor_type", "unit_floor", "building_floors", "orientation", "plot_area_sqm", "land_delivery", "land_status"] : current === 3 ? ["amenities", "garden_area_sqm", "terrace_area_sqm", "garage_spaces", "description"] : [];
      if (parsed.error.issues.some(issue => issue.path.some(path => section.includes(String(path))))) {
        setError("Vérifiez les valeurs de cette étape. Les surfaces et le prix doivent être positifs, avec deux décimales maximum ; le lien doit être un lien Google Maps HTTPS.");
        return false;
      }
    }
    setError(""); return true;
  }
  async function save() {
    for (let index = 0; index < 4; index++) if (!validate(index)) { setStep(index); requestAnimationFrame(() => heading.current?.focus()); return; }
    const parsed = createPropertySchema.safeParse(buildPayload(values));
    if (!parsed.success) { setError("Vérifiez les informations saisies avant de créer le bien."); return; }
    await command.submit("/api/v1/properties", parsed.data, "POST", id => router.push(`/projects/properties/${id}`));
  }
  const category = values.category;
  const options = Object.entries(amenityLabels).filter(([key]) => (amenityAllowed[category] ?? Object.keys(amenityLabels)).includes(key));
  const reviewAmount = amountOrNull(values.price_mad);
  const reviewPrice = reviewAmount && /^[0-9]{1,16}(\.[0-9]{1,2})?$/.test(reviewAmount) && /[1-9]/.test(reviewAmount) ? formatMAD(reviewAmount) : null;
  const facts = [
    { label: "Référence", value: trim(values.reference) }, { label: "Type", value: categoryLabels[category] }, { label: "Offre", value: kindLabels[values.market] },
    { label: "Prix", value: reviewPrice ? `${reviewPrice}${values.market === "sale" ? "" : ` / ${values.period === "day" ? "jour" : values.period === "week" ? "semaine" : values.period === "year" ? "an" : "mois"}`}` : null },
    { label: "Ville", value: trim(values.city) }, { label: "Surface", value: values.area_sqm ? `${values.area_sqm} m²` : null },
    { label: "Google Maps", value: values.google_maps_url ? "Lien renseigné" : null },
    { label: "Équipements", value: values.amenities.length ? `${values.amenities.length} sélectionné(s)` : null },
  ];
  return <form noValidate className="form-surface grid min-w-0 items-start gap-5 lg:grid-cols-[14rem_minmax(0,1fr)]" aria-label="Créer un bien indépendant" aria-busy={command.pending} onSubmit={event => { event.preventDefault(); if (step === 4) void save(); else if (validate(step)) focus(step + 1); }}>
    <InventoryWizardSteps steps={steps} current={step} />
    <div className="grid min-w-0 gap-5">
      <div><h2 ref={heading} tabIndex={-1} className="sr-only">{steps[step].label}</h2><SectionHeading icon={steps[step].icon} tone="teal">{steps[step].label}</SectionHeading><p className="mt-2 text-sm text-muted-foreground">{step === 0 ? "Commencez par le type de bien et le prix de l’offre brouillon." : step === 1 ? "Situez le bien. Le lien Google Maps restera accessible sur sa fiche." : step === 2 ? "Seuls les champs utiles à ce type de bien sont affichés." : step === 3 ? "Ajoutez les équipements connus et une description courte." : "Relisez la fiche. Vous pourrez ajouter les photos après sa création."}</p></div>
      <fieldset disabled={!hydrated || command.pending} className="grid min-w-0 gap-5">
        {step === 0 ? <>
          <div className="grid gap-4 sm:grid-cols-2">{field("reference", "Référence", { required: true, maxLength: 80 })}<div className="grid gap-2"><Label htmlFor="property-category">Type de bien *</Label><NativeSelect id="property-category" value={category} onChange={event => chooseCategory(event.target.value as Category)}>{Object.entries(categoryLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect></div><div className="sm:col-span-2">{field("marketing_name", "Titre de l’annonce (facultatif)", { maxLength: 50 })}</div></div>
          <div><Label id="property-market-label">Type d’offre *</Label><RadioGroup aria-labelledby="property-market-label" value={values.market} onValueChange={value => chooseMarket(value as Market)} className="mt-3 grid gap-2 sm:grid-cols-3">{(Object.entries(kindLabels) as [Market, string][]).filter(([key]) => key !== "holiday" || holidayCategories.has(category)).filter(([key]) => key !== "sale" || category !== "room").map(([key, label]) => <label key={key} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border bg-card px-3 py-2 text-sm"><RadioGroupItem value={key} />{label}</label>)}</RadioGroup></div>
          <div className="grid gap-4 sm:grid-cols-2">{field("price_mad", "Prix en MAD", { required: true, type: "number", hint: "Le prix crée une offre brouillon, sans publication automatique." })}{values.market !== "sale" ? <div className="grid gap-2"><Label htmlFor="property-period">Période *</Label><NativeSelect id="property-period" value={values.period} onChange={event => setValues(previous => ({ ...previous, period: event.target.value as Values["period"] }))}>{(values.market === "holiday" ? [["day", "Par jour"], ["week", "Par semaine"], ["month", "Par mois"]] : [["month", "Par mois"], ["year", "Par an"]]).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect></div> : null}</div>
        </> : null}
        {step === 1 ? <div className="grid gap-4 sm:grid-cols-2">{field("region", "Région", { required: true, maxLength: 120 })}{field("city", "Ville", { required: true, maxLength: 120 })}{field("district", "Arrondissement", { maxLength: 120 })}{field("neighborhood", "Quartier", { maxLength: 120 })}<div className="sm:col-span-2">{field("address", "Adresse précise (facultative)", { maxLength: 500 })}</div><div className="sm:col-span-2">{field("location", "Repère ou localisation courte (facultatif)", { maxLength: 500 })}</div><div className="sm:col-span-2">{field("google_maps_url", "Lien Google Maps (facultatif)", { type: "url", maxLength: 2048, hint: "Collez un lien https://maps.google.com, https://www.google.com/maps ou https://maps.app.goo.gl." })}</div></div> : null}
        {step === 2 ? <div className="grid gap-4 sm:grid-cols-2">{field("area_sqm", category === "land" ? "Surface du terrain en m²" : "Surface en m²", { required: true, type: "number" })}{plotCategories.has(category) ? field("plot_area_sqm", "Surface de la parcelle en m²", { type: "number" }) : null}{category !== "land" && category !== "farm" ? select("condition", "État du bien", conditionOptions) : null}{hasRooms(category) ? <>{field("rooms", "Nombre de pièces", { required: true, type: "number" })}{field("bedrooms", "Chambres", { required: true, type: "number" })}</> : null}{category !== "land" && category !== "farm" ? field("bathrooms", "Salles de bain", { required: true, type: "number" }) : null}{values.market === "holiday" ? <>{field("capacity", "Capacité d’accueil", { required: true, type: "number" })}{field("minimum_nights", "Séjour minimum (nuits)", { required: true, type: "number" })}</> : null}{category !== "land" && category !== "farm" ? <>{select("age_band", "Ancienneté", ageOptions)}{select("floor_type", "Revêtement du sol", floorOptions)}</> : null}{floorCategories.has(category) ? field("unit_floor", "Étage (0 à 20)", { type: "number" }) : null}{buildingCategories.has(category) ? field("building_floors", "Étages du bâtiment (1 à 4)", { type: "number" }) : null}{residential.has(category) && category !== "room" ? select("orientation", "Orientation", orientationOptions) : null}{category === "land" ? <>{select("land_delivery", "Livraison du terrain", { planned: "Prévue", titled: "Titré" })}{select("land_status", "Statut du terrain", { subdivided: "Lotissement", not_subdivided: "Non loti" })}</> : null}</div> : null}
        {step === 3 ? <><div><p className="text-sm font-medium">Équipements et atouts</p>{options.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{options.map(([key, label]) => <label key={key} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border bg-card px-3 py-2 text-sm"><Checkbox checked={values.amenities.includes(key as keyof typeof amenityLabels)} onCheckedChange={checked => setValues(previous => ({ ...previous, amenities: checked ? [...previous.amenities, key as keyof typeof amenityLabels] : previous.amenities.filter(option => option !== key) }))} />{label}</label>)}</div> : <p className="mt-2 text-sm text-muted-foreground">Aucun équipement applicable à ce type de terrain.</p>}</div><div className="grid gap-4 sm:grid-cols-3">{values.amenities.includes("garden") ? field("garden_area_sqm", "Surface du jardin en m²", { required: true, type: "number" }) : null}{values.amenities.includes("terrace") ? field("terrace_area_sqm", "Surface de la terrasse en m²", { required: true, type: "number" }) : null}{values.amenities.includes("garage") ? field("garage_spaces", "Places de garage", { required: true, type: "number" }) : null}</div><div className="grid gap-2"><Label htmlFor="property-description">Description (facultative)</Label><Textarea id="property-description" value={values.description} onChange={event => set("description", event.target.value)} maxLength={5000} rows={5} /><p className="text-xs text-muted-foreground">{values.description.length} / 5 000 caractères. N’ajoutez pas de coordonnées privées.</p></div></> : null}
        {step === 4 ? <InventoryDraftSummary icon={PropertyIcon} title="Bien et offre à créer" facts={facts} onlyFilled wide next="L’offre restera en brouillon. Les photos (jusqu’à 10, converties en WebP), les propriétaires et les documents se gèrent ensuite depuis la fiche." /> : null}
      </fieldset>
      {error ? <p role="alert" className="text-danger">{error}</p> : null}<InventoryError error={command.error} />
      <div role="group" aria-label="Navigation du formulaire" className="flex flex-wrap gap-2 border-t pt-4">{step > 0 ? <Button action="back" type="button" variant="outline" disabled={command.pending} onClick={() => focus(step - 1)}>Précédent</Button> : null}{step < 4 ? <Button key="next" action="forward" type="button" variant="creation" disabled={!hydrated || command.pending} onClick={event => { event.preventDefault(); if (validate(step)) focus(step + 1); }}>Suivant</Button> : <Button key="create" action="create" type="submit" disabled={!hydrated || command.pending}>{command.pending ? "Enregistrement…" : "Créer le bien"}</Button>}<Button action="cancel" variant="outline" asChild><Link href="/projects">Annuler</Link></Button></div>
    </div>
  </form>;
}
