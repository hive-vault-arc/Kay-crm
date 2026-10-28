"use client";

import { useEffect, useRef, useState } from "react";
import { websiteRequest, type Receipt } from "./website-client";
import { emptyWebsiteDraft, websiteSubmission } from "./website-draft";

export function useWebsiteRequest() {
  const [draft, setDraft] = useState(emptyWebsiteDraft), [receipt, setReceipt] = useState<Receipt | null>(null);
  const [busy, setBusy] = useState(false), [locked, setLocked] = useState(false), [error, setError] = useState("");
  const pending = useRef<string | null>(null), inFlight = useRef(false), abort = useRef<AbortController | null>(null);
  const knownReceipt = useRef<Receipt | null>(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; abort.current?.abort(); pending.current = null; knownReceipt.current = null; }; }, []);
  function change(key: keyof typeof emptyWebsiteDraft, value: string) {
    if (alive.current && Object.hasOwn(emptyWebsiteDraft, key) && !inFlight.current && !pending.current && !knownReceipt.current && !locked) { setDraft(current => ({ ...current, [key]: value })); setError(""); }
  }
  async function send() {
    if (!alive.current || inFlight.current || knownReceipt.current) return;
    if (!pending.current) {
      const prepared = websiteSubmission(draft, crypto.randomUUID(), new Date().toISOString());
      if (!prepared.ok) { setLocked(false); setError(prepared.error); return; }
      pending.current = prepared.body;
    }
    inFlight.current = true; setBusy(true); setError(""); setLocked(true);
    const controller = new AbortController(); abort.current = controller;
    try {
      const result = await websiteRequest("/submit", pending.current, controller.signal);
      if (alive.current && !controller.signal.aborted) { knownReceipt.current = result; setReceipt(result); setDraft(emptyWebsiteDraft); pending.current = null; }
    } catch (failure) {
      if (!alive.current || controller.signal.aborted) return;
      const status = failure instanceof Error ? failure.message : "";
      if (["422", "413"].includes(status)) {
        pending.current = null; setLocked(false);
        setError(status === "413" ? "La demande est trop volumineuse. Raccourcissez le texte, puis renvoyez la demande. Votre saisie est conservée et aucun reçu n’a été créé." : "Vérifiez le nom, le téléphone international, l’e-mail et la référence. La demande n’a pas été enregistrée.");
      } else setError(status === "429" ? "Trop d’envois. Patientez une minute, puis réessayez le même envoi." : "L’envoi n’a pas pu être confirmé. Réessayez le même envoi pour éviter un doublon.");
    } finally { inFlight.current = false; abort.current = null; if (alive.current && !controller.signal.aborted) setBusy(false); }
  }
  async function refresh() {
    const current = knownReceipt.current;
    if (!alive.current || !current || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    const controller = new AbortController(); abort.current = controller;
    try {
      const result = await websiteRequest("/receipt", JSON.stringify({ receipt_id: current.receipt_id }), controller.signal);
      if (!alive.current || controller.signal.aborted) return;
      if (result.receipt_id !== current.receipt_id) throw new Error("INVALID_RECEIPT");
      if (!controller.signal.aborted) { knownReceipt.current = result; setReceipt(result); }
    } catch { if (alive.current && !controller.signal.aborted) setError("Le suivi est indisponible. Votre reçu est conservé ici. Réessayez l’actualisation."); }
    finally { inFlight.current = false; abort.current = null; if (alive.current && !controller.signal.aborted) setBusy(false); }
  }
  function restart() {
    if (!alive.current || inFlight.current || knownReceipt.current?.state !== "processed") return;
    knownReceipt.current = null; pending.current = null; setReceipt(null); setDraft(emptyWebsiteDraft); setLocked(false); setError("");
  }
  return { draft, receipt, busy, locked, error, change, send, refresh, restart };
}
