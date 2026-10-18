"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { apiCommand } from "@/lib/api/command";
import { ApiError } from "@/lib/api/client";
import { useHydrated } from "@/hooks/use-hydrated";
import type { Enquiry } from "@/features/contacts/contracts";
import { BudgetInput } from "@/features/contacts/qualification-inputs";
import { qualificationMetadataSchema, type QualificationMetadata } from "@/features/contacts/qualification-contracts";
import { useQuery } from "@/features/contacts/use-query";
import { RecordError, CommandError } from "@/features/contacts/record-states";
import { resultSchema } from "./contracts";
import { convertLeadSchema } from "./qualification-contracts";
import { ProjectPicker, type ProjectSelection } from "./project-picker";

export function ConvertLead({ enquiry, onRefresh }: { enquiry: Enquiry; onRefresh?: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const hydrated = useHydrated();
  if (enquiry.converted_deal_id) return <Button action="show" asChild><Link href={`/deals/${enquiry.converted_deal_id}`}>Ouvrir l’affaire</Link></Button>;
  return <AlertDialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
    <AlertDialogTrigger asChild><Button action="create" disabled={!hydrated || Boolean(enquiry.contact.archived_at)}>Convertir en affaire</Button></AlertDialogTrigger>
    <AlertDialogContent onEscapeKeyDown={event => { if (busy) event.preventDefault(); }}><AlertDialogTitle>Convertir le prospect en affaire</AlertDialogTitle><AlertDialogDescription>{enquiry.contact.name}. Confirmez le projet, le budget et le motif d’achat. Les coordonnées et la source seront conservées.</AlertDialogDescription>
      {open ? <ConversionBody enquiry={enquiry} busyChanged={setBusy} onRefresh={onRefresh} /> : null}
    </AlertDialogContent>
  </AlertDialog>;
}
function ConversionBody({ enquiry, busyChanged, onRefresh }: { enquiry: Enquiry; busyChanged: (value: boolean) => void; onRefresh?: () => void }) {
  const metadata = useQuery("/api/v1/contacts/metadata", qualificationMetadataSchema);
  return metadata.error ? <><RecordError error={metadata.error} retry={metadata.refresh} /><AlertDialogCancel asChild><Button action="cancel" variant="outline">Fermer</Button></AlertDialogCancel></> : metadata.value ? <ConversionForm enquiry={enquiry} metadata={metadata.value} busyChanged={busyChanged} onRefresh={onRefresh} /> : <><p role="status">Chargement des champs de conversion…</p><AlertDialogCancel asChild><Button action="cancel" type="button" variant="outline">Annuler</Button></AlertDialogCancel></>;
}
function ConversionForm({ enquiry, metadata, busyChanged, onRefresh }: { enquiry: Enquiry; metadata: QualificationMetadata; busyChanged: (value: boolean) => void; onRefresh?: () => void }) {
  const id = useId(), router = useRouter();
  const [project, setProject] = useState<ProjectSelection>();
  const [budget, setBudget] = useState(enquiry.initial_budget ?? "");
  const [reasons, setReasons] = useState<string[]>([]);
  const [error, setError] = useState<ApiError>();
  const [validation, setValidation] = useState("");
  const [busy, setBusy] = useState(false);
  const attempt = useRef({ body: "", key: "" });
  async function convert(event: React.FormEvent) {
    event.preventDefault(); if (busy) return;
    setError(undefined); setValidation("");
    const parsed = convertLeadSchema.safeParse({ expected_version: enquiry.version, project: project?.choice, initial_budget: budget, purchase_reasons: reasons });
    if (!parsed.success) { setValidation("Choisissez un projet, un budget et au moins un motif d’achat."); return; }
    const fingerprint = JSON.stringify(parsed.data);
    if (attempt.current.body !== fingerprint) attempt.current = { body: fingerprint, key: crypto.randomUUID() };
    setBusy(true); busyChanged(true);
    try { const result = await apiCommand(`/api/v1/enquiries/${enquiry.id}/convert`, parsed.data, resultSchema, attempt.current.key); router.push(`/deals/${result.id}`); }
    catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); setBusy(false); busyChanged(false); }
  }
  return <form noValidate onSubmit={event => void convert(event)} className="grid min-w-0 gap-4" aria-busy={busy}>
    <fieldset disabled={busy} className="grid min-w-0 gap-4"><ProjectPicker selected={project} choose={choice => { setProject(choice); setValidation(""); }} />
      <div className="grid gap-2"><Label htmlFor={`${id}-budget`}>Budget *</Label><BudgetInput id={`${id}-budget`} value={budget} metadata={metadata} onChange={value => { setBudget(value); setValidation(""); }} /></div>
      <fieldset className="grid gap-2"><legend className="mb-2 font-medium">Motif d’achat *</legend><div className="grid gap-1 sm:grid-cols-2">{metadata.purchase_reasons.map(reason => <Label key={reason.value} className="flex min-h-control cursor-pointer items-center gap-2"><Checkbox checked={reasons.includes(reason.value)} onCheckedChange={checked => { setReasons(current => checked ? [...current, reason.value] : current.filter(value => value !== reason.value)); setValidation(""); }} />{reason.label}</Label>)}</div></fieldset>
    </fieldset>
    {!enquiry.contact.languages.length ? <p className="text-warning">Renseignez d’abord les langues dans <Link href={`/leads/${enquiry.id}/edit`} className="text-link underline">la fiche du prospect</Link>.</p> : null}
    {validation ? <p role="alert" className="text-danger">{validation}</p> : null}<CommandError error={error} dismiss={() => setError(undefined)} />
    {error?.code === "VERSION_CONFLICT" && onRefresh ? <Button action="refresh" type="button" variant="outline" onClick={onRefresh}>Actualiser le prospect avant de reprendre</Button> : null}
    <div className="flex flex-wrap justify-end gap-2"><AlertDialogCancel asChild><Button action="cancel" type="button" variant="outline" disabled={busy}>Annuler</Button></AlertDialogCancel><Button action="confirm" type="submit" disabled={busy || !enquiry.contact.languages.length}>{busy ? "Conversion…" : "Confirmer la conversion"}</Button></div>
  </form>;
}
