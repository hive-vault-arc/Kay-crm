"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { navigationIntent } from "@/lib/navigation-intent";

export function useUnsavedGuard() {
  const [pending, setPending] = useState<{ run: () => void; dirty: HTMLElement[] }>();
  const trigger = useRef<HTMLElement | null>(null);
  const request = useCallback((run: () => void, scope: ParentNode = document) => {
    // Never interrupt a command whose result is still unknown.
    if (scope.querySelector('[aria-busy="true"]')) return;
    const dirty = Array.from(scope.querySelectorAll<HTMLElement>('[data-live-dirty="true"]'));
    if (!dirty.length) { run(); return; }
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setPending({ run, dirty });
  }, []);
  const dialog = <AlertDialog open={Boolean(pending)} onOpenChange={open => { if (!open) setPending(undefined); }}><AlertDialogContent onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus(); }}><AlertDialogTitle>Quitter la modification ?</AlertDialogTitle><AlertDialogDescription>Votre saisie n’est pas enregistrée. Restez ici pour la terminer ou quittez sans l’enregistrer.</AlertDialogDescription><div className="flex flex-wrap justify-end gap-2"><AlertDialogCancel asChild><Button action="back" variant="outline">Continuer la modification</Button></AlertDialogCancel><Button action="forward" variant="destructive" onClick={() => { if (!pending) return; const { run, dirty } = pending; dirty.forEach(node => { delete node.dataset.liveDirty; }); setPending(undefined); run(); if (typeof window !== "undefined") window.dispatchEvent(new Event("kay:draft-cleared")); }}>Quitter sans enregistrer</Button></div></AlertDialogContent></AlertDialog>;
  return { request, dialog };
}

export function WorkspaceNavigationGuard() {
  const router = useRouter();
  const { request, dialog } = useUnsavedGuard();
  useEffect(() => {
    function dirty(event: Event) {
      if (!(event.target instanceof Element) || event.target.closest("[data-filter-panel]")) return;
      const form = event.target.closest<HTMLElement>("form, [role=dialog], [role=alertdialog]");
      if (!form || form.hasAttribute("data-draft-managed") || form.querySelector('[data-action="filter"]')) return;
      if (form.querySelector('[data-action="search"]') && !form.querySelector('[data-action="save"], [data-action="confirm"], [data-action="create"], [data-action="upload"]')) return;
      form.dataset.liveDirty = "true";
    }
    const unload = (event: BeforeUnloadEvent) => { if (document.querySelector('[data-live-dirty="true"]')) { event.preventDefault(); event.returnValue = ""; } };
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
    window.addEventListener("beforeunload", unload); document.addEventListener("click", clicked, true); document.addEventListener("input", dirty); document.addEventListener("change", dirty);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", clicked, true); document.removeEventListener("input", dirty); document.removeEventListener("change", dirty); };
  }, [request, router]);
  return dialog;
}
