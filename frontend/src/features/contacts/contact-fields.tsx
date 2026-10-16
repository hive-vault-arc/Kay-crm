"use client";
import { PhoneIcon, EmailIcon } from "@/components/icons";
import { SectionHeading } from "@/components/shared/section-heading";
import { useId } from "react";
import { useFieldArray, useWatch, type UseFormReturn } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { roleLabels, type ContactFields as Values } from "./contracts";

export const blankContact: Values = { name: "", type: "person", phones: [{ number: "", label: "", is_primary: true }], emails: [], roles: [] };
export function ContactFields({ form }: { form: UseFormReturn<Values> }) {
  const groupId = useId();
  const phones = useFieldArray({ control: form.control, name: "phones" });
  const emails = useFieldArray({ control: form.control, name: "emails" });
  const selectedPhones = useWatch({ control: form.control, name: "phones" });
  const selectedEmails = useWatch({ control: form.control, name: "emails" });
  function primary(kind: "phones" | "emails", index: number) {
    form.getValues(kind).forEach((_, item) => form.setValue(`${kind}.${item}.is_primary`, item === index, { shouldDirty: true }));
  }
  function remove(kind: "phones" | "emails", index: number) {
    const remaining = form.getValues(kind).filter((_, item) => item !== index);
    if (remaining.length && !remaining.some(value => value.is_primary)) remaining[0].is_primary = true;
    if (kind === "phones") phones.replace(remaining as Values["phones"]); else emails.replace(remaining as Values["emails"]);
  }
  return <div className="grid min-w-0 gap-6">
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>Nom du contact</FormLabel><FormControl><Input {...field} maxLength={160} autoComplete="name" /></FormControl><FormMessage /></FormItem>} />
      <FormField control={form.control} name="type" render={({ field }) => <FormItem><FormLabel>Type de contact</FormLabel><FormControl><NativeSelect {...field}><option value="person">Personne</option><option value="organization">Organisation</option></NativeSelect></FormControl><FormMessage /></FormItem>} />
    </div>
    <fieldset className="grid min-w-0 gap-4"><legend className="mb-4"><SectionHeading as="span" icon={PhoneIcon} tone="teal">Téléphones</SectionHeading></legend>
      <p className="text-sm text-muted-foreground" id={`${groupId}-phone-help`}>Indicatif international obligatoire : +212, +33, +1… Le préfixe 00 est aussi accepté. Choisissez un seul numéro principal.</p>
      <RadioGroup aria-label="Téléphone principal" value={String(selectedPhones.findIndex(value => value.is_primary))} onValueChange={value => primary("phones", Number(value))}>
        {phones.fields.map((phone, index) => <div key={phone.id} className="grid min-w-0 gap-2 border-b pb-4">
          <div className="grid gap-4 sm:grid-cols-2"><FormField control={form.control} name={`phones.${index}.number`} render={({ field }) => <FormItem><FormLabel>Téléphone international {index + 1}</FormLabel><FormControl descriptionId={`${groupId}-phone-help`}><Input {...field} type="tel" inputMode="tel" autoComplete="tel" maxLength={48} /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name={`phones.${index}.label`} render={({ field }) => <FormItem><FormLabel>Libellé téléphone {index + 1}</FormLabel><FormControl><Input {...field} maxLength={40} placeholder="Mobile, bureau…" /></FormControl><FormMessage /></FormItem>} /></div>
          <div className="flex flex-wrap items-center gap-4"><Label className="flex min-h-control cursor-pointer items-center gap-2" htmlFor={`${groupId}-phone-${index}`}><RadioGroupItem id={`${groupId}-phone-${index}`} value={String(index)} />Principal {index + 1}</Label>{phones.fields.length > 1 ? <Button type="button" variant="outline" onClick={() => remove("phones", index)} aria-label={`Retirer le téléphone ${index + 1}`}>Retirer</Button> : null}</div>
        </div>)}
      </RadioGroup>
      {form.formState.errors.phones?.root?.message || form.formState.errors.phones?.message ? <p role="alert" className="text-danger">{form.formState.errors.phones.root?.message ?? form.formState.errors.phones.message}</p> : null}
      <Button type="button" variant="outline" className="justify-self-start" disabled={phones.fields.length >= 10} onClick={() => phones.append({ number: "", label: "", is_primary: false })}>Ajouter un téléphone</Button>
    </fieldset>
    <fieldset className="grid min-w-0 gap-4"><legend className="mb-4"><SectionHeading as="span" icon={EmailIcon} tone="purple">E-mails (facultatif)</SectionHeading></legend>
      {emails.fields.length ? <RadioGroup aria-label="E-mail principal" value={String(selectedEmails.findIndex(value => value.is_primary))} onValueChange={value => primary("emails", Number(value))}>
        {emails.fields.map((email, index) => <div key={email.id} className="grid min-w-0 gap-2 border-b pb-4"><div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name={`emails.${index}.email`} render={({ field }) => <FormItem><FormLabel>E-mail {index + 1}</FormLabel><FormControl><Input {...field} type="email" autoComplete="email" maxLength={254} autoCapitalize="none" /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name={`emails.${index}.label`} render={({ field }) => <FormItem><FormLabel>Libellé e-mail {index + 1}</FormLabel><FormControl><Input {...field} maxLength={40} /></FormControl><FormMessage /></FormItem>} /></div>
          <div className="flex flex-wrap items-center gap-4"><Label htmlFor={`${groupId}-email-${index}`} className="flex min-h-control cursor-pointer items-center gap-2"><RadioGroupItem id={`${groupId}-email-${index}`} value={String(index)} />Principal {index + 1}</Label><Button type="button" variant="outline" onClick={() => remove("emails", index)} aria-label={`Retirer l’e-mail ${index + 1}`}>Retirer</Button></div>
        </div>)}
      </RadioGroup> : <p className="text-sm text-muted-foreground">Aucun e-mail renseigné.</p>}
      <Button type="button" variant="outline" className="justify-self-start" disabled={emails.fields.length >= 10} onClick={() => emails.append({ email: "", label: "", is_primary: !emails.fields.length })}>Ajouter un e-mail</Button>
    </fieldset>
    <FormField control={form.control} name="roles" render={({ field }) => <fieldset className="grid gap-2"><legend className="mb-2 font-medium">Rôles du contact</legend><p className="text-sm text-muted-foreground">Plusieurs choix possibles. Ils ne donnent aucun droit d’accès au personnel.</p><div className="flex flex-wrap gap-x-6 gap-y-2">{Object.entries(roleLabels).map(([value, label]) => <Label key={value} className="flex min-h-control cursor-pointer items-center gap-2"><Checkbox checked={field.value.includes(value as Values["roles"][number])} onCheckedChange={checked => field.onChange(checked ? [...field.value, value] : field.value.filter(role => role !== value))} />{label}</Label>)}</div><FormMessage /></fieldset>} />
  </div>;
}
