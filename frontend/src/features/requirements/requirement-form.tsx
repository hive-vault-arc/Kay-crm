"use client";
import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { CommandError } from "@/features/contacts/record-states";
import { categoryLabels } from "@/features/inventory/contracts";
import { blank, criterionKeys, criterionLabels, detailSchema, fieldsSchema, importanceLabels, resultSchema, type Requirement, type RequirementFields } from "./contracts";
import { RequirementFacts } from "./requirement-facts";

function editable(row?: Requirement): RequirementFields {
  if (!row) return { ...blank, criteria: blank.criteria.map(c => ({ ...c })) };
  return { title: row.title, intent: row.intent, currency: "MAD", budget_min_mad: row.budget_min_mad, budget_max_mad: row.budget_max_mad, budget_period: row.budget_period, criteria: criterionKeys.map(key => row.criteria.find(c => c.key === key) ?? { key, importance: "preferred", value: null }) };
}
export function RequirementForm({ contactId, value, saved, cancel }: { contactId: string; value?: Requirement; saved: (id: string) => Promise<void>; cancel: () => void }) {
  const hydrated = useHydrated();
  const form = useForm<RequirementFields>({ resolver: zodResolver(fieldsSchema), defaultValues: editable(value) });
  const intent = useWatch({ control: form.control, name: "intent" });
  const [version, setVersion] = useState(value?.version);
  const [error, setError] = useState<ApiError>();
  const [current, setCurrent] = useState<Requirement>();
  const attempt = useRef({ key: "", body: "" });
  async function submit(values: RequirementFields) {
    setError(undefined); setCurrent(undefined);
    const body = value ? { ...values, expected_version: version } : { ...values, contact_id: contactId };
    const serialized = JSON.stringify(body);
    if (attempt.current.body !== serialized) attempt.current = { key: crypto.randomUUID(), body: serialized };
    try { const result = await apiCommand(value ? `/api/v1/requirements/${value.id}` : "/api/v1/requirements", body, resultSchema, attempt.current.key, value ? "PATCH" : "POST"); await saved(result.id); }
    catch (reason) {
      const failure = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503);
      setError(failure);
      if (failure.code === "REQUIREMENT_VERSION_CONFLICT" && value) {
        try { setCurrent(await apiGet(`/api/v1/requirements/${value.id}`, detailSchema)); } catch { /* Keep the draft and the original failure when comparison is unavailable. */ }
      }
    }
  }
  return <Form {...form}><form noValidate onSubmit={event => void form.handleSubmit(submit)(event)} className="form-surface grid min-w-0 max-w-reading gap-6" aria-label={value ? "Modifier la recherche" : "Nouvelle recherche"} aria-busy={form.formState.isSubmitting}>
    <fieldset className="grid min-w-0 gap-6" disabled={!hydrated || form.formState.isSubmitting}>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <FormField control={form.control} name="title" render={({ field }) => <FormItem><FormLabel>Nom de la recherche</FormLabel><FormControl><Input {...field} maxLength={160} /></FormControl><FormMessage /></FormItem>} />
        <FormField control={form.control} name="intent" render={({ field }) => <FormItem><FormLabel>Type de recherche</FormLabel><FormControl><NativeSelect {...field} onChange={event => { field.onChange(event); form.setValue("budget_period", event.target.value === "sale" ? null : "month"); }}><option value="sale">Achat</option><option value="rental">Location</option></NativeSelect></FormControl><FormMessage /></FormItem>} />
        {(["budget_min_mad", "budget_max_mad"] as const).map(name => <FormField key={name} control={form.control} name={name} render={({ field }) => <FormItem><FormLabel>{name === "budget_min_mad" ? "Budget minimum (MAD)" : "Budget maximum (MAD)"}</FormLabel><FormControl><Input {...field} value={field.value ?? ""} onChange={event => field.onChange(event.target.value === "" ? null : event.target.value.replace(",", "."))} inputMode="decimal" maxLength={19} /></FormControl><FormMessage /></FormItem>} />)}
        {intent === "rental" ? <FormField control={form.control} name="budget_period" render={({ field }) => <FormItem><FormLabel>Période du budget</FormLabel><FormControl><NativeSelect {...field} value={field.value ?? "month"}><option value="month">Par mois</option><option value="year">Par an</option></NativeSelect></FormControl><FormMessage /></FormItem>} /> : null}
      </div>
      <p className="text-sm text-muted-foreground">Vide signifie non renseigné, pas zéro. Montants en MAD, virgule ou point et deux décimales au maximum. La comparaison locative utilise exactement douze mois ; les conditions d’origine sont conservées.</p>
      <section className="grid min-w-0 gap-4" aria-label="Critères de recherche"><h3 className="font-medium">Critères obligatoires et souhaités</h3>
        {criterionKeys.map((key, index) => <div key={key} className="grid min-w-0 gap-4 border-t pt-4 sm:grid-cols-2">
          <FormField control={form.control} name={`criteria.${index}.value`} render={({ field }) => <FormItem><FormLabel>{criterionLabels[key]}</FormLabel><FormControl>{key === "parking" || key === "elevator" ? <NativeSelect {...field} value={field.value === null ? "unknown" : String(field.value)} onChange={event => field.onChange(event.target.value === "unknown" ? null : event.target.value === "true")}><option value="unknown">Non renseigné</option><option value="true">Oui</option><option value="false">Non</option></NativeSelect> : key === "category" ? <NativeSelect {...field} value={String(field.value ?? "")} onChange={event => field.onChange(event.target.value || null)}><option value="">Non renseignée</option>{Object.entries(categoryLabels).map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}</NativeSelect> : <Input {...field} value={String(field.value ?? "")} inputMode={key === "rooms" ? "numeric" : key === "area_sqm" ? "decimal" : "text"} maxLength={key === "location" ? 500 : 19} onChange={event => field.onChange(event.target.value === "" ? null : key === "rooms" && /^\d+$/.test(event.target.value) ? Number(event.target.value) : key === "area_sqm" ? event.target.value.replace(",", ".") : event.target.value)} />}</FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name={`criteria.${index}.importance`} render={({ field }) => <FormItem><FormLabel>Importance : {criterionLabels[key]}</FormLabel><FormControl><NativeSelect {...field}>{Object.entries(importanceLabels).map(([importance, label]) => <option key={importance} value={importance}>{label}</option>)}</NativeSelect></FormControl><FormMessage /></FormItem>} />
        </div>)}
      </section>
    </fieldset>
    <CommandError error={error} dismiss={() => setError(undefined)} />
    {error?.code === "DEPENDENCY_UNAVAILABLE" || error?.code === "INVALID_RESPONSE" ? <p>La réponse n’a pas été confirmée. Votre saisie reste ici ; réessayez sans la modifier pour récupérer la même tentative.</p> : null}
    {current ? <section className="grid min-w-0 gap-4 border-t pt-4" aria-label="Comparaison de la recherche"><h3 className="font-medium">Version actuelle {current.version}</h3><RequirementFacts value={current} /><p>Votre saisie est conservée. Comparez-la avant de choisir une nouvelle tentative.</p><div className="flex flex-wrap gap-2"><Button action="refresh" type="button" variant="outline" className="h-auto min-h-control whitespace-normal text-left" onClick={() => { form.reset(editable(current)); setVersion(current.version); setCurrent(undefined); setError(undefined); form.setFocus("title"); }}>Charger la version actuelle</Button><Button action="compare" type="button" variant="outline" className="h-auto min-h-control whitespace-normal text-left" onClick={() => { setVersion(current.version); setCurrent(undefined); setError(undefined); form.setFocus("title"); }}>Conserver ma saisie sur cette version</Button></div></section> : null}
    <div className="flex flex-wrap gap-2"><Button action="save" type="submit" disabled={!hydrated || form.formState.isSubmitting}>{form.formState.isSubmitting ? "Enregistrement…" : "Enregistrer la recherche"}</Button><Button action="cancel" type="button" variant="outline" disabled={form.formState.isSubmitting} onClick={cancel}>Annuler</Button></div>
  </form></Form>;
}
