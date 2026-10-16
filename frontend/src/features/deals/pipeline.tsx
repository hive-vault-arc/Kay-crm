"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { stageTones } from "./stage-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { useHydrated } from "@/hooks/use-hydrated";
import { ordinaryStages, stageLabels, transitionSchema, type Deal } from "./contracts";

export type MutateDeal = (path: `/api/v1/${string}`, body: unknown, method?: "POST" | "PATCH") => Promise<boolean>;
export function Pipeline({ deal, writable, busy, mutate }: { deal: Deal; writable: boolean; busy: boolean; mutate: MutateDeal }) {
  const [stage, setStage] = useState<string>(ordinaryStages.find(id => id !== deal.stage) ?? "new"); const [reason, setReason] = useState(""); const [invalid, setInvalid] = useState(""); const hydrated = useHydrated();
  return <section className="grid min-w-0 gap-4" aria-label="Pipeline de l’affaire"><h2 className="text-section font-medium">Pipeline</h2><ol className="flex flex-wrap gap-2">{Object.entries(stageLabels).map(([id, label]) => <li key={id} aria-current={id === deal.stage ? "step" : undefined} className={id === deal.stage ? "rounded-sm ring-2 ring-ring ring-offset-2" : ""}><Badge variant={stageTones[id as keyof typeof stageTones]}>{label}{id === deal.stage ? ": étape actuelle" : ""}</Badge></li>)}</ol><p>Les étapes ordinaires peuvent être sautées. Cela ne réserve aucun stock et ne clôture pas l’affaire.</p>{writable ? <form aria-label="Changer d’étape" onSubmit={event => { event.preventDefault(); const parsed = transitionSchema.safeParse({ stage, reason, expected_version: deal.version }); if (!parsed.success || stage === deal.stage) { setInvalid("Choisissez une autre étape et renseignez un motif."); return; } setInvalid(""); void mutate(`/api/v1/deals/${deal.id}/transition`, parsed.data); }}><fieldset disabled={!hydrated || busy} className="grid min-w-0 max-w-reading gap-4"><div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="next-stage">Nouvelle étape</Label><NativeSelect id="next-stage" value={stage} onChange={e => setStage(e.target.value)}>{ordinaryStages.map(id => <option disabled={id === deal.stage} key={id} value={id}>{stageLabels[id]}</option>)}</NativeSelect></div><div className="grid gap-2"><Label htmlFor="stage-reason">Motif du changement</Label><Input id="stage-reason" value={reason} maxLength={1000} onChange={e => setReason(e.target.value)} /></div></div>{invalid ? <p role="alert" className="text-danger">{invalid}</p> : null}<Button className="justify-self-start" type="submit">{busy ? "Enregistrement…" : "Enregistrer l’étape"}</Button></fieldset></form> : null}<p className="text-sm text-muted-foreground">Réserver et libérer : confirmation dans la section Réservation. Gagner, perdre, annuler ou rouvrir : confirmation dans la section Clôture et réouverture. Visites planifiées et tâches : disponibles dans cette fiche. Les commissions et encaissements sont facultatifs et réservés aux responsables et administrateurs.</p></section>;
}
