"use client";

import { useEffect, useRef } from "react";
import { Brand } from "@/components/shared/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useHydrated } from "@/hooks/use-hydrated";
import { useWebsiteRequest } from "./use-website-request";
import { websiteMessageLimit } from "./website-draft";

const states = { queued: "En attente de traitement", processed: "Demande traitée", failed: "Traitement indisponible" };
export function WebsiteForm() {
  const hydrated = useHydrated(), model = useWebsiteRequest();
  const { draft, receipt, busy, locked, error } = model;
  const feedback = useRef<HTMLDivElement>(null);
  useEffect(() => { if (receipt || error) feedback.current?.focus(); }, [receipt, error]);
  return <main className="kay-auth"><section className="kay-auth-card kay-surface" aria-labelledby="website-title">
    <Brand appearance="transparent" className="w-21" />
    <header className="kay-auth-header"><h1 id="website-title">Demande web</h1><p>Simulation locale · données synthétiques uniquement. Aucun site réel n’est connecté.</p></header>
    {!hydrated ? <p role="status">Préparation du formulaire…</p> : null}
    {receipt ? <section className="grid min-w-0 gap-4" aria-labelledby="receipt-title" aria-busy={busy}>
      <h2 id="receipt-title" className="text-section">Reçu de la demande</h2>
      <div ref={feedback} tabIndex={-1} className="grid min-w-0 gap-3"><p role="status"><Badge variant={receipt.state === "processed" ? "success" : receipt.state === "failed" ? "danger" : "info"}>{states[receipt.state]}</Badge></p><p className="text-sm text-muted-foreground">La réception est enregistrée. Ce reçu ne contient aucune information sur les contacts ou l’équipe.</p></div>
      <dl className="grid min-w-0 gap-2 rounded-xl border bg-muted/40 p-4"><dt className="text-xs text-muted-foreground">Référence du reçu</dt><dd className="wrap-anywhere select-all text-sm font-medium">{receipt.receipt_id}</dd></dl>
      {receipt.state === "queued" ? <p className="text-sm">Le traitement continue en arrière-plan. Actualiser le suivi n’envoie pas une nouvelle demande.</p> : receipt.state === "failed" ? <p className="text-sm">Conservez cette référence pour le responsable local. Ne renvoyez pas la demande avec une nouvelle référence.</p> : null}
      <p className="text-xs text-muted-foreground">Le reçu reste dans cette page seulement. Conservez sa référence avant de fermer ou recharger.</p>
      <div className="flex flex-wrap gap-2"><Button action="refresh" variant="outline" disabled={busy} onClick={model.refresh}>{busy ? "Actualisation…" : "Actualiser le suivi"}</Button>{receipt.state === "processed" ? <Button action="create" disabled={busy} onClick={model.restart}>Nouvelle demande</Button> : null}</div>
    </section> : <form data-draft-managed aria-busy={busy} onSubmit={event => { event.preventDefault(); void model.send(); }} aria-label="Demande synthétique">
      <fieldset disabled={!hydrated || busy || locked} className="grid min-w-0 gap-4">
        <legend className="sr-only">Votre demande synthétique</legend>
        <div className="grid gap-2"><Label htmlFor="website-name">Nom complet</Label><Input id="website-name" required maxLength={160} autoComplete="off" value={draft.name} onChange={event => model.change("name", event.target.value)} /></div>
        <div className="grid gap-2"><Label htmlFor="website-phone">Téléphone international</Label><Input id="website-phone" type="tel" required maxLength={48} autoComplete="off" aria-describedby="website-phone-help" value={draft.phone} onChange={event => model.change("phone", event.target.value)} /><p id="website-phone-help" className="text-xs text-muted-foreground">Indiquez l’indicatif, par exemple +212, puis le numéro synthétique.</p></div>
        <div className="grid gap-2"><Label htmlFor="website-email">E-mail (facultatif)</Label><Input id="website-email" type="email" maxLength={254} autoComplete="off" value={draft.email} onChange={event => model.change("email", event.target.value)} /></div>
        <div className="grid gap-2"><Label htmlFor="website-reference">Référence du bien (facultative)</Label><Input id="website-reference" maxLength={100} autoComplete="off" value={draft.property_reference} onChange={event => model.change("property_reference", event.target.value)} /></div>
        <div className="grid gap-2"><Label htmlFor="website-message">Votre demande (facultative)</Label><Textarea id="website-message" maxLength={4000} aria-describedby="website-message-help" value={draft.message} onChange={event => model.change("message", event.target.value)} /><p id="website-message-help" className="text-xs text-muted-foreground">{draft.property_reference.trim() ? `${websiteMessageLimit(draft.property_reference).toLocaleString("fr")} caractères pour la demande avec cette référence.` : "4 000 caractères maximum, référence comprise."}</p></div>
        <Button action="upload" type="submit" className="w-full">{busy ? "Envoi…" : "Envoyer la demande"}</Button>
      </fieldset>
    </form>}
    {busy && !receipt ? <p role="status" className="text-sm">Envoi en cours, ne fermez pas cette page.</p> : null}
    {error ? <div ref={!receipt ? feedback : undefined} tabIndex={-1} className="grid gap-3"><p role="alert" className="text-sm text-danger">{error}</p>{!receipt && locked ? <Button action="retry" className="w-full" variant="outline" disabled={busy} onClick={model.send}>Réessayer le même envoi</Button> : null}</div> : null}
  </section></main>;
}
