"use client";
import Link from "next/link";
import type { RefObject } from "react";
import { AlertIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ApiError } from "@/lib/api/client";

export function RecordError({ error, retry }: { error: ApiError; retry?: () => void }) {
  return <div data-motion-feedback className="kay-record-error"><AlertIcon aria-hidden="true" size={20} /><p role="alert">{error.code === "NOT_FOUND" ? "Cette fiche est introuvable ou vous n’y avez plus accès." : error.message}</p>{retry ? <Button action="retry" variant="outline" onClick={retry}>Réessayer</Button> : null}</div>;
}
export function CommandError({ error, reuse, dismiss, returnFocus, record = "demande" }: { error?: ApiError; reuse?: (id: string) => void; dismiss: () => void; returnFocus?: RefObject<HTMLButtonElement | null>; record?: "demande" | "affaire" | "propriétaire" }) {
  if (!error) return null;
  const duplicates = error.details?.contacts;
  return <div className="grid gap-4" role="alert">
    <p className="text-danger">{error.message}</p>
    {error.details?.responsible_agent ? <p>Agent responsable : <strong>{error.details.responsible_agent.display_name}</strong>. Aucun accès ni doublon n’a été créé.</p> : null}
    {duplicates && !reuse ? <div className="grid gap-2"><p>Ouvrez une fiche accessible pour examiner une fusion. Votre saisie reste ici.</p>{duplicates.map(contact => <Link key={contact.id} className="inline-flex min-h-control items-center text-link underline" href={`/contacts/${contact.id}`}>Ouvrir {contact.name}</Link>)}</div> : null}
    {duplicates && reuse ? <AlertDialog open onOpenChange={open => { if (!open) dismiss(); }}><AlertDialogContent onCloseAutoFocus={event => { if (returnFocus) { event.preventDefault(); returnFocus.current?.focus(); } }}><AlertDialogTitle>Réutiliser le contact existant ?</AlertDialogTitle><AlertDialogDescription>{record === "propriétaire" ? "Le numéro est déjà enregistré dans votre périmètre. Choisissez ce contact pour lui ajouter le rôle Propriétaire. Son identité, ses coordonnées et son agent seront conservés." : <>Le numéro est déjà enregistré dans votre périmètre. Choisissez le contact pour cette nouvelle {record}. Sa fiche ne sera pas remplacée par votre saisie et la {record} restera distincte.</>}</AlertDialogDescription><div className="grid gap-2">{duplicates.map(contact => <Button action="contact" key={contact.id} variant="outline" className="h-auto min-h-control whitespace-normal text-start" onClick={() => reuse(contact.id)}>Réutiliser {contact.name}</Button>)}</div><AlertDialogCancel asChild><Button action="cancel" variant="outline">Conserver ma saisie</Button></AlertDialogCancel></AlertDialogContent></AlertDialog> : null}
  </div>;
}
