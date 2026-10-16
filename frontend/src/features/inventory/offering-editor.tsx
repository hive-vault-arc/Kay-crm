"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useHydrated } from "@/hooks/use-hydrated";
import { confirmSchema, editOfferingSchema, kindLabels, newOfferingSchema, type Offering, type InventoryTarget } from "./contracts";
import { InventoryError } from "./states";
import { useInventoryCommand } from "./use-command";

type Values = { price: string; period: "month" | "year"; conditions: string; state: Offering["state"]; reason: string };
export function OfferingEditor({ property, kind, offering, saved, cancel }: { property: InventoryTarget; kind: Offering["kind"]; offering?: Offering; saved: () => void; cancel: () => void }) {
  const form = useForm<Values>({ defaultValues: { price: offering?.price_mad ?? "", period: offering?.price_period ?? "month", conditions: offering?.conditions ?? "", state: offering?.state ?? "draft", reason: "" } });
  const [version, setVersion] = useState({ property: property.version, offering: offering?.version ?? 1 });
  const [validation, setValidation] = useState("");
  const command = useInventoryCommand();
  const hydrated = useHydrated();
  const { setFocus } = form;
  useEffect(() => { setFocus("price"); }, [setFocus]);
  async function save(values: Values) {
    form.clearErrors();
    const common = { price_mad: values.price.trim().replace(",", ".") || null, currency: "MAD", price_period: kind === "rental" ? values.period : null, conditions: values.conditions };
    const body = offering ? editOfferingSchema.safeParse({ ...common, ...(property.inventoryLevel === "development" ? { expected_development_version: version.property } : { expected_property_version: version.property }), expected_version: version.offering, state: values.state, reason: values.reason }) : newOfferingSchema.safeParse({ ...common, ...(property.inventoryLevel === "development" ? { development_id: property.id } : { property_id: property.id }), ...(property.inventoryLevel === "development" ? { expected_development_version: version.property } : { expected_property_version: version.property }), kind });
    if (!body.success) { setValidation("Prix positif avec deux décimales maximum, ou vide si inconnu. Renseignez un motif pour une modification (1 000 caractères maximum)."); const fields = body.error.issues.map(issue => issue.path[0] === "price_mad" ? "price" : issue.path[0] === "price_period" ? "period" : issue.path[0]).filter((field): field is keyof Values => typeof field === "string" && ["price", "period", "conditions", "state", "reason"].includes(field)); fields.forEach(field => form.setError(field, { type: "validate" })); form.setFocus(fields[0] ?? "price"); return; }
    setValidation("");
    await command.submit(offering ? `/api/v1/offerings/${offering.id}` : "/api/v1/offerings", body.data, offering ? "PATCH" : "POST", saved);
  }
  const prefix = `${kind}-edit`;
  return <form noValidate className="form-surface grid min-w-0 max-w-reading gap-6" aria-label={`${offering ? "Modifier" : "Créer"} la campagne ${kindLabels[kind].toLowerCase()}`} onSubmit={event => void form.handleSubmit(save)(event)} aria-busy={command.pending}>
    <fieldset className="grid min-w-0 gap-4 sm:grid-cols-2" disabled={!hydrated || command.pending}>
      <div className="grid gap-2"><Label htmlFor={`${prefix}-price`}>Prix {kind === "sale" ? "de vente" : "de location"} en MAD (facultatif)</Label><Input id={`${prefix}-price`} aria-invalid={Boolean(form.formState.errors.price)} aria-describedby={form.formState.errors.price ? `${prefix}-validation` : undefined} inputMode="decimal" maxLength={19} {...form.register("price")} /></div>
      {kind === "rental" ? <div className="grid gap-2"><Label htmlFor={`${prefix}-period`}>Période du loyer d’origine</Label><NativeSelect id={`${prefix}-period`} {...form.register("period")}><option value="month">Par mois</option><option value="year">Par an</option></NativeSelect></div> : null}
      <div className="grid gap-2 sm:col-span-2"><Label htmlFor={`${prefix}-conditions`}>Conditions d’origine (facultatives)</Label><Textarea id={`${prefix}-conditions`} aria-invalid={Boolean(form.formState.errors.conditions)} aria-describedby={form.formState.errors.conditions ? `${prefix}-validation` : undefined} maxLength={2000} {...form.register("conditions")} /></div>
      {offering ? <><div className="grid gap-2"><Label htmlFor={`${prefix}-state`}>Statut de la campagne</Label><NativeSelect id={`${prefix}-state`} {...form.register("state")}><option value="draft">Brouillon</option>{offering.state === "available" ? <option value="available">Disponible</option> : null}<option value="withdrawn">Retirée</option></NativeSelect></div><div className="grid gap-2 sm:col-span-2"><Label htmlFor={`${prefix}-reason`}>Motif de la modification de l’offre</Label><Textarea id={`${prefix}-reason`} required maxLength={1000} {...form.register("reason")} /></div></> : null}
    </fieldset>
    <p className="text-sm text-muted-foreground">Prix et conditions partagés avec l’équipe. Un brouillon peut rester incomplet. La disponibilité exige un prix positif et au moins un propriétaire légal. Une campagne retirée reste dans l’historique ; son remplacement est une nouvelle campagne.</p>
    {validation ? <p id={`${prefix}-validation`} role="alert" className="text-danger">{validation}</p> : null}
    <InventoryError error={command.error} level={property.inventoryLevel} id={property.id} choose={current => { const active = current.offerings.find(item => item.id === offering?.id); setVersion({ property: current.version, offering: active?.version ?? version.offering }); command.clear(); }} />
    <div className="flex flex-wrap gap-2"><Button action={offering ? "save" : "create"} type="submit" disabled={!hydrated || command.pending}>{command.pending ? "Enregistrement…" : offering ? "Enregistrer la campagne" : "Créer la campagne"}</Button><Button action="cancel" disabled={command.pending} type="button" variant="outline" onClick={cancel}>Annuler la campagne</Button></div>
  </form>;
}

