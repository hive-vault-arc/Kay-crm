"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { RecordError } from "@/features/contacts/record-states";
import { useHydrated } from "@/hooks/use-hydrated";
import { ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { resultSchema } from "@/features/inventory/contracts";
import { InventoryRecordContext } from "@/features/inventory/record-scope";
import { InventoryBusyContext } from "@/features/inventory/use-command";

export function DeleteInventoryButton({ kind, id, reference, returnHref }: {
  kind: "properties" | "developments"; id: string; reference: string; returnHref: string;
}) {
  const router = useRouter(), hydrated = useHydrated(), record = useContext(InventoryRecordContext), publishBusy = useContext(InventoryBusyContext);
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [uncertain, setUncertain] = useState(false), [denied, setDenied] = useState(false), [error, setError] = useState<ApiError>();
  const attempt = useRef<string | undefined>(undefined), lock = useRef(false), alive = useRef(true), trigger = useRef<HTMLButtonElement>(null), request = useRef<AbortController | null>(null);
  const publisher = useRef(publishBusy), binding = useRef({ actor: record?.actorId, role: record?.role });
  useEffect(() => { publisher.current = publishBusy; }, [publishBusy]);
  const noun = kind === "properties" ? "ce bien" : "ce programme";
  useEffect(() => { alive.current = true; return () => { alive.current = false; request.current?.abort(); publisher.current(false); }; }, []);
  function close(next: boolean) { if (!lock.current && !uncertain) { setOpen(next); setError(undefined); if (!next) { attempt.current = undefined; trigger.current?.focus(); } } }
  async function remove() {
    if (!hydrated || lock.current || denied) return;
    lock.current = true; setBusy(true); setError(undefined); publishBusy(true);
    const controller = new AbortController(); request.current = controller;
    const key = attempt.current ?? crypto.randomUUID(); attempt.current = key;
    let dispatched = false;
    try {
      const receipt = await apiCommand(`/api/v1/${kind}/${id}/delete`, { confirm: true }, resultSchema, key, "POST", undefined, controller.signal, {
        beforeDispatch: identity => {
          if (identity.must_change_password || identity.user.role === "agent" || binding.current.actor && binding.current.actor !== identity.user.id || binding.current.role && binding.current.role !== identity.user.role) throw new ApiError("FORBIDDEN", 403);
          binding.current = { actor: identity.user.id, role: identity.user.role };
        },
        dispatched: () => { dispatched = true; },
      });
      if (!alive.current || controller.signal.aborted) return;
      const target = "property_id" in receipt ? receipt.property_id : receipt.development_id;
      if (target !== id || receipt.offering_id !== null) throw new ApiError("INVALID_RESPONSE", 503);
      setUncertain(false); attempt.current = undefined; setOpen(false);
      router.replace(returnHref); router.refresh();
    } catch (problem) {
      if (!alive.current || controller.signal.aborted) return;
      const failure = problem instanceof ApiError ? problem : new ApiError("DEPENDENCY_UNAVAILABLE", 503);
      setError(failure);
      const lost = dispatched && (failure.status >= 500 || failure.code === "INVALID_RESPONSE");
      setUncertain(lost);
      if ([401, 403].includes(failure.status)) setDenied(true);
      if (!lost) attempt.current = undefined;
    } finally {
      lock.current = false;
      if (alive.current && !controller.signal.aborted) { setBusy(false); publishBusy(false); }
    }
  }
  return <AlertDialog open={open} onOpenChange={close}><AlertDialogTrigger asChild><Button ref={trigger} action="remove" type="button" variant="outline" disabled={!hydrated || busy} onClick={() => close(true)}>Supprimer {noun}</Button></AlertDialogTrigger>
    <AlertDialogContent onEscapeKeyDown={event => { if (busy || uncertain) event.preventDefault(); }}>
      <div className="grid gap-3"><AlertDialogTitle>Supprimer définitivement {noun} ?</AlertDialogTitle><AlertDialogDescription>
        {reference}. {kind === "developments" ? "Le programme et toutes ses unités seront supprimés du catalogue." : "Le bien sera supprimé du catalogue."} Les réservations seront libérées et les photos et vidéos supprimées. Les références historiques des affaires et paiements sont conservées. Cette suppression est définitive.
      </AlertDialogDescription></div>
      {error ? <RecordError error={error} /> : null}
      {uncertain ? <p role="status" className="text-sm">La réponse a été interrompue. Réessayez pour retrouver le résultat de cette suppression.</p> : null}
      <div className="flex flex-wrap justify-end gap-2"><AlertDialogCancel asChild><Button action="cancel" type="button" variant="outline" disabled={busy || uncertain} onClick={() => close(false)}>Annuler</Button></AlertDialogCancel><Button action={uncertain ? "retry" : "remove"} type="button" variant="destructive" disabled={!hydrated || busy || denied} onClick={() => void remove()}>{busy ? "Suppression…" : uncertain ? "Réessayer la suppression" : "Supprimer définitivement"}</Button></div>
    </AlertDialogContent></AlertDialog>;
}
