"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiCommand } from "@/lib/api/command";
import { ApiError } from "@/lib/api/client";
import { RecordError } from "@/features/contacts/record-states";
import { exportSchema } from "./contracts";

export function ExportAction({ kind, filters, total, compact = false }: { compact?: boolean; kind: "contacts" | "enquiries"; filters: Record<string, string | number | undefined>; total: number }) {
  const [confirm, setConfirm] = useState(false), [pending, setPending] = useState(false), [error, setError] = useState<ApiError>(), [done, setDone] = useState(false);
  const attempt = useRef({ key: "", body: "" }), lock = useRef(false);
  async function submit() {
    if (lock.current) return;
    lock.current = true; setPending(true); setError(undefined);
    const clean = Object.fromEntries(Object.entries(filters).filter(([key, value]) => !["page", "page_size"].includes(key) && value !== "" && value !== undefined));
    const body = { kind, filters: clean }, fingerprint = JSON.stringify(body);
    if (attempt.current.body !== fingerprint) attempt.current = { key: crypto.randomUUID(), body: fingerprint };
    try { await apiCommand("/api/v1/exports", body, exportSchema, attempt.current.key); attempt.current = { key: "", body: "" }; setDone(true); setConfirm(false); }
    catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); }
    finally { lock.current = false; setPending(false); }
  }
  return <section className={compact ? `grid min-w-0 gap-3 ${confirm ? "basis-full" : ""}` : "grid min-w-0 gap-4 border-t pt-4"} aria-label="Export contrôlé"><div className="flex flex-wrap gap-2"><Button action="export" variant={compact ? "quiet" : "outline"} size={compact ? "compact" : "default"} disabled={pending} onClick={() => { setConfirm(!confirm); setDone(false); }}>Exporter les résultats filtrés</Button><Button action="file" asChild variant={compact ? "quiet" : "outline"} size={compact ? "compact" : "default"}><Link href="/leads?view=exports">Mes exports</Link></Button></div>{confirm ? <div className="grid max-w-reading gap-4"><p>Créer un CSV de tous les résultats filtrés ({total} {kind === "contacts" ? "contacts" : "demandes"} actuellement), pas seulement cette page ? Les données sont relues à la génération.</p><p className="text-sm text-muted-foreground">Téléphones conservés comme texte, cellules dangereuses neutralisées. Limite : 50 000 lignes / 20 Mio. Aucun document, note ou montant financier.</p><div className="flex flex-wrap gap-2"><Button action="export" disabled={pending} onClick={() => void submit()}>{pending ? "Demande en cours…" : "Confirmer l’export CSV"}</Button><Button action="cancel" variant="outline" disabled={pending} onClick={() => setConfirm(false)}>Annuler</Button></div></div> : null}{done ? <p role="status">Export demandé. Retrouvez son état et son téléchargement dans « Mes exports ».</p> : null}{error ? <RecordError error={error} retry={() => void submit()} /> : null}</section>;
}
