"use client";
import { DevelopmentIcon } from "@/components/icons";
import { SectionHeading } from "@/components/shared/section-heading";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ContactSelector } from "@/features/contacts/contact-selector";
import { useHydrated } from "@/hooks/use-hydrated";
import { categoryLabels } from "./contracts";
import { developmentFieldsSchema, type Development } from "./development-contracts";
import { InventoryError } from "./states";
import { useInventoryCommand } from "./use-command";

type Values = { reference: string; name: string; category: Development["category"]; location: string; briefing_text: string; developer_marketing_display: string };
export function DevelopmentEditor({ development }: { development?: Development }) {
  const router = useRouter(); const hydrated = useHydrated(); const command = useInventoryCommand();
  const [version, setVersion] = useState(development?.version ?? 1);
  const [developer, setDeveloper] = useState(development?.developer.contact ?? null);
  const [notice, setNotice] = useState("");
  const form = useForm<Values>({ defaultValues: { reference: development?.reference ?? "", name: development?.name ?? "", category: development?.category ?? "mixed", location: development?.location ?? "", briefing_text: development?.briefing_text ?? "", developer_marketing_display: development?.developer.marketing_display ?? "" } });
  async function save(values: Values) {
    form.clearErrors();
    const parsed = developmentFieldsSchema.safeParse({ ...values, location: values.location.trim() || null, briefing_text: values.briefing_text.trim() || null, developer_contact_id: developer?.id ?? null, developer_marketing_display: values.developer_marketing_display.trim() || null });
    if (!parsed.success) { setNotice("Vérifiez les champs : référence et nom obligatoires, présentation de 10 000 caractères maximum."); const fields = parsed.error.issues.map(issue => issue.path[0]).filter((key): key is keyof Values => typeof key === "string" && ["reference", "name", "category", "location", "briefing_text", "developer_marketing_display"].includes(key)); fields.forEach(key => form.setError(key, { type: "validate" })); form.setFocus(fields[0] ?? "reference"); return; }
    setNotice(""); await command.submit(development ? `/api/v1/developments/${development.id}` : "/api/v1/developments", { ...parsed.data, ...(development ? { expected_version: version } : {}) }, development ? "PATCH" : "POST", id => router.push(`/projects/${id}`));
  }
  return <form className="form-surface grid min-w-0 max-w-reading gap-6" noValidate aria-label={development ? "Modifier le programme" : "Créer un programme"} aria-busy={command.pending} onSubmit={event => void form.handleSubmit(save)(event)}>
    <SectionHeading icon={DevelopmentIcon}>Identité du programme</SectionHeading>
    <p>Un brouillon peut rester incomplet. La présentation est partagée avec toute l’équipe et ne remplace pas les propriétaires légaux.</p>
    <fieldset disabled={!hydrated || command.pending} className="grid min-w-0 gap-4 sm:grid-cols-2">
      <div className="grid gap-2"><Label htmlFor="development-reference">Référence du programme</Label><Input id="development-reference" maxLength={80} required aria-invalid={Boolean(form.formState.errors.reference)} aria-describedby={form.formState.errors.reference ? "development-validation" : undefined} {...form.register("reference")} /></div>
      <div className="grid gap-2"><Label htmlFor="development-name">Nom du programme</Label><Input id="development-name" maxLength={160} required aria-invalid={Boolean(form.formState.errors.name)} aria-describedby={form.formState.errors.name ? "development-validation" : undefined} {...form.register("name")} /></div>
      <div className="grid gap-2"><Label htmlFor="development-category">Catégorie du programme</Label><NativeSelect id="development-category" {...form.register("category")}><option value="mixed">Mixte</option>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div>
      <div className="grid gap-2 sm:col-span-2"><Label htmlFor="development-location">Localisation du programme (facultative)</Label><Input id="development-location" maxLength={500} aria-invalid={Boolean(form.formState.errors.location)} aria-describedby={form.formState.errors.location ? "development-validation" : undefined} {...form.register("location")} /></div>
      <div className="grid gap-2 sm:col-span-2"><Label htmlFor="development-briefing">Présentation partagée (facultative)</Label><Textarea id="development-briefing" rows={7} aria-invalid={Boolean(form.formState.errors.briefing_text)} aria-describedby="briefing-help development-validation" {...form.register("briefing_text")} /><p id="briefing-help" className="text-sm text-muted-foreground">Texte simple, 10 000 caractères maximum. Aucune coordonnée, note ou pièce privée. Laissez vide pour effacer la présentation.</p></div>
      <div className="grid min-w-0 gap-4 sm:col-span-2"><h2 className="font-medium">Promoteur (facultatif)</h2>{developer ? <><p className="wrap-anywhere">Contact protégé : {developer.name}</p><Button type="button" variant="outline" className="justify-self-start" onClick={() => setDeveloper(null)}>Dissocier le promoteur</Button></> : <ContactSelector choose={setDeveloper} />}<Label htmlFor="developer-display">Libellé commercial du promoteur (facultatif)</Label><Input id="developer-display" maxLength={160} aria-invalid={Boolean(form.formState.errors.developer_marketing_display)} aria-describedby={form.formState.errors.developer_marketing_display ? "development-validation" : undefined} {...form.register("developer_marketing_display")} /><p className="text-sm text-muted-foreground">Le nom privé n’est jamais copié automatiquement dans ce libellé partagé. Le promoteur n’est pas automatiquement propriétaire.</p></div>
    </fieldset>
    <p id="development-validation" role={notice ? "alert" : undefined} className="text-danger">{notice}</p>
    <InventoryError level="development" error={command.error} id={development?.id} choose={current => { setVersion(current.version); command.clear(); }} />
    <div className="flex flex-wrap gap-2"><Button type="submit" disabled={!hydrated || command.pending}>{command.pending ? "Enregistrement…" : "Enregistrer le programme"}</Button><Button variant="outline" asChild><Link href={development ? `/projects/${development.id}` : "/projects"}>Annuler</Link></Button></div>
  </form>;
}
