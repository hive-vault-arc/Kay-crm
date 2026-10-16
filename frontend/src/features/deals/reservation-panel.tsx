"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RecordError } from "@/features/contacts/record-states";
import { kindLabels, stateLabels } from "@/features/inventory/contracts";
import { targetLabels } from "@/features/requirements/offering-card";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { formatInstant } from "@/lib/format";
import { dealSchema, releaseSchema, reserveSchema, resultSchema, type Deal } from "./contracts";

export function ReservationPanel({ deal, writable, busy, busyChanged, saved }: {
  deal: Deal; writable: boolean; busy: boolean; busyChanged: (value: boolean) => void; saved: () => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [review, setReview] = useState(deal);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<ApiError>();
  const [invalid, setInvalid] = useState("");
  const [notice, setNotice] = useState("");
  const attempt = useRef({ fingerprint: "", key: "" });
  const lock = useRef(false);
  const hydrated = useHydrated();
  const router = useRouter();
  const releasing = Boolean(deal.active_reservation);
  const action = releasing ? "Libérer la réservation" : "Réserver l’offre";
  const offering = review.offering;
  const target = offering?.target;

  async function refresh() {
    if (lock.current) return;
    lock.current = true; busyChanged(true);
    try { setReview(await apiGet(`/api/v1/deals/${deal.id}`, dealSchema)); setError(undefined); }
    catch (failure) { setError(failure instanceof ApiError ? failure : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); }
    finally { lock.current = false; busyChanged(false); }
  }
  async function submit() {
    if (!offering || !target || lock.current) return;
    const fields = { expected_version: review.version, offering_id: offering.id, expected_offering_version: offering.version, expected_target_version: target.version, expected_development_version: target.development_version };
    const parsed = releasing ? releaseSchema.safeParse({ ...fields, reason }) : reserveSchema.safeParse(fields);
    if (!parsed.success) { setInvalid("Indiquez un motif de libération (1 à 1 000 caractères)."); return; }
    const path = `/api/v1/deals/${deal.id}/${releasing ? "release-reservation" : "reserve"}` as const;
    const fingerprint = JSON.stringify({ path, body: parsed.data });
    if (attempt.current.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };
    lock.current = true; busyChanged(true); setError(undefined); setInvalid(""); setNotice("");
    try {
      await apiCommand(path, parsed.data, resultSchema, attempt.current.key);
      await saved(); router.refresh(); setOpen(false); setReason("");
      setNotice(releasing ? "Libération enregistrée dans l’historique. L’état actuel du stock est affiché ci-dessus." : "Réservation enregistrée dans l’historique. L’état actuel du stock est affiché ci-dessus.");
    } catch (failure) { setError(failure instanceof ApiError ? failure : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); }
    finally { lock.current = false; busyChanged(false); }
  }
  return <section className="grid min-w-0 gap-4 border-y py-6" aria-label="Réservation de l’affaire">
    <h2 className="text-section font-medium">Réservation</h2>
    {deal.active_reservation ? <p>Réservation active depuis le {formatInstant(deal.active_reservation.created_at)}. Aucune expiration automatique.</p> : <p>Aucune réservation active pour cette affaire.</p>}
    {deal.reservation_conflict ? <p role="status" className="text-warning">{deal.reservation_conflict === "DEVELOPMENT_OVERLAP" ? "Une réservation du même type couvre déjà le programme entier ou une de ses unités." : "Cette offre est déjà réservée par une autre affaire."} Faites vérifier le stock par un responsable. Aucun autre dossier privé n’est affiché.</p> : null}
    {!deal.offering ? <p>Liez une offre d’inventaire précise avant de réserver.</p> : !writable ? <p>Réservation en lecture seule.</p> : <AlertDialog open={open} onOpenChange={next => { if (!lock.current) { setOpen(next); if (next) { setReview(deal); setError(undefined); setInvalid(""); } } }}>
      <AlertDialogTrigger asChild><Button type="button" className="justify-self-start" variant={releasing ? "outline" : "default"} disabled={!hydrated || busy}>{action}</Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>{action}</AlertDialogTitle>
        <AlertDialogDescription>{releasing ? "La libération rend cette offre disponible. Son motif et son auteur sont conservés." : "Cette action bloque uniquement l’offre et le périmètre indiqués. Elle ne gagne pas l’affaire et ne crée aucune commission."}</AlertDialogDescription>
        {offering && target ? <div className="grid min-w-0 gap-2"><p className="wrap-anywhere font-medium">{target.reference} : {targetLabels[target.level]}</p><p>{kindLabels[offering.kind]} : {stateLabels[offering.state]}</p><p className="wrap-anywhere">{target.label}</p>{target.level === "unit" ? <p className="wrap-anywhere">Programme {target.development_reference}, bloc {target.block_code ?? "non renseigné"}, étage {target.floor_code ?? "non renseigné"}. Le type n’est pas une cible réservable.</p> : null}<p>Affaire version {review.version}, cible version {target.version}, offre version {offering.version}.</p></div> : <p role="alert">La cible actuelle ne peut pas être vérifiée.</p>}
        <p>Aucune expiration automatique. Le serveur vérifie à nouveau vos droits et les réservations concurrentes.</p>
        {releasing ? <div className="grid gap-2"><Label htmlFor="release-reason">Motif de la libération</Label><Textarea id="release-reason" maxLength={1000} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} aria-invalid={Boolean(invalid)} aria-describedby={invalid ? "release-invalid" : undefined} /></div> : null}
        {invalid ? <p id="release-invalid" role="alert" className="text-danger">{invalid}</p> : null}
        {error ? <div className="grid gap-2"><RecordError error={error} /><p>{releasing ? "Votre motif reste saisi. " : ""}Après une réponse interrompue, réessayez sans modifier l’action pour récupérer le même résultat.</p><p>Pour un conflit, actualisez les faits ci-dessus, puis vérifiez-les avant de confirmer. Un chevauchement exige une revue par un responsable, pas une nouvelle cible implicite.</p></div> : null}
        <div className="flex flex-wrap gap-2"><Button type="button" disabled={busy || !target} onClick={() => void submit()}>{busy ? "Enregistrement…" : action}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => void refresh()}>Actualiser la disponibilité</Button><AlertDialogCancel asChild><Button type="button" variant="outline" disabled={busy}>Retour</Button></AlertDialogCancel></div>
      </AlertDialogContent>
    </AlertDialog>}
    {notice ? <p role="status" className="text-success">{notice}</p> : null}
  </section>;
}
