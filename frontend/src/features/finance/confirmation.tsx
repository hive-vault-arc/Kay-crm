"use client";
import { useRef, type ReactNode, type RefObject } from "react";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function FinanceConfirmation({ title, children, busy, confirm, cancel, returnFocus }: { title: string; children: ReactNode; busy: boolean; confirm: () => void; cancel: () => void; returnFocus: RefObject<HTMLButtonElement | null> }) {
  const heading = useRef<HTMLHeadingElement>(null);
  return <AlertDialog open onOpenChange={open => { if (!open && !busy) cancel(); }}><AlertDialogContent onOpenAutoFocus={event => { event.preventDefault(); heading.current?.focus(); }} onCloseAutoFocus={event => { event.preventDefault(); returnFocus.current?.focus(); }}><AlertDialogTitle ref={heading} tabIndex={-1}>{title}</AlertDialogTitle><AlertDialogDescription>Confirmez cette opération distincte. Les montants et justificatifs d’origine restent conservés ; le serveur vérifie la version et le solde.</AlertDialogDescription>{children}<div className="flex flex-wrap gap-2"><Button action="confirm" type="button" disabled={busy} onClick={confirm}>{busy ? "Enregistrement…" : title}</Button><AlertDialogCancel asChild><Button action="cancel" type="button" variant="outline" disabled={busy} onClick={cancel}>Conserver ma saisie</Button></AlertDialogCancel></div></AlertDialogContent></AlertDialog>;
}
