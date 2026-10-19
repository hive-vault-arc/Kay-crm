"use client";

import { useRef, useState } from "react";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { RecordError } from "@/features/contacts/record-states";
import { enquirySchema } from "@/features/contacts/contracts";
import { resultSchema } from "@/features/deals/contracts";
import { apiCommand } from "@/lib/api/command";
import { ApiError } from "@/lib/api/client";

export function RecordLifecycleAction({ kind, id, version, archivedAt, onSaved }: {
  kind: "enquiries" | "deals";
  id: string;
  version: number;
  archivedAt: string | null;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError>();
  const [openedAt] = useState(() => Date.now());
  const key = useRef("");
  const archived = archivedAt !== null;
  const expired = archivedAt !== null && Date.parse(archivedAt) + 30 * 24 * 60 * 60 * 1000 < openedAt;
  const label = archived ? "Restaurer" : "Archiver";
  if (expired) return <p className="text-sm text-muted-foreground">Délai de restauration de 30 jours expiré. Historique conservé.</p>;
  async function submit() {
    if (busy) return;
    if (!key.current) key.current = crypto.randomUUID();
    setBusy(true);
    setError(undefined);
    try {
      const path = `/api/v1/${kind}/${id}/${archived ? "restore" : "archive"}` as `/api/v1/${string}`;
      if (kind === "enquiries") {
        await apiCommand(path, { expected_version: version }, enquirySchema, key.current);
      } else {
        await apiCommand(path, { expected_version: version }, resultSchema, key.current);
      }
      key.current = "";
      setOpen(false);
      onSaved();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503));
    } finally {
      setBusy(false);
    }
  }
  return <AlertDialog open={open} onOpenChange={next => { if (!busy) { setOpen(next); if (next) setError(undefined); } }}>
    <AlertDialogTrigger asChild><Button action={archived ? "restore" : "archive"} variant={archived ? "outline" : "destructive"} type="button">{label}</Button></AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogTitle>{label} {kind === "enquiries" ? "ce prospect" : "cette affaire"} ?</AlertDialogTitle>
      <AlertDialogDescription>{archived ? "La restauration est possible pendant 30 jours après l’archivage. Le serveur vérifie la date et votre attribution actuelle." : "Le dossier quittera la liste active. Vous pourrez le restaurer depuis les archives pendant 30 jours. Son historique restera conservé."}</AlertDialogDescription>
      {error ? <RecordError error={error} /> : null}
      <div className="flex flex-wrap gap-2"><AlertDialogCancel asChild><Button action="back" variant="outline" disabled={busy}>Annuler</Button></AlertDialogCancel><Button action={archived ? "restore" : "archive"} variant={archived ? "default" : "destructive"} disabled={busy} onClick={() => void submit()}>{busy ? "Enregistrement…" : `Confirmer : ${label.toLowerCase()}`}</Button></div>
    </AlertDialogContent>
  </AlertDialog>;
}
