"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useDossierDraft } from "@/components/shared/dossier-form";
import { ApiError } from "@/lib/api/client";
import { useHydrated } from "@/hooks/use-hydrated";
import type { Enquiry, StaffRole } from "@/features/contacts/contracts";
import type { EnquiryDenied } from "@/features/contacts/use-enquiry-command";
import { BudgetInput } from "@/features/contacts/qualification-inputs";
import { qualificationMetadataSchema, type QualificationMetadata } from "@/features/contacts/qualification-contracts";
import { useQuery } from "@/features/contacts/use-query";
import { RecordError, CommandError } from "@/features/contacts/record-states";
import { convertLeadSchema } from "./qualification-contracts";
import { ProjectPicker, type ProjectSelection } from "./project-picker";
import { useConversionCommand } from "./use-conversion-command";

type Props = { enquiry: Enquiry; actorId?: string; role?: StaffRole; unavailable?: boolean; onRefresh?: () => void; denied?: EnquiryDenied; dialogOnly?: boolean; closed?: () => void; returnFocus?: RefObject<HTMLButtonElement | null> };
const writable = (enquiry: Enquiry) => !enquiry.archived_at && !enquiry.contact.archived_at && enquiry.status !== "converted";
export function ConvertLead(props: Props) { return <ConversionLifetime key={`${props.enquiry.id}:${props.enquiry.contact.id}:${props.actorId ?? ""}:${props.role ?? ""}`} {...props} />; }
function ConversionLifetime({ enquiry, actorId, role, unavailable = false, onRefresh, denied, dialogOnly = false, closed, returnFocus }: Props) {
  const [review, setReview] = useState<Enquiry | undefined>(() => dialogOnly && writable(enquiry) ? structuredClone(enquiry) : undefined);
  const reviewOwner = useRef(review), protectedOwner = useRef(false);
  const [busy, setBusy] = useState(false), [failure, setFailure] = useState<{ error: ApiError; acknowledged?: boolean }>(), [resolved, setResolved] = useState<string>();
  const hydrated = useHydrated();
  function protect(value: boolean) { protectedOwner.current = value; setBusy(value); }
  function refuse(error: ApiError, acknowledged?: boolean) { protect(false); setFailure({ error, acknowledged }); denied?.(error, acknowledged); }
  function dismiss() { if (protectedOwner.current) return; reviewOwner.current = undefined; setReview(undefined); closed?.(); }
  function open() { if (!hydrated || unavailable || reviewOwner.current || protectedOwner.current || resolved || !writable(enquiry)) return; const value = structuredClone(enquiry); reviewOwner.current = value; setReview(value); }
  if (failure) return <section className="grid gap-3"><RecordError error={failure.error} />{failure.acknowledged ? <p role="status">La conversion est enregistrée. Les droits d’accès ont changé.</p> : null}</section>;
  const destination = resolved ?? (enquiry.converted_deal_id ? `/deals/${enquiry.converted_deal_id}` : undefined);
  if (!review && destination) return <Button action="show" asChild><Link href={destination}>{destination.startsWith("/deals/") ? "Ouvrir l’affaire" : "Ouvrir le prospect actualisé"}</Link></Button>;
  return <AlertDialog open={Boolean(review)} onOpenChange={value => { if (value) open(); else dismiss(); }}>
    {!dialogOnly ? <AlertDialogTrigger asChild><Button action="create" disabled={!hydrated || unavailable || busy || Boolean(review) || !writable(enquiry)}>Convertir en affaire</Button></AlertDialogTrigger> : null}
    <AlertDialogContent onCloseAutoFocus={event => { if (returnFocus) { event.preventDefault(); returnFocus.current?.focus(); } }} onEscapeKeyDown={event => { if (protectedOwner.current) event.preventDefault(); }}><AlertDialogTitle>Convertir le prospect en affaire</AlertDialogTitle><AlertDialogDescription>{review?.contact.name ?? enquiry.contact.name}. Confirmez le projet, le budget et le motif d’achat. Les coordonnées et la source seront conservées.</AlertDialogDescription>
      {review ? <ConversionBody enquiry={review} actorId={actorId} role={role} unavailable={unavailable || !writable(enquiry)} protectedChanged={protect} denied={refuse} resolved={setResolved} onRefresh={onRefresh} /> : null}
    </AlertDialogContent>
  </AlertDialog>;
}
type BodyProps = { enquiry: Enquiry; actorId?: string; role?: StaffRole; unavailable: boolean; protectedChanged: (value: boolean) => void; denied: EnquiryDenied; resolved: (href: string) => void; onRefresh?: () => void };
function ConversionBody(props: BodyProps) {
  const metadata = useQuery("/api/v1/contacts/metadata", qualificationMetadataSchema);
  const [loaded, setLoaded] = useState<QualificationMetadata>();
  if (metadata.value && metadata.value !== loaded) setLoaded(metadata.value);
  const failure = metadata.error && [401, 403, 404].includes(metadata.error.status) ? metadata.error : undefined;
  const { denied } = props;
  useEffect(() => { if (failure) denied(failure); }, [failure, denied]);
  const value = metadata.value ?? loaded;
  if (failure) return <RecordError error={failure} />;
  if (value) return <>{metadata.error ? <RecordError error={metadata.error} retry={metadata.refresh} /> : null}<ConversionForm {...props} metadata={value} unavailable={props.unavailable || Boolean(metadata.error || !metadata.value)} /></>;
  return <>{metadata.error ? <RecordError error={metadata.error} retry={metadata.refresh} /> : <p role="status">Chargement des champs de conversion…</p>}<AlertDialogCancel asChild><Button action="cancel" type="button" variant="outline">Annuler</Button></AlertDialogCancel></>;
}
function ConversionForm({ enquiry, actorId, role, metadata, unavailable, protectedChanged, denied, resolved, onRefresh }: BodyProps & { metadata: QualificationMetadata }) {
  const id = useId(), router = useRouter(), hydrated = useHydrated();
  const [reviewed, setReviewed] = useState(enquiry), reviewOwner = useRef(enquiry);
  const [project, setProject] = useState<ProjectSelection>(), [budget, setBudget] = useState(enquiry.initial_budget ?? ""), [reasons, setReasons] = useState<string[]>([]);
  const [validation, setValidation] = useState(""), [readonly, setReadonly] = useState<Enquiry>();
  const available = useRef(!unavailable);
  useLayoutEffect(() => { available.current = !unavailable && !readonly; }, [unavailable, readonly]);
  const command = useConversionCommand({ id: enquiry.id, contactId: enquiry.contact.id, actorId, role, protectedChanged, denied, saved: result => { router.push(`/deals/${result.id}`); draft.accept(); resolved(`/deals/${result.id}`); } });
  const draft = useDossierDraft({ project, budget, reasons }, command.protected);
  function change() { if (!available.current || !command.canEdit()) return false; setValidation(""); command.clearError(); return true; }
  async function convert(event: React.FormEvent) {
    event.preventDefault();
    if (command.uncertain) { await command.retry(); return; }
    if (!available.current || !command.canEdit() || !reviewOwner.current.contact.languages.length) return;
    setValidation("");
    const parsed = convertLeadSchema.safeParse({ expected_version: reviewOwner.current.version, project: project?.choice, initial_budget: budget, purchase_reasons: reasons });
    if (!parsed.success) { setValidation("Choisissez un projet, un budget et au moins un motif d’achat."); return; }
    await command.submit(parsed.data);
  }
  async function reload() {
    await command.refresh(value => {
      if (value.contact.id !== enquiry.contact.id || !writable(value)) { setReadonly(value); resolved(value.converted_deal_id ? `/deals/${value.converted_deal_id}` : `/leads/${enquiry.id}`); }
      else { reviewOwner.current = value; setReviewed(value); }
      onRefresh?.();
    });
  }
  if (command.accessError) return <><RecordError error={command.accessError} />{command.acknowledged ? <p role="status">La conversion est enregistrée. Les droits d’accès ont changé.</p> : null}</>;
  if (readonly) return <div className="grid gap-3"><p role="status">{readonly.converted_deal_id ? "Ce prospect est déjà converti." : "Ce dossier a changé. Reprenez depuis la fiche actualisée."}</p><Button action="show" asChild><Link href={readonly.converted_deal_id ? `/deals/${readonly.converted_deal_id}` : `/leads/${enquiry.id}`}>{readonly.converted_deal_id ? "Ouvrir l’affaire" : "Ouvrir le prospect actualisé"}</Link></Button><AlertDialogCancel asChild><Button action="cancel" type="button" variant="outline">Fermer</Button></AlertDialogCancel></div>;
  return <form noValidate method="post" data-draft-managed data-live-dirty={true} data-write-recovery={command.uncertain || undefined} onSubmit={event => void convert(event)} className="grid min-w-0 gap-4" aria-busy={command.protected}>
    <fieldset disabled={!hydrated || command.protected || unavailable || command.needsReview || command.complete} className="grid min-w-0 gap-4"><ProjectPicker selected={project} choose={choice => { if (change()) setProject(choice); }} denied={command.deny} />
      <div className="grid gap-2"><Label htmlFor={`${id}-budget`}>Budget *</Label><BudgetInput id={`${id}-budget`} value={budget} metadata={metadata} onChange={value => { if (change()) setBudget(value); }} /></div>
      <fieldset className="grid gap-2"><legend className="mb-2 font-medium">Motif d’achat *</legend><div className="grid gap-1 sm:grid-cols-2">{metadata.purchase_reasons.map(reason => <Label key={reason.value} className="flex min-h-control cursor-pointer items-center gap-2"><Checkbox checked={reasons.includes(reason.value)} onCheckedChange={checked => { if (change()) setReasons(current => checked ? [...new Set([...current, reason.value])] : current.filter(value => value !== reason.value)); }} />{reason.label}</Label>)}</div></fieldset>
    </fieldset>
    {!reviewed.contact.languages.length ? <p className="text-warning">Renseignez d’abord les langues dans <Link href={`/leads/${enquiry.id}/edit`} className="text-link underline">la fiche du prospect</Link>.</p> : null}
    {validation ? <p role="alert" className="text-danger">{validation}</p> : null}<CommandError error={command.error} dismiss={command.clearError} />
    {command.needsReview ? <Button action="refresh" type="button" variant="outline" disabled={command.protected} onClick={() => void reload()}>Actualiser le prospect avant de reprendre</Button> : null}
    {reviewed.version !== enquiry.version && !command.needsReview ? <p role="status">Version {reviewed.version} chargée. Vérifiez votre projet, votre budget et vos motifs avant de confirmer.</p> : null}
    {unavailable && !command.uncertain ? <p role="status">Les données actuelles sont indisponibles ou le dossier est en lecture seule. Actualisez avant de convertir.</p> : null}
    {command.uncertain ? <p role="status">{command.acknowledged ? "La conversion est enregistrée. Actualisez son résultat sans la créer à nouveau." : "La réponse est interrompue. Réessayez la même conversion pour retrouver son résultat."}</p> : null}
    {command.complete ? <p role="status">Conversion enregistrée.</p> : null}
    <div className="flex flex-wrap justify-end gap-2"><AlertDialogCancel asChild><Button action="cancel" type="button" variant="outline" disabled={!hydrated || command.protected}>Annuler</Button></AlertDialogCancel><Button action="confirm" type="submit" disabled={!hydrated || command.busy || command.complete || !command.uncertain && (unavailable || command.needsReview || !reviewed.contact.languages.length)}>{command.busy ? "Conversion…" : command.uncertain ? command.acknowledged ? "Actualiser le résultat" : "Réessayer la même opération" : "Confirmer la conversion"}</Button></div>
  </form>;
}
