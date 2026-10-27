"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { navigationIntent } from "@/lib/navigation-intent";
import { discardDraftAction } from "@/lib/discard-draft-action";
import { protectHistoryDrafts, type HistoryNavigation } from "@/lib/history-draft-guard";

// A caller may pass the form itself rather than a wrapper around it.
function scopeBusy(scope: ParentNode) {
  return Boolean((scope as HTMLElement).matches?.('[aria-busy="true"]') || scope.querySelector('[aria-busy="true"]'));
}
function scopeDrafts(scope: ParentNode) {
  const nodes = Array.from(scope.querySelectorAll<HTMLElement>('[data-live-dirty="true"]'));
  if ((scope as HTMLElement).matches?.('[data-live-dirty="true"]')) nodes.unshift(scope as HTMLElement);
  return nodes;
}

export function useUnsavedGuard() {
  const [pending, setPending] = useState<{ run: () => void | Promise<void>; scope: ParentNode; recovery: boolean }>();
  const trigger = useRef<HTMLElement | null>(null);
  const cancel = useCallback(() => setPending(undefined), []);
  const request = useCallback((run: () => void | Promise<void>, scope: ParentNode = document) => {
    // Never interrupt a command whose result is still unknown.
    if (scopeBusy(scope)) return;
    const dirty = scopeDrafts(scope);
    if (!dirty.length) { discardDraftAction(run, [], () => {}); return; }
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const recovery = Boolean((scope as HTMLElement).matches?.('[data-write-recovery="true"]') || scope.querySelector('[data-write-recovery="true"]'));
    setPending({ run, scope, recovery });
  }, []);
  const dialog = <AlertDialog open={Boolean(pending)} onOpenChange={open => { if (!open) setPending(undefined); }}><AlertDialogContent onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus(); }}><AlertDialogTitle>Quitter la modification ?</AlertDialogTitle><AlertDialogDescription>{pending?.recovery ? "L’opération peut déjà être enregistrée. Quitter abandonne sa récupération dans ce formulaire ; vérifiez ensuite l’historique." : "Votre saisie n’est pas enregistrée. Restez ici pour la terminer ou quittez sans l’enregistrer."}</AlertDialogDescription><div className="flex flex-wrap gap-2"><AlertDialogCancel asChild><Button action="back" variant="outline">Continuer la modification</Button></AlertDialogCancel><Button action="forward" variant="destructive" onClick={() => { if (!pending || scopeBusy(pending.scope)) return; const { run, scope } = pending; const dirty = scopeDrafts(scope); setPending(undefined); discardDraftAction(run, dirty, () => { if (typeof window !== "undefined") window.dispatchEvent(new Event("kay:draft-cleared")); }); }}>{pending?.recovery ? "Quitter le formulaire" : "Quitter sans enregistrer"}</Button></div></AlertDialogContent></AlertDialog>;
  return { request, dialog, cancel };
}

export function WorkspaceNavigationGuard() {
  const router = useRouter();
  const { request, dialog, cancel } = useUnsavedGuard();
  const [historyError, setHistoryError] = useState<{ retry: () => void }>();
  useEffect(() => {
    function dirty(event: Event) {
      if (!(event.target instanceof Element) || event.target.closest("[data-filter-panel]")) return;
      const form = event.target.closest<HTMLElement>("form, [role=dialog], [role=alertdialog]");
      if (!form || form.hasAttribute("data-draft-managed") || form.querySelector('[data-action="filter"]')) return;
      if (form.querySelector('[data-action="search"]') && !form.querySelector('[data-action="save"], [data-action="confirm"], [data-action="create"], [data-action="upload"]')) return;
      form.dataset.liveDirty = "true";
    }
    const protection = () => ({ dirty: Boolean(document.querySelector('[data-live-dirty="true"]')), busy: Boolean(document.querySelector('form[data-draft-managed][aria-busy="true"]')) });
    const unload = (event: BeforeUnloadEvent) => { const state = protection(); if (state.dirty || state.busy) { event.preventDefault(); event.returnValue = ""; } };
    const clicked = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || !(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!link) return;
      const next = navigationIntent({ href: link.href, current: location.href, target: link.target, download: link.hasAttribute("download"), modified: event.ctrlKey || event.metaKey || event.shiftKey || event.altKey });
      if (!next) return;
      if (document.querySelector('form[data-draft-managed][aria-busy="true"]')) { event.preventDefault(); event.stopPropagation(); return; }
      if (!document.querySelector('[data-live-dirty="true"]')) return;
      event.preventDefault(); event.stopPropagation();
      request(() => { const url = new URL(next); if (url.origin === location.origin) router.push(`${url.pathname}${url.search}${url.hash}`); else location.assign(url.href); });
    };
    const navigation = (window as Window & { navigation?: HistoryNavigation }).navigation;
    const releaseHistory = navigation?.currentEntry && typeof navigation.traverseTo === "function" ? protectHistoryDrafts({ navigation, target: window, protection, confirm: resume => { setHistoryError(undefined); request(resume); }, restoreFailed: retry => { cancel(); setHistoryError({ retry }); }, settled: () => { cancel(); setHistoryError(undefined); } }) : undefined;
    window.addEventListener("beforeunload", unload); document.addEventListener("click", clicked, true); document.addEventListener("input", dirty); document.addEventListener("change", dirty);
    return () => { releaseHistory?.(); window.removeEventListener("beforeunload", unload); document.removeEventListener("click", clicked, true); document.removeEventListener("input", dirty); document.removeEventListener("change", dirty); };
  }, [request, router, cancel]);
  return <>{dialog}{historyError ? <div role="alert" className="fixed inset-x-4 top-24 z-70 flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4 text-sm shadow-lg"><p className="min-w-0 flex-1">Le retour n’a pas abouti. Votre saisie reste ouverte. Réessayez le retour avant de naviguer.</p><Button action="retry" type="button" variant="outline" onClick={() => { setHistoryError(undefined); historyError.retry(); }}>Réessayer le retour</Button></div> : null}</>;
}
