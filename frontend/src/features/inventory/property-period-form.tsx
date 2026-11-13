"use client";

import { useId, useState } from "react";
import { useDossierDraft } from "@/components/shared/dossier-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { RecordError } from "@/features/contacts/record-states";
import { calendarDay, civilLabel } from "@/features/schedule/calendar-model";
import { apiGet } from "@/lib/api/client";
import { propertySchema } from "./contracts";
import { cancelPropertyPeriodSchema, periodFirstDay, periodLabels, periodLastBoundary, savePropertyPeriodSchema, type PropertyPeriod } from "./period-contracts";
import { useInventoryRecordCommand } from "./use-record-command";

export function PropertyPeriodForm({ id, date, version, period, cancel = false, close, saved, conflict }: {
  id: string; date: string; version: number; period?: PropertyPeriod; cancel?: boolean; close: () => void; saved: () => void; conflict?: () => void;
}) {
  const field = useId();
  const [reviewedVersion, setReviewedVersion] = useState(version);
  const [kind, setKind] = useState<PropertyPeriod["kind"]>(period?.kind ?? "booking");
  const [start, setStart] = useState(period?.start_on ?? date);
  const [end, setEnd] = useState(period?.end_on ?? calendarDay(date, 1));
  const [note, setNote] = useState(period?.note ?? "");
  const [reason, setReason] = useState("");
  const [invalid, setInvalid] = useState("");
  const command = useInventoryRecordCommand({ root: "properties", id, version, kind: "period", periodId: period?.id, cancel });
  const draft = useDossierDraft({ kind, start, end, note, reason }, command.pending);
  const title = cancel ? "Annuler la période" : period ? "Modifier la période" : "Ajouter une période";

  async function submit() {
    if (command.uncertain) { await command.retry(); return; }
    const parsed = cancel ? cancelPropertyPeriodSchema.safeParse({ expected_version: reviewedVersion, reason }) :
      savePropertyPeriodSchema.safeParse({ expected_version: reviewedVersion, kind, start_on: start, end_on: end, note });
    if (!parsed.success) {
      setInvalid(cancel ? "Indiquez le motif d’annulation." : "Choisissez une date de fin après la date de début.");
      return;
    }
    setInvalid("");
    const path = `/api/v1/properties/${id}/calendar${period ? `/${period.id}${cancel ? "/cancel" : ""}` : ""}` as const;
    const failure = await command.submit(path, parsed.data, period && !cancel ? "PATCH" : "POST", () => {
      draft.accept();
      saved();
    });
    if (failure?.code === "PROPERTY_PERIOD_OVERLAP") conflict?.();
  }

  async function review() {
    try {
      const current = await command.inspect(signal => apiGet(`/api/v1/properties/${id}`, propertySchema, signal));
      if (command.accept(current)) setReviewedVersion(current.version);
    } catch { /* The existing command controller exposes the read error. */ }
  }

  return <form className="kay-drawer-form" aria-label={title} aria-busy={command.pending}
    data-draft-managed data-write-recovery={command.uncertain || undefined}
    data-live-dirty={draft.dirty || command.uncertain || undefined} noValidate
    onSubmit={event => { event.preventDefault(); void submit(); }}>
    {cancel && period ? <p className="text-sm">{periodLabels[period.kind]} · {civilLabel(period.start_on, { dateStyle: "long" })} – {civilLabel(period.end_on, { dateStyle: "long" })}</p> : null}
    <fieldset className="grid min-w-0 gap-4" disabled={command.pending || command.uncertain}>
      {cancel ? <div className="grid gap-2">
        <Label htmlFor={field + "-reason"}>Motif d’annulation</Label>
        <Textarea id={field + "-reason"} value={reason} onChange={event => setReason(event.target.value)} maxLength={500} required />
      </div> : <>
        <div className="grid gap-2">
          <Label htmlFor={field + "-kind"}>Type de période</Label>
          <NativeSelect id={field + "-kind"} value={kind} onChange={event => setKind(event.target.value === "closure" ? "closure" : "booking")}>
            <option value="booking">{periodLabels.booking}</option><option value="closure">{periodLabels.closure}</option>
          </NativeSelect>
        </div>
        <div className="kay-form-pair">
          <div className="grid gap-2">
            <Label htmlFor={field + "-start"}>{kind === "booking" ? "Date d’arrivée" : "Début de la fermeture"}</Label>
            <Input id={field + "-start"} type="date" min={periodFirstDay} max="2100-12-31" value={start} onChange={event => setStart(event.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={field + "-end"}>{kind === "booking" ? "Date de départ" : "Réouverture (date exclue)"}</Label>
            <Input id={field + "-end"} type="date" min={periodFirstDay} max={periodLastBoundary} value={end} onChange={event => setEnd(event.target.value)} required />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={field + "-note"}>Note interne (facultative)</Label>
          <Textarea id={field + "-note"} value={note} onChange={event => setNote(event.target.value)} maxLength={500} />
        </div>
      </>}
    </fieldset>
    {invalid ? <p role="alert" className="text-sm text-danger">{invalid}</p> : null}
    {command.error ? <RecordError error={command.error} /> : null}
    {command.needsReview && command.error?.code !== "PROPERTY_PERIOD_CANCELLED" ? <Button type="button" action="refresh" variant="outline" disabled={command.pending}
      onClick={() => void review()}>Recharger l’état du bien</Button> : null}
    <div className="kay-form-footer">
      <Button action="close" type="button" variant="outline" disabled={command.protected} onClick={close}>Fermer</Button>
      <Button action={cancel ? "cancelRecord" : "save"} type="submit" variant={cancel ? "destructive" : "default"}
        disabled={command.pending || (!command.uncertain && !command.canEdit())}>
        {command.pending ? "Enregistrement…" : command.uncertain ? "Réessayer la même opération" : cancel ? "Confirmer l’annulation" : "Enregistrer la période"}
      </Button>
    </div>
  </form>;
}
