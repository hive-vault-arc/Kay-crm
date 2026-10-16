"use client";
import { useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useHydrated } from "@/hooks/use-hydrated";

const receiptSchema = z.object({ receipt_id: z.uuid(), state: z.enum(["queued", "processed", "failed"]) }).strict();
type Receipt = z.infer<typeof receiptSchema>;
const states = { queued: "En attente de traitement", processed: "Demande traitée", failed: "Traitement indisponible" };
const empty = { name: "", phone: "", email: "", message: "" };
async function request(path: "/submit" | "/receipt", body: string) {
  const response = await fetch(path, { method: "POST", credentials: "omit", cache: "no-store", headers: { "Content-Type": "application/json" }, body, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(String(response.status));
  return receiptSchema.parse(await response.json());
}

export function WebsiteForm() {
  const hydrated = useHydrated();
  const [draft, setDraft] = useState(empty);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef<string | null>(null);
  const inFlight = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);
  async function send() {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(""); setLocked(true);
    pending.current ??= JSON.stringify({ ...draft, email: draft.email || null, submission_id: crypto.randomUUID(), submitted_at: new Date().toISOString() });
    try { setReceipt(await request("/submit", pending.current)); }
    catch (failure) {
      const status = failure instanceof Error ? failure.message : "";
      if (["422", "413"].includes(status)) {
        pending.current = null; setLocked(false);
        setError(status === "413" ? "La demande est trop volumineuse. Raccourcissez le message, puis renvoyez la demande. Votre saisie est conservée et aucun reçu n’a été créé." : "Vérifiez le nom, le téléphone international et l’e-mail. La demande n’a pas été enregistrée.");
      } else setError(status === "429" ? "Trop d’envois. Patientez une minute, puis réessayez le même envoi." : "L’envoi n’a pas pu être confirmé. Réessayez le même envoi pour éviter un doublon.");
    } finally { inFlight.current = false; setBusy(false); requestAnimationFrame(() => feedback.current?.focus()); }
  }
  async function refresh() {
    if (!receipt || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    try { setReceipt(await request("/receipt", JSON.stringify({ receipt_id: receipt.receipt_id }))); }
    catch { setError("Le suivi est indisponible. Votre reçu est conservé ici. Réessayez l’actualisation."); }
    finally { inFlight.current = false; setBusy(false); }
  }
  function restart() { pending.current = null; setReceipt(null); setDraft(empty); setLocked(false); setError(""); }
  return <main className="page-gutter mx-auto grid w-full max-w-reading gap-6 py-8">
    <header className="grid gap-2"><h1 className="text-page font-medium">Formulaire web local</h1><p className="text-muted-foreground">Simulation KAY : utilisez uniquement des données synthétiques. Aucun site réel n’est connecté.</p></header>
    {!hydrated ? <p role="status">Préparation du formulaire…</p> : null}
    {receipt ? <section className="grid gap-4" aria-labelledby="receipt-title">
      <h2 id="receipt-title" className="text-section font-medium">Reçu de la demande</h2>
      <div ref={feedback} tabIndex={-1} className="grid gap-2"><p role="status" className={receipt.state === "processed" ? "text-success" : receipt.state === "failed" ? "text-danger" : "text-info"}>{states[receipt.state]}</p><p>La réception est enregistrée. Ce reçu ne contient aucune information sur les contacts ou l’équipe.</p></div>
      <dl className="grid gap-2"><dt className="text-sm text-muted-foreground">Référence du reçu</dt><dd className="wrap-anywhere select-all">{receipt.receipt_id}</dd></dl>
      {receipt.state === "queued" ? <p>Le traitement continue en arrière-plan. Actualiser le suivi n’envoie pas une nouvelle demande.</p> : receipt.state === "failed" ? <p>Conservez cette référence pour le responsable local. Ne renvoyez pas la demande avec une nouvelle référence.</p> : null}
      <p className="text-sm text-muted-foreground">Le reçu reste dans cette page seulement. Conservez sa référence avant de fermer ou recharger.</p>
      <div className="flex flex-wrap gap-2"><Button action="refresh" variant="outline" disabled={busy} onClick={refresh}>{busy ? "Actualisation…" : "Actualiser le suivi"}</Button>{receipt.state === "processed" ? <Button action="create" disabled={busy} onClick={restart}>Nouvelle demande</Button> : null}</div>
    </section> : <form className="form-surface" onSubmit={event => { event.preventDefault(); void send(); }} aria-label="Demande synthétique">
      <fieldset disabled={!hydrated || busy || locked} className="grid min-w-0 gap-4">
        <legend className="mb-4 text-section font-medium">Votre demande synthétique</legend>
        <div className="grid gap-2"><Label htmlFor="website-name">Nom complet</Label><Input id="website-name" required maxLength={160} autoComplete="off" value={draft.name} onChange={event => { const name = event.target.value; setDraft(current => ({ ...current, name })); }} /></div>
        <div className="grid gap-2"><Label htmlFor="website-phone">Téléphone international</Label><Input id="website-phone" type="tel" required maxLength={48} autoComplete="off" aria-describedby="website-phone-help" value={draft.phone} onChange={event => { const phone = event.target.value; setDraft(current => ({ ...current, phone })); }} /><p id="website-phone-help" className="text-sm text-muted-foreground">Indiquez l’indicatif, par exemple +212, puis le numéro synthétique.</p></div>
        <div className="grid gap-2"><Label htmlFor="website-email">E-mail (facultatif)</Label><Input id="website-email" type="email" maxLength={254} autoComplete="off" value={draft.email} onChange={event => { const email = event.target.value; setDraft(current => ({ ...current, email })); }} /></div>
        <div className="grid gap-2"><Label htmlFor="website-message">Message (facultatif)</Label><Textarea id="website-message" maxLength={4000} value={draft.message} onChange={event => { const message = event.target.value; setDraft(current => ({ ...current, message })); }} /></div>
        <Button action="upload" type="submit" className="justify-self-start">{busy ? "Envoi…" : "Envoyer la demande"}</Button>
      </fieldset>
    </form>}
    {busy && !receipt ? <p role="status">Envoi en cours, ne fermez pas cette page.</p> : null}
    {error ? <div ref={!receipt ? feedback : undefined} tabIndex={-1} className="grid gap-4"><p role="alert" className="text-danger">{error}</p>{!receipt && locked ? <Button action="retry" className="justify-self-start" variant="outline" disabled={busy} onClick={send}>Réessayer le même envoi</Button> : null}</div> : null}
  </main>;
}
