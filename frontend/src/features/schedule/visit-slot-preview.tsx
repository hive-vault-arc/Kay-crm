"use client";

import { Button } from "@/components/ui/button";
import { ChevronDownIcon } from "@/components/icons";
import { RecordError } from "@/features/contacts/record-states";
import { ApiError } from "@/lib/api/client";
import type { z } from "zod";
import type { availabilitySchema, Policy } from "./contracts";
import { localLabel } from "./time";

export function VisitSlotPreview({ policy, error, retry, preview, check, canCheck, checking }: {
  policy?: Policy; error?: ApiError; retry: () => void; preview?: z.infer<typeof availabilitySchema>;
  check: () => void; canCheck: boolean; checking: boolean;
}) {
  return <section className="kay-visit-slot grid min-w-0 gap-4" aria-label="Vérification du créneau">
    <div className="flex flex-wrap items-center gap-3"><Button action="preview" type="button" variant="outline" disabled={!canCheck || checking} onClick={check}>{checking ? "Vérification…" : "Vérifier le créneau"}</Button><span className="text-xs text-muted-foreground">Africa/Casablanca</span></div>
    {preview ? <div className="kay-visit-availability" aria-label="Disponibilité du créneau"><p role="status" className={preview.bookable ? "text-success" : "text-danger"}>{preview.bookable ? "Créneau compatible avec les horaires et la capacité." : new ApiError(preview.code ?? "VALIDATION_ERROR", 409).message}</p>{preview.company_car_intervals.map(slot => <p key={slot.start_at}>{localLabel(slot.local_label)} : {slot.remaining} place(s) restante(s) sur {slot.capacity}.</p>)}<p className="text-xs text-muted-foreground">Les horaires et les chevauchements sont revérifiés à l’enregistrement.</p></div> : null}
    <details className="kay-form-disclosure kay-visit-disclosure"><summary>Règles du créneau<ChevronDownIcon size={16} aria-hidden="true" /></summary>{error ? <RecordError error={error} retry={retry} /> : policy ? <div className="grid gap-2 pt-3 text-xs text-muted-foreground"><p>Au bureau et en réunion : toute heure. Hors bureau : plages ouvertes sans pause déjeuner. Avec véhicule : {policy.company_car_capacity_per_hour} visite(s) par heure pour toute l’agence.</p><p>Plages : {policy.working_windows.length ? policy.working_windows.map(w => `${["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"][w.weekday - 1]} ${w.start_local}–${w.end_local}`).join(", ") : "non configurées"}.</p><p>Pauses : {policy.lunch_breaks.length ? policy.lunch_breaks.map(w => `${["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"][w.weekday - 1]} ${w.start_local}–${w.end_local}`).join(", ") : "aucune"}.</p></div> : <p role="status">Chargement des règles…</p>}</details>
  </section>;
}