export function Availability({ property, offering, saved }: { property: InventoryTarget; offering: Offering; saved: () => void }) {
  const [reason, setReason] = useState("");
  const [version, setVersion] = useState({ property: property.version, offering: offering.version });
  const [invalid, setInvalid] = useState(false);
  const command = useInventoryCommand();
  const hydrated = useHydrated();
  function save(event: React.FormEvent) {
    event.preventDefault();
    const parsed = confirmSchema.safeParse({ expected_version: version.property, offering_id: offering.id, expected_offering_version: version.offering, reason });
    if (!parsed.success) { setInvalid(true); return; }
    setInvalid(false);
    void command.submit(`/api/v1/${property.inventoryLevel === "development" ? "developments" : "properties"}/${property.id}/confirm-availability`, parsed.data, "POST", saved);
  }
  return <form noValidate className="grid min-w-0 max-w-reading gap-4" aria-label={`Disponibilité ${kindLabels[offering.kind].toLowerCase()}`} onSubmit={save} aria-busy={command.pending}><div className="grid gap-2"><Label htmlFor={`${offering.kind}-confirm`}>Motif de la confirmation de disponibilité</Label><Textarea id={`${offering.kind}-confirm`} value={reason} required maxLength={1000} disabled={!hydrated || command.pending} onChange={event => setReason(event.target.value)} /></div>{invalid ? <p role="alert" className="text-danger">Saisissez le motif de votre vérification.</p> : null}<InventoryError error={command.error} level={property.inventoryLevel} id={property.id} choose={current => { const active = current.offerings.find(item => item.id === offering.id); setVersion({ property: current.version, offering: active?.version ?? version.offering }); command.clear(); }} /><Button action="confirm" disabled={!hydrated || command.pending} className="h-auto min-h-control justify-self-start whitespace-normal text-left" type="submit" variant="outline">{command.pending ? "Confirmation…" : offering.state === "available" ? "Reconfirmer la disponibilité" : "Confirmer la disponibilité"}</Button></form>;
}
