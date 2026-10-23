"use client";

import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { RecordError } from "@/features/contacts/record-states";
import { recordLifecycleResultSchema } from "@/features/contacts/contracts";
import { useHydrated } from "@/hooks/use-hydrated";
import { ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";

export function RecordLifecycleAction({ kind, id, version, archivedAt, label, onChanged }: {
  kind: "enquiries" | "deals";
  id: string;
  version: number;
  archivedAt: string | null;
  label: string;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError>();
  const [invalid, setInvalid] = useState(false);
  const attempt = useRef({ body: "", key: "" });
  const reasonId = useId();
  const hydrated = useHydrated();
  const archived = Boolean(archivedAt);
  const noun = kind === "enquiries" ? "le prospect" : "l’affaire";
  const title = `${archived ? "Restaurer" : "Archiver"} ${noun}`;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInvalid(false);
    setError(undefined);
    if (!reason.trim()) { setInvalid(true); return; }
    const body = { expected_version: version, reason: reason.trim() };
    const fingerprint = JSON.stringify(body);
    if (attempt.current.body !== fingerprint) attempt.current = { body: fingerprint, key: crypto.randomUUID() };
    setBusy(true);
    try {
      await apiCommand(`/api/v1/${kind}/${id}/${archived ? "restore" : "archive"}`, body, recordLifecycleResultSchema, attempt.current.key);
      setOpen(false);
      setReason("");
      attempt.current = { body: "", key: "" };
      onChanged();
    } catch (failure) {
      setError(failure instanceof ApiError ? failure : new ApiError("DEPENDENCY_UNAVAILABLE", 503));
    } finally { setBusy(false); }
  }

  return <AlertDialog open={open} onOpenChange={next => { if (!busy) { setOpen(next); if (next) setError(undefined); } }}>
    <AlertDialogTrigger asChild><Button action={archived ? "restore" : "archive"} type="button" variant={archived ? "outline" : "destructive"} disabled={!hydrated}>{title}</Button></AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogTitle>{title}</AlertDialogTitle>
      <AlertDialogDescription>{archived ? "La fiche redeviendra visible dans les listes actives si son archivage date de moins de 30 jours." : "La fiche quittera les listes actives. Son historique reste conservé et elle peut être restaurée pendant 30 jours. Les opérations liées doivent être terminées avant l’archivage."}</AlertDialogDescription>
      <p className="wrap-anywhere font-medium">{label}</p>
      <form className="grid gap-4" noValidate onSubmit={event => void submit(event)}>
        <fieldset disabled={busy} className="grid gap-4">
          <div className="grid gap-2"><Label htmlFor={reasonId}>Motif obligatoire</Label><Textarea id={reasonId} value={reason} maxLength={1000} onChange={event => setReason(event.target.value)} aria-invalid={invalid} aria-describedby={invalid ? `${reasonId}-error` : undefined} />{invalid ? <p id={`${reasonId}-error`} role="alert" className="text-danger">Indiquez un motif.</p> : null}</div>
          {error ? <div className="grid gap-2"><RecordError error={error} /><p className="text-sm">La saisie est conservée. Après une interruption, réessayez sans modifier le motif.</p></div> : null}
          <div className="flex flex-wrap gap-2"><Button action={archived ? "restore" : "archive"} type="submit" variant={archived ? "default" : "destructive"}>{busy ? "Enregistrement…" : `Confirmer : ${title.toLowerCase()}`}</Button><AlertDialogCancel asChild><Button action="cancel" type="button" variant="outline">Conserver la fiche</Button></AlertDialogCancel></div>
        </fieldset>
      </form>
    </AlertDialogContent>
  </AlertDialog>;
}
