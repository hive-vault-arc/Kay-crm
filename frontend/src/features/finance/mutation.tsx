"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { RecordError } from "@/features/contacts/record-states";
import { dealSchema } from "@/features/deals/contracts";
import { apiGet, ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { commissionSchema, mad, resultSchema, type Commission } from "./contracts";

export type Saved = (result: { id: string; version: number }) => void | Promise<void>;
export type Denied = (error: ApiError) => void;
export function useFinanceMutation(dealId: string, commissionId: string | undefined, saved: Saved, denied: Denied) {
  const [busy, setBusy] = useState(false), [error, setError] = useState<ApiError>(), [comparison, setComparison] = useState<{ version: number; commission?: Commission }>();
  const lock = useRef(false), attempt = useRef({ fingerprint: "", key: "" });
  const [latest, setLatest] = useState<Commission>();
  async function save(path: `/api/v1/${string}`, body: unknown) {
    if (lock.current) return false;
    lock.current = true; setBusy(true); setError(undefined); setComparison(undefined);
    const fingerprint = JSON.stringify({ path, body }); if (attempt.current.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };
    try { const result = await apiCommand(path, body, resultSchema, attempt.current.key); await saved(result); return true; }
    catch (failure) { const problem = failure instanceof ApiError ? failure : new ApiError("DEPENDENCY_UNAVAILABLE", 503); setError(problem); if (["FORBIDDEN", "NOT_FOUND", "UNAUTHENTICATED", "CONTACT_ARCHIVED"].includes(problem.code)) denied(problem); return false; }
    finally { lock.current = false; setBusy(false); }
  }
  async function compare() {
    if (lock.current) return; lock.current = true; setBusy(true);
    try { if (commissionId) { const current = await apiGet(`/api/v1/commissions/${commissionId}`, commissionSchema); setLatest(current); setComparison({ version: current.version, commission: current }); } else { const current = await apiGet(`/api/v1/deals/${dealId}`, dealSchema); setComparison({ version: current.version }); } }
    catch (failure) { const problem = failure instanceof ApiError ? failure : new ApiError("DEPENDENCY_UNAVAILABLE", 503); setError(problem); if (["FORBIDDEN", "NOT_FOUND", "UNAUTHENTICATED"].includes(problem.code)) denied(problem); }
    finally { lock.current = false; setBusy(false); }
  }
  return { busy, error, comparison, latest, save, compare, clear: () => { setError(undefined); setComparison(undefined); } };
}
export function FinanceFailure({ mutation, acceptVersion }: { mutation: ReturnType<typeof useFinanceMutation>; acceptVersion: (version: number) => void }) {
  if (!mutation.error) return null;
  return <section className="grid min-w-0 gap-4" aria-label="Reprise de l’action financière"><RecordError error={mutation.error} /><p>Votre saisie est conservée. Si la réponse a été interrompue, réessayez la même action sans la modifier. En cas de conflit, comparez avant de reprendre.</p><Button type="button" variant="outline" className="justify-self-start" disabled={mutation.busy} onClick={() => void mutation.compare()}>Comparer la version financière actuelle</Button>{mutation.comparison ? <section className="grid min-w-0 gap-4 border-y py-4" aria-label="Version financière actuelle"><p>Version actuelle : {mutation.comparison.version}</p>{mutation.comparison.commission ? <><p>Montant actuel : {mad(mutation.comparison.commission.current.amount_mad)}</p><p>Solde actuel : {mutation.comparison.commission.balance_mad === null ? "Commission non reconnue" : mad(mutation.comparison.commission.balance_mad)}</p><p>État : {mutation.comparison.commission.current.state === "recognized" ? "Reconnue" : "Prévue"}</p></> : null}<Button type="button" variant="outline" className="h-auto min-h-control justify-self-start whitespace-normal" onClick={() => { acceptVersion(mutation.comparison!.version); mutation.clear(); }}>Conserver ma saisie avec cette version</Button></section> : null}</section>;
}
