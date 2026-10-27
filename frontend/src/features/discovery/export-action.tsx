"use client";

import Link from "next/link";
import { useId, useRef, useState, type ReactNode, type Ref } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useDossierDraft } from "@/components/shared/dossier-form";
import { useDirectoryMenuFocus } from "@/components/shared/crm-presentation";
import { apiCommand } from "@/lib/api/command";
import { ApiError } from "@/lib/api/client";
import { useHydrated } from "@/hooks/use-hydrated";
import { RecordError } from "@/features/contacts/record-states";
import { exportSchema } from "./contracts";
import { exportReview, type ExportReview } from "./export-review";

export function ExportTrigger({ compact, disabled, buttonRef, open }: { compact: boolean; disabled: boolean; buttonRef: Ref<HTMLButtonElement>; open: (returnFocus?: () => void) => void }) {
  const returnFocus = useDirectoryMenuFocus();
  return <Button action="export" ref={buttonRef} type="button" variant={compact ? "quiet" : "outline"} size={compact ? "compact" : "default"} disabled={disabled} onClick={() => open(returnFocus)}>Exporter les résultats filtrés</Button>;
}

export function ExportAction({ kind, filters, total, compact = false, renderActions }: { compact?: boolean; kind: "contacts" | "enquiries"; filters: Record<string, string | number | undefined>; total: number; renderActions?: (actions: ReactNode) => ReactNode }) {
  const [review, setReview] = useState<ExportReview>(), [pending, setPending] = useState(false), [error, setError] = useState<ApiError>();
  const [confirmed, setConfirmed] = useState(false), [done, setDone] = useState(false), [invalid, setInvalid] = useState(false);
  const attempt = useRef({ key: "", fingerprint: "" }), lock = useRef(false), trigger = useRef<HTMLButtonElement>(null);
  const returnToMenu = useRef<(() => void) | undefined>(undefined);
  const hydrated = useHydrated(), confirmationId = useId();
  // Confirmation is disposable UI; only the outstanding command blocks navigation.
  useDossierDraft(null, pending);
  function open(returnFocus?: () => void) {
    if (lock.current) return;
    const snapshot = exportReview(kind, filters, total);
    returnToMenu.current = returnFocus;
    setInvalid(!snapshot); setError(undefined); setConfirmed(false); setDone(false);
    if (snapshot) {
      if (attempt.current.fingerprint !== snapshot.fingerprint) attempt.current = { key: crypto.randomUUID(), fingerprint: snapshot.fingerprint };
      setReview(snapshot);
    }
  }
  function close() { if (!lock.current) { setReview(undefined); setError(undefined); setConfirmed(false); } }
  async function submit() {
    if (lock.current || !review || !confirmed) return;
    lock.current = true; setPending(true); setError(undefined);
    try {
      await apiCommand("/api/v1/exports", review.body, exportSchema, attempt.current.key);
      attempt.current = { key: "", fingerprint: "" }; setDone(true); setReview(undefined); setConfirmed(false);
    } catch (reason) {
      const failure = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503);
      setError(failure);
      if ([401, 403, 404].includes(failure.status)) { setReview(undefined); setConfirmed(false); }
    }
    finally { lock.current = false; setPending(false); }
  }
  const actions = <><ExportTrigger compact={compact} buttonRef={trigger} disabled={!hydrated || pending} open={open} /><Button action="file" asChild variant={compact ? "quiet" : "outline"} size={compact ? "compact" : "default"}><Link href="/leads?view=exports" prefetch={false}>Mes exports</Link></Button></>;
  return <>{renderActions ? renderActions(actions) : <div className="flex flex-wrap gap-2">{actions}</div>}{done ? <p role="status" className="text-sm text-success">Export demandé. Retrouvez-le dans « Mes exports ».</p> : null}{invalid ? <p role="alert" className="text-sm text-danger">Les filtres ne sont plus valides. Actualisez la liste avant de demander un export.</p> : null}{!review && error ? <RecordError error={error} /> : null}
    <Sheet open={Boolean(review)} onOpenChange={open => { if (!open) close(); }}><SheetContent className="kay-record-drawer" closeLabel="Fermer la confirmation d’export" showCloseButton={!pending} onCloseAutoFocus={event => { event.preventDefault(); if (trigger.current?.isConnected) trigger.current.focus(); else returnToMenu.current?.(); }} onEscapeKeyDown={event => { if (lock.current) event.preventDefault(); }} onInteractOutside={event => { if (lock.current) event.preventDefault(); }}>
      <SheetHeader className="kay-drawer-head"><SheetTitle>Exporter les résultats filtrés</SheetTitle><SheetDescription>Vérifiez le périmètre de cette demande CSV.</SheetDescription></SheetHeader>
      {review ? <form className="flex min-h-0 flex-1 flex-col" noValidate data-draft-managed aria-busy={pending} onSubmit={event => { event.preventDefault(); void submit(); }}>
        <div className="kay-drawer-body grid content-start gap-5"><section className="kay-record-entry"><h3>{review.total} {review.body.kind === "contacts" ? "contacts" : "prospects"} actuellement</h3><p className="text-sm text-muted-foreground">Tous les résultats filtrés, sur toutes les pages. Les filtres ci-dessous restent ceux de l’ouverture ; les données seront relues à la génération.</p><ul className="grid gap-2 text-sm">{review.labels.map(label => <li key={label} className="wrap-anywhere">{label}</li>)}</ul></section>
          <p className="text-sm text-muted-foreground">Téléphones conservés comme texte, cellules dangereuses neutralisées. Limite : 50 000 lignes / 20 Mio. Aucun document, note ou montant financier.</p>
          <Label className="flex min-h-control items-center gap-3" htmlFor={confirmationId}><Checkbox id={confirmationId} checked={confirmed} disabled={!hydrated || pending} onCheckedChange={value => setConfirmed(value === true)} />Confirmer ce périmètre</Label>
          {error ? <><RecordError error={error} /><p className="text-sm text-muted-foreground">Une réponse interrompue peut avoir été enregistrée. Réessayez cette même demande ou vérifiez « Mes exports » avant d’en créer une autre.</p></> : null}
        </div><footer className="kay-upload-footer"><Button action="cancel" type="button" variant="outline" disabled={pending} onClick={close}>Annuler</Button><Button action="export" type="submit" disabled={!hydrated || pending || !confirmed}>{pending ? "Demande…" : error ? "Réessayer la demande" : "Créer l’export CSV"}</Button></footer>
      </form> : null}
    </SheetContent></Sheet>
  </>;
}
