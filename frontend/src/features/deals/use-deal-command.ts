"use client";

import { useRef, useState } from "react";
import { apiGet, ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { dealSchema, resultSchema, type Deal } from "./contracts";

// Shared dossier/board boundary: reviewed body, stable retry identity, then authoritative reload.
export function useDealCommand(id: string, starting?: () => void) {
  const [fresh, setFresh] = useState<Deal>(), [busy, setBusy] = useState(false), [error, setError] = useState<ApiError>(), [notice, setNotice] = useState("");
  const lock = useRef(false), attempt = useRef({ fingerprint: "", key: "" });
  async function reload() { const current = await apiGet(`/api/v1/deals/${id}`, dealSchema); setFresh(current); return current; }
  async function mutate(path: `/api/v1/${string}`, body: unknown, method: "POST" | "PATCH" = "POST") {
    if (lock.current) return false;
    lock.current = true; setBusy(true); setError(undefined); setNotice(""); starting?.();
    const fingerprint = JSON.stringify({ path, body, method });
    if (attempt.current.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };
    try { await apiCommand(path, body, resultSchema, attempt.current.key, method); await reload(); setNotice("Modification enregistrée. L’historique conserve son auteur."); return true; }
    catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); return false; }
    finally { lock.current = false; setBusy(false); }
  }
  return { fresh, setFresh, busy, setBusy, error, setError, notice, setNotice, reload, mutate };
}
