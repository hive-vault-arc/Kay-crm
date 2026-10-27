"use client";

import { useEffect, useRef, useState } from "react";
import { websiteRequest, type Receipt } from "./website-client";

const empty = { name: "", phone: "", email: "", message: "" };
export function useWebsiteRequest() {
  const [draft, setDraft] = useState(empty), [receipt, setReceipt] = useState<Receipt | null>(null);
  const [busy, setBusy] = useState(false), [locked, setLocked] = useState(false), [error, setError] = useState("");
  const pending = useRef<string | null>(null), inFlight = useRef(false), abort = useRef<AbortController | null>(null);
  const knownReceipt = useRef<Receipt | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  function change(key: keyof typeof empty, value: string) { if (!inFlight.current && !pending.current && !knownReceipt.current && !locked) setDraft(current => ({ ...current, [key]: value })); }
  async function send() {
    if (inFlight.current || knownReceipt.current) return;
    inFlight.current = true; setBusy(true); setError(""); setLocked(true);
    pending.current ??= JSON.stringify({ ...draft, email: draft.email || null, submission_id: crypto.randomUUID(), submitted_at: new Date().toISOString() });
    const controller = new AbortController(); abort.current = controller;
    try {
      const result = await websiteRequest("/submit", pending.current, controller.signal);
      if (!controller.signal.aborted) { knownReceipt.current = result; setReceipt(result); setDraft(empty); pending.current = null; }
    } catch (failure) {
      if (controller.signal.aborted) return;
      const status = failure instanceof Error ? failure.message : "";
      if (["422", "413"].includes(status)) {
        pending.current = null; setLocked(false);
        setError(status === "413" ? "La demande est trop volumineuse. Raccourcissez le message, puis renvoyez la demande. Votre saisie est conservée et aucun reçu n’a été créé." : "Vérifiez le nom, le téléphone international et l’e-mail. La demande n’a pas été enregistrée.");
      } else setError(status === "429" ? "Trop d’envois. Patientez une minute, puis réessayez le même envoi." : "L’envoi n’a pas pu être confirmé. Réessayez le même envoi pour éviter un doublon.");
    } finally { inFlight.current = false; abort.current = null; if (!controller.signal.aborted) setBusy(false); }
  }
  async function refresh() {
    const current = knownReceipt.current;
    if (!current || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    const controller = new AbortController(); abort.current = controller;
    try {
      const result = await websiteRequest("/receipt", JSON.stringify({ receipt_id: current.receipt_id }), controller.signal);
      if (result.receipt_id !== current.receipt_id) throw new Error("INVALID_RECEIPT");
      if (!controller.signal.aborted) { knownReceipt.current = result; setReceipt(result); }
    } catch { if (!controller.signal.aborted) setError("Le suivi est indisponible. Votre reçu est conservé ici. Réessayez l’actualisation."); }
    finally { inFlight.current = false; abort.current = null; if (!controller.signal.aborted) setBusy(false); }
  }
  function restart() {
    if (inFlight.current || knownReceipt.current?.state !== "processed") return;
    knownReceipt.current = null; pending.current = null; setReceipt(null); setDraft(empty); setLocked(false); setError("");
  }
  return { draft, receipt, busy, locked, error, change, send, refresh, restart };
}
