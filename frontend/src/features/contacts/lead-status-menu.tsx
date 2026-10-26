"use client";

import { useId, useRef, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CrmStatusBadge } from "@/components/shared/crm-presentation";
import { RecordStatusMenu } from "@/components/shared/record-status-menu";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiCommand } from "@/lib/api/command";
import { ApiError } from "@/lib/api/client";
import { editEnquirySchema, enquirySchema, statusLabels, writableStatusSchema, type Enquiry } from "./contracts";
import { RecordError } from "./record-states";

const groups = [
  { label: "Suivi", items: ["new", "in_progress", "follow_up", "analysis"] },
  { label: "Qualification", items: ["qualified", "not_qualified"] },
  { label: "Clôture", items: ["lost", "junk_lead", "closed"] },
].map(group => ({ label: group.label, items: group.items.map(id => ({ id, label: statusLabels[id as keyof typeof statusLabels] })) }));

export function LeadStatusMenu({ enquiry, writable, changed, dialogOnly = false, initialStatus, closed, returnFocus }: { enquiry: Enquiry; writable: boolean; changed: (saved: boolean) => void; dialogOnly?: boolean; initialStatus?: string; closed?: () => void; returnFocus?: RefObject<HTMLButtonElement | null> }) {
  const [review, setReview] = useState<{ enquiry: Enquiry; status: string } | undefined>(() => initialStatus && writableStatusSchema.safeParse(initialStatus).success ? { enquiry, status: initialStatus } : undefined);
  const [budget, setBudget] = useState(enquiry.initial_budget ?? "");
  const [busy, setBusy] = useState(false), [error, setError] = useState<ApiError>();
  const control = useId(), attempt = useRef({ body: "", key: "" }), hydrated = useHydrated();
  const trigger = useRef<HTMLButtonElement>(null);
  if (!writable || enquiry.status === "converted") return <CrmStatusBadge state={enquiry.status}>{statusLabels[enquiry.status]}</CrmStatusBadge>;
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!review || busy) return;
    const body = editEnquirySchema.safeParse({ expected_version: review.enquiry.version, message: review.enquiry.message, status: review.status, initial_budget: budget, campaign_source: review.enquiry.campaign_source, rating: review.enquiry.rating });
    if (!body.success) { setError(new ApiError("VALIDATION_ERROR", 422)); return; }
    const fingerprint = JSON.stringify(body.data);
    if (attempt.current.body !== fingerprint) attempt.current = { body: fingerprint, key: crypto.randomUUID() };
    setBusy(true); setError(undefined);
    try { await apiCommand(`/api/v1/enquiries/${review.enquiry.id}`, body.data, enquirySchema, attempt.current.key, "PATCH"); setReview(undefined); changed(true); closed?.(); }
    catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); }
    finally { setBusy(false); }
  }
  const current = enquirySchema.safeParse(error?.details?.current);
  return <>{!dialogOnly ? <RecordStatusMenu triggerRef={trigger} value={enquiry.status} prefix="Statut" label={statusLabels[enquiry.status]} groups={groups} disabled={!hydrated || busy} choose={id => { const status = writableStatusSchema.parse(id); setReview({ enquiry, status }); setBudget(enquiry.initial_budget ?? ""); setError(undefined); attempt.current = { body: "", key: "" }; }} /> : null}<AlertDialog open={Boolean(review)} onOpenChange={open => { if (!open && !busy) { setReview(undefined); closed?.(); } }}><AlertDialogContent onCloseAutoFocus={event => { event.preventDefault(); (returnFocus ?? trigger).current?.focus(); }}><AlertDialogTitle>Changer le statut du prospect</AlertDialogTitle><AlertDialogDescription>{enquiry.contact.name} · {review ? `${statusLabels[review.enquiry.status]} → ${statusLabels[review.status as keyof typeof statusLabels]}` : ""}. L’historique et les autres informations sont conservés.</AlertDialogDescription><form className="grid gap-4" aria-busy={busy} onSubmit={event => void save(event)}><fieldset className="grid gap-3" disabled={busy}>{!review?.enquiry.initial_budget ? <div className="grid gap-2"><Label htmlFor={control}>Budget à qualifier</Label><Input id={control} required maxLength={160} value={budget} onChange={event => setBudget(event.target.value)} /></div> : null}{error ? <RecordError error={error} /> : null}{current.success ? <div className="grid gap-2 text-sm"><p>Version actuelle {current.data.version} : {statusLabels[current.data.status]}. Rechargez avant de choisir à nouveau le statut.</p><Button action="refresh" type="button" variant="outline" onClick={() => { changed(false); setReview(undefined); closed?.(); }}>Charger la version actuelle</Button></div> : null}<div className="flex flex-wrap justify-end gap-2"><AlertDialogCancel asChild><Button action="cancel" type="button" variant="outline">Annuler</Button></AlertDialogCancel><Button action="confirm" type="submit">{busy ? "Enregistrement…" : "Confirmer le statut"}</Button></div></fieldset></form></AlertDialogContent></AlertDialog></>;
}
