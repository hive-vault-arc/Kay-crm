"use client";

import { ChevronDownIcon } from "@/components/icons";
import { RecordError } from "@/features/contacts/record-states";
import type { ApiError } from "@/lib/api/client";
import type { Policy } from "./contracts";

export function VisitSlotRules({ policy, error, retry }: { policy?: Policy; error?: ApiError; retry: () => void }) {
  return <details className="kay-form-disclosure kay-visit-disclosure"><summary>Règles du créneau<ChevronDownIcon size={16} aria-hidden="true" /></summary>{error ? <RecordError error={error} retry={retry} /> : policy ? <div className="grid gap-2 pt-3 text-xs text-muted-foreground"><p>Au bureau et en réunion : toute heure. Hors bureau : plages ouvertes sans pause déjeuner. Avec véhicule : {policy.company_car_capacity_per_hour} visite(s) par heure pour toute l’agence.</p><p>Plages : {policy.working_windows.length ? policy.working_windows.map(w => `${["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"][w.weekday - 1]} ${w.start_local}–${w.end_local}`).join(", ") : "non configurées"}.</p><p>Pauses : {policy.lunch_breaks.length ? policy.lunch_breaks.map(w => `${["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"][w.weekday - 1]} ${w.start_local}–${w.end_local}`).join(", ") : "aucune"}.</p></div> : <p role="status">Chargement des règles…</p>}</details>;
}
