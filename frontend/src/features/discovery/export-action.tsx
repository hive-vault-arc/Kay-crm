"use client";

import Link from "next/link";
import { useCallback, useId, useRef, useState, type ReactNode, type Ref } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useDossierDraft } from "@/components/shared/dossier-form";
import { useDirectoryMenuFocus } from "@/components/shared/crm-presentation";
import { ApiError } from "@/lib/api/client";
import { useHydrated } from "@/hooks/use-hydrated";
import { RecordError } from "@/features/contacts/record-states";
import { exportReview, type ExportReview } from "./export-review";
import { useExportRequest } from "./use-export-request";

export function ExportTrigger({ compact, disabled, buttonRef, open }: { compact: boolean; disabled: boolean; buttonRef: Ref<HTMLButtonElement>; open: (returnFocus?: () => void) => void }) {
  const returnFocus = useDirectoryMenuFocus();
  return <Button action="export" ref={buttonRef} type="button" variant={compact ? "quiet" : "outline"} size={compact ? "compact" : "default"} disabled={disabled} onClick={() => open(returnFocus)}>Exporter les résultats filtrés</Button>;
}

export function ExportAction({ kind, filters, total, compact = false, renderActions, available = true, scopeError }: { compact?: boolean; kind: "contacts" | "enquiries"; filters: Record<string, string | number | undefined>; total: number; renderActions?: (actions: ReactNode) => ReactNode; available?: boolean; scopeError?: ApiError }) {
  const [review, setReview] = useState<ExportReview>();
  const [confirmed, setConfirmed] = useState(false), [done, setDone] = useState(false), [invalid, setInvalid] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const returnToMenu = useRef<(() => void) | undefined>(undefined);
  const hydrated = useHydrated(), confirmationId = useId();
  const denied = useCallback(() => { setReview(undefined); setConfirmed(false); }, []);
  const command = useExportRequest({ scopeError, denied, completed: () => { setDone(true); setReview(undefined); setConfirmed(false); } });
  const { pending, uncertain, error } = command, protectedOperation = pending || uncertain;
  if (command.denied && review) { setReview(undefined); setConfirmed(false); }
  const visibleReview = command.denied ? undefined : review;
  // Disposable confirmation never owns a draft; an unresolved command does.
  useDossierDraft(null, protectedOperation);
  function open(returnFocus?: () => void) {
    if (!hydrated || !available || !command.clear()) return;
    const snapshot = exportReview(kind, filters, total);
    returnToMenu.current = returnFocus;
    setInvalid(!snapshot); setConfirmed(false); setDone(false);
    if (snapshot) {
      setReview(snapshot);
    }
  }
  function close() { if (command.clear()) { setReview(undefined); setConfirmed(false); } }
  async function submit() {
    if (!hydrated || command.denied || !visibleReview || !confirmed) return;
    if (uncertain) await command.retry(); else await command.submit(visibleReview);
  }
  const actions = <><ExportTrigger compact={compact} buttonRef={trigger} disabled={!hydrated || !available || protectedOperation || command.denied} open={open} /><Button action="file" asChild variant={compact ? "quiet" : "outline"} size={compact ? "compact" : "default"} disabled={protectedOperation}><Link href="/leads?view=exports" prefetch={false} aria-disabled={protectedOperation} tabIndex={protectedOperation ? -1 : undefined} onClick={event => { if (command.locked()) event.preventDefault(); }}>Mes exports</Link></Button></>;
  return <>{renderActions ? renderActions(actions) : <div className="flex flex-wrap gap-2">{actions}</div>}{done ? <p role="status" className="text-sm text-success">Export demandé. Retrouvez-le dans « Mes exports ».</p> : null}{invalid ? <p role="alert" className="text-sm text-danger">Les filtres ne sont plus valides. Actualisez la liste avant de demander un export.</p> : null}{!visibleReview && error ? <RecordError error={error} /> : null}
    <Sheet open={Boolean(visibleReview)} onOpenChange={open => { if (!open) close(); }}><SheetContent className="kay-record-drawer" closeLabel="Fermer la confirmation d’export" showCloseButton={!protectedOperation} onCloseAutoFocus={event => { event.preventDefault(); if (trigger.current?.isConnected) trigger.current.focus(); else returnToMenu.current?.(); }} onEscapeKeyDown={event => { if (command.locked()) event.preventDefault(); }} onInteractOutside={event => { if (command.locked()) event.preventDefault(); }}>
      <SheetHeader className="kay-drawer-head"><SheetTitle>Exporter les résultats filtrés</SheetTitle><SheetDescription>Vérifiez le périmètre de cette demande CSV.</SheetDescription></SheetHeader>
      {visibleReview ? <form className="flex min-h-0 flex-1 flex-col" noValidate data-draft-managed aria-busy={protectedOperation} onSubmit={event => { event.preventDefault(); void submit(); }}>
        <div className="kay-drawer-body grid content-start gap-5"><section className="kay-record-entry"><h3>{visibleReview.total} {visibleReview.body.kind === "contacts" ? "contacts" : "prospects"} actuellement</h3><p className="text-sm text-muted-foreground">Tous les résultats filtrés, sur toutes les pages. Les filtres ci-dessous restent ceux de l’ouverture ; les données seront relues à la génération.</p><ul className="grid gap-2 text-sm">{visibleReview.labels.map(label => <li key={label} className="wrap-anywhere">{label}</li>)}</ul></section>
          <p className="text-sm text-muted-foreground">Téléphones conservés comme texte, cellules dangereuses neutralisées. Limite : 50 000 lignes / 20 Mio. Aucun document, note ou montant financier.</p>
          <Label className="flex min-h-control items-center gap-3" htmlFor={confirmationId}><Checkbox id={confirmationId} checked={confirmed} disabled={!hydrated || protectedOperation} onCheckedChange={value => { if (!command.locked() && !command.denied) setConfirmed(value === true); }} />Confirmer ce périmètre</Label>
          {error ? <><RecordError error={error} />{uncertain ? <p className="text-sm text-muted-foreground">{command.acknowledged ? "L’export est enregistré. Actualisez son résultat sans recréer la demande." : "La réponse est interrompue. L’export est peut-être enregistré. Réessayez cette même demande avant d’en créer une autre."}</p> : null}</> : null}
        </div><footer className="kay-upload-footer"><Button action="cancel" type="button" variant="outline" disabled={protectedOperation} onClick={close}>Annuler</Button><Button action={uncertain ? "retry" : "export"} type="submit" disabled={!hydrated || pending || !confirmed}>{pending ? "Demande…" : uncertain ? command.acknowledged ? "Actualiser le résultat" : "Réessayer la même demande" : "Créer l’export CSV"}</Button></footer>
      </form> : null}
    </SheetContent></Sheet>
  </>;
}
