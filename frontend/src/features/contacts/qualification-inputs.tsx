"use client";

import { forwardRef, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { QualificationMetadata } from "./qualification-contracts";

const countryNames = new Intl.DisplayNames(["fr"], { type: "region" });
export function countryLabel(code: string) { return code ? countryNames.of(code) ?? code : "Non renseigné"; }
export function countryOptions(metadata: QualificationMetadata) {
  return metadata.countries.map(country => ({ ...country, label: countryLabel(country.code) }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));
}

export const InternationalPhoneInput = forwardRef<HTMLInputElement, {
  id?: string; name?: string; value: string; onChange: (value: string) => void; onBlur?: () => void;
  metadata: QualificationMetadata; label: string; "aria-describedby"?: string; "aria-invalid"?: boolean;
}>(function InternationalPhoneInput({ value, onChange, metadata, label, ...props }, ref) {
  const id = useId();
  const countries = countryOptions(metadata);
  const [preferred, setPreferred] = useState(() => [...countries]
    .sort((a, b) => b.calling_code.length - a.calling_code.length)
    .find(country => value.startsWith(country.calling_code))?.code ?? "MA");
  const wanted = countries.find(country => country.code === preferred) ?? countries[0];
  const country = !value || value.startsWith(wanted.calling_code) ? wanted
    : [...countries].sort((a, b) => b.calling_code.length - a.calling_code.length)
      .find(candidate => value.startsWith(candidate.calling_code)) ?? wanted;
  const national = value.startsWith(country.calling_code) ? value.slice(country.calling_code.length) : value;
  function changeNational(raw: string) {
    if (/^(?:\+|00)/.test(raw.trim())) {
      const number = raw.trim().replace(/^00/, "+").replace(/[^\d+]/g, "");
      const inferred = [...countries].sort((a, b) => b.calling_code.length - a.calling_code.length).find(option => number.startsWith(option.calling_code));
      if (inferred) setPreferred(inferred.code);
      onChange(number);
    } else { const digits = raw.replace(/\D/g, ""); setPreferred(country.code); onChange(digits ? `${country.calling_code}${digits}` : ""); }
  }
  return <div className="grid min-w-0 gap-2 sm:grid-cols-2">
    <div className="grid min-w-0 gap-2"><Label htmlFor={`${id}-code`}>Indicatif {label}</Label>
      <NativeSelect id={`${id}-code`} value={country.code} onChange={event => {
        const chosen = countries.find(candidate => candidate.code === event.target.value)!;
        setPreferred(chosen.code); onChange(national ? `${chosen.calling_code}${national}` : "");
      }}>{countries.map(option => <option key={option.code} value={option.code}>{option.label} ({option.calling_code})</option>)}</NativeSelect>
    </div>
    <div className="grid min-w-0 gap-2"><Label htmlFor={props.id ?? `${id}-number`}>{label}</Label>
      <Input {...props} id={props.id ?? `${id}-number`} ref={ref} value={national} onChange={event => changeNational(event.target.value)} type="tel" inputMode="tel" autoComplete="tel-national" maxLength={48} placeholder="Numéro national" />
    </div>
  </div>;
});

export const LanguagePicker = forwardRef<HTMLSelectElement, {
  metadata: QualificationMetadata; value: string[]; onChange: (value: string[]) => void; id: string; onBlur?: () => void; "aria-invalid"?: boolean; "aria-describedby"?: string;
}>(function LanguagePicker({ metadata, value, onChange, id, onBlur, ...accessibility }, ref) {
  const [custom, setCustom] = useState("");
  function add(raw: string) {
    const language = raw.trim().toLowerCase();
    if (!language || language.length > 60 || value.includes(language) || value.length >= 30) return;
    onChange([...value, language]); setCustom("");
  }
  return <div className="grid min-w-0 gap-2">
    <NativeSelect {...accessibility} ref={ref} id={id} value="" onBlur={onBlur} disabled={value.length >= 30} onChange={event => add(event.target.value)}><option value="">Ajouter une langue…</option>{metadata.languages.filter(option => !value.includes(option.value)).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</NativeSelect>
    {value.length ? <ul className="flex flex-wrap gap-2" aria-label="Langues sélectionnées">{value.map(language => <li key={language}><Button action="remove" type="button" size="compact" variant="outline" aria-label={`Retirer ${metadata.languages.find(option => option.value === language)?.label ?? language}`} onClick={() => onChange(value.filter(current => current !== language))}>{metadata.languages.find(option => option.value === language)?.label ?? language}</Button></li>)}</ul> : null}
    <details className="text-sm"><summary className="flex min-h-control cursor-pointer items-center text-link underline">Autre langue</summary>
      <div className="flex min-w-0 flex-wrap items-end gap-2"><div className="grid min-w-0 flex-1 gap-2"><Label htmlFor={`${id}-custom`}>Nom de la langue</Label><Input id={`${id}-custom`} value={custom} maxLength={60} onChange={event => setCustom(event.target.value)} /></div><Button action="add" type="button" variant="outline" disabled={!custom.trim() || value.length >= 30 || value.includes(custom.trim().toLowerCase())} onClick={() => add(custom)}>Ajouter</Button></div>
    </details>
  </div>;
});

export function BudgetInput({ metadata, value, onChange, id, onBlur }: {
  metadata: QualificationMetadata; value: string; onChange: (value: string) => void; id: string; onBlur?: () => void;
}) {
  const [custom, setCustom] = useState(false);
  const band = metadata.budget_bands.some(option => option.value === value);
  const mode = band ? value : custom || value ? "custom" : "";
  return <div className="grid min-w-0 gap-2"><NativeSelect id={id} value={mode} onBlur={onBlur} onChange={event => { setCustom(event.target.value === "custom"); onChange(event.target.value === "custom" ? "" : event.target.value); }}><option value="">Choisir un budget…</option>{metadata.budget_bands.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}<option value="custom">Montant exact en MAD</option></NativeSelect>
    {mode === "custom" ? <><Label htmlFor={`${id}-amount`}>Montant exact (MAD)</Label><Input id={`${id}-amount`} value={value} onBlur={onBlur} onChange={event => onChange(event.target.value)} inputMode="decimal" maxLength={160} placeholder="Ex. 1250000" /></> : null}
  </div>;
}
