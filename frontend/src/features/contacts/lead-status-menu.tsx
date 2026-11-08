"use client";

import { useId, useRef, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CrmStatusBadge } from "@/components/shared/crm-presentation";
import { RecordStatusMenu } from "@/components/shared/record-status-menu";
import { useDossierDraft } from "@/components/shared/dossier-form";
import { useHydrated } from "@/hooks/use-hydrated";
import { enquirySchema, statusLabels, writableStatusSchema, type Enquiry } from "./contracts";
import { useEnquiryCommand, type EnquiryDenied } from "./use-enquiry-command";
import { RecordError } from "./record-states";

const groups = [
  { label: "Suivi", items: ["new", "in_progress", "follow_up", "analysis"] },
  { label: "Qualification", items: ["qualified", "not_qualified"] },
  { label: "Clôture", items: ["lost", "junk_lead", "closed"] },
].map(group => ({ label: group.label, items: group.items.map(id => ({ id, label: statusLabels[id as keyof typeof statusLabels] })) }));
type Props = { enquiry: Enquiry; writable: boolean; changed: (saved: boolean) => void | Promise<void>; dialogOnly?: boolean; initialStatus?: string; closed?: () => void; returnFocus?: RefObject<HTMLButtonElement | null>; denied?: EnquiryDenied };
type Review = { enquiry: Enquiry; status: string };
export function LeadStatusMenu(props: Props) { return <StatusLifetime key={props.enquiry.id + ":" + props.enquiry.contact.id} {...props} />; }
function StatusLifetime({ enquiry, writable, changed, dialogOnly = false, initialStatus, closed, returnFocus, denied }: Props) {
  const [review, setReview] = useState<Review | undefined>(() => initialStatus && writable && enquiry.status !== "converted" && writableStatusSchema.safeParse(initialStatus).success ? { enquiry, status: initialStatus } : undefined);
  const reviewOwner = useRef(review);
  const [budget, setBudget] = useState(enquiry.initial_budget ?? "");
  const control = useId(), hydrated = useHydrated(), trigger = useRef<HTMLButtonElement>(null);
  const command = useEnquiryCommand({ id: enquiry.id, contactId: enquiry.contact.id, denied, saved: async (result, signal) => {
    await changed(true); if (signal.aborted) return;
    reviewOwner.current = undefined; setReview(undefined); setBudget(result.initial_budget ?? ""); draft.accept({ status: null, budget: result.initial_budget ?? "" }); closed?.();
  } });
  const draft = useDossierDraft({ status: review?.status ?? null, budget }, command.protected);
  const parsedCurrent = enquirySchema.safeParse(command.error?.details?.current);
  const current = parsedCurrent.success && parsedCurrent.data.id === enquiry.id && parsedCurrent.data.contact.id === enquiry.contact.id ? parsedCurrent.data : undefined;
  function closeReview() {
    reviewOwner.current = undefined; setReview(undefined); setBudget(enquiry.initial_budget ?? ""); draft.accept({ status: null, budget: enquiry.initial_budget ?? "" }); closed?.();
  }
  function dismiss() { if (!command.locked()) closeReview(); }
  function choose(id: string) {
    const status = writableStatusSchema.safeParse(id);
    if (!status.success || !writable || enquiry.status === "converted" || reviewOwner.current || !command.begin()) return;
    const value = { enquiry: structuredClone(enquiry), status: status.data };
    reviewOwner.current = value; setReview(value); setBudget(enquiry.initial_budget ?? "");
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (command.uncertain) { await command.retry(); return; }
    const value = reviewOwner.current;
    if (!value || !command.canEdit()) return;
    await command.submit({ expected_version: value.enquiry.version, message: value.enquiry.message, status: value.status, initial_budget: budget, campaign_source: value.enquiry.campaign_source, rating: value.enquiry.rating });
  }
  if (command.accessError) return <section className="grid gap-3"><RecordError error={command.accessError} />{command.acknowledged ? <p role="status">Le statut est enregistré. Les droits d’accès ont changé.</p> : null}</section>;
  if ((!writable || enquiry.status === "converted") && !review) return <CrmStatusBadge state={enquiry.status}>{statusLabels[enquiry.status]}</CrmStatusBadge>;
  return <>{!dialogOnly ? <RecordStatusMenu triggerRef={trigger} value={enquiry.status} prefix="Statut" label={statusLabels[enquiry.status]} groups={groups} disabled={!hydrated || !writable || command.protected || Boolean(review)} choose={choose} /> : null}
    <AlertDialog open={Boolean(review)} onOpenChange={open => { if (!open) dismiss(); }}>
      <AlertDialogContent aria-busy={command.protected} onEscapeKeyDown={event => { if (command.locked()) event.preventDefault(); }} onCloseAutoFocus={event => { event.preventDefault(); (returnFocus ?? trigger).current?.focus(); }}>
        <AlertDialogTitle>Changer le statut du prospect</AlertDialogTitle>
        <AlertDialogDescription>{review?.enquiry.contact.name ?? enquiry.contact.name} · {review ? statusLabels[review.enquiry.status] + " → " + statusLabels[review.status as keyof typeof statusLabels] : ""}. L’historique et les autres informations sont conservés.</AlertDialogDescription>
        <form className="grid gap-4" method="post" data-draft-managed data-live-dirty={Boolean(review) || draft.dirty || undefined} data-write-recovery={command.uncertain || undefined} aria-busy={command.protected} onSubmit={event => void save(event)}>
          <fieldset className="grid gap-3" disabled={!hydrated || command.protected}>
            {!review?.enquiry.initial_budget ? <div className="grid gap-2"><Label htmlFor={control}>Budget à qualifier</Label><Input id={control} required maxLength={160} value={budget} onChange={event => { if (command.canEdit()) setBudget(event.target.value); }} /></div> : null}
          </fieldset>
          {command.error ? <RecordError error={command.error} /> : null}
          {current && !command.uncertain ? <div className="grid gap-2 text-sm"><p>Version actuelle {current.version} : {statusLabels[current.status]}. Rechargez avant de choisir à nouveau le statut.</p><Button action="refresh" type="button" variant="outline" disabled={command.protected} onClick={() => void command.refresh(async signal => { await changed(false); if (!signal.aborted) closeReview(); })}>Charger la version actuelle</Button></div> : null}
          {command.uncertain ? <p role="status">{command.acknowledged ? "Le statut est enregistré. Actualisez son résultat sans l’enregistrer à nouveau." : "La réponse est interrompue. Réessayez le même changement pour retrouver son résultat."}</p> : null}
          <div className="flex flex-wrap justify-end gap-2"><AlertDialogCancel asChild><Button action="cancel" type="button" variant="outline" disabled={command.protected}>Annuler</Button></AlertDialogCancel><Button action="confirm" type="submit" disabled={!hydrated || command.busy || command.needsReview}>{command.busy ? "Enregistrement…" : command.uncertain ? command.acknowledged ? "Actualiser le résultat" : "Réessayer la même opération" : "Confirmer le statut"}</Button></div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}
