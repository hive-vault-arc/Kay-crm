"use client";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { qualificationMetadataSchema } from "./qualification-contracts";
import { countryOptions } from "./qualification-inputs";
import { RecordError } from "./record-states";
import { useQuery } from "./use-query";

export function DirectoryCountryFilter({ id, value, change }: { id: string; value: string; change: (value: string) => void }) {
  const metadata = useQuery("/api/v1/contacts/metadata", qualificationMetadataSchema);
  return <div className="grid gap-2"><Label htmlFor={id}>Pays de résidence</Label><NativeSelect id={id} value={value} disabled={!metadata.value} onChange={event => change(event.target.value)}><option value="">Tous les pays</option>{metadata.value ? countryOptions(metadata.value).map(country => <option key={country.code} value={country.code}>{country.label}</option>) : null}</NativeSelect>{metadata.error ? <RecordError error={metadata.error} retry={metadata.refresh} /> : null}</div>;
}
