"use client";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useHydrated } from "@/hooks/use-hydrated";
import { parseColumnPreference } from "@/lib/table/column-preferences";

export const columnLabels = { name: "Client et téléphone", status: "Étape", projects: "Projets", budget: "Budget", rating: "Qualification", source: "Source", country: "Pays", languages: "Langues", email: "E-mail", responsibleAgent: "Agent responsable", nextAction: "Prochaine action", updatedAt: "Modification" } as const;
export type ColumnId = keyof typeof columnLabels;
const defaults: ColumnId[] = ["name", "status", "projects", "budget", "rating", "responsibleAgent", "updatedAt"];
const storageKey = "kay:deals:columns:v1";
function subscribe(change: () => void) { window.addEventListener("storage", change); window.addEventListener("kay:columns-changed", change); return () => { window.removeEventListener("storage", change); window.removeEventListener("kay:columns-changed", change); }; }
function readPreference() { try { return localStorage.getItem(storageKey); } catch { return null; } }
export function useDealColumns() {
  const raw = useSyncExternalStore(subscribe, readPreference, () => null);
  const [fallback, setFallback] = useState<ColumnId[]>(); const [notice, setNotice] = useState("");
  let visible = fallback ?? defaults;
  try { const parsed = raw ? parseColumnPreference(JSON.parse(raw)) : null; if (!fallback && parsed?.list === "deals" && parsed.visibleColumns.includes("name") && parsed.visibleColumns.every(id => Object.hasOwn(columnLabels, id))) visible = parsed.visibleColumns as ColumnId[]; } catch { /* Presentation metadata is never record data. */ }
  function change(next: ColumnId[]) { try { localStorage.setItem(storageKey, JSON.stringify({ version: 1, list: "deals", visibleColumns: next })); setFallback(undefined); setNotice(""); window.dispatchEvent(new Event("kay:columns-changed")); } catch { setFallback(next); setNotice("Colonnes appliquées ici ; mémorisation indisponible."); } }
  return { visible, change, notice };
}
export function DealColumns({ visible, change, compact = false }: { visible: ColumnId[]; change: (value: ColumnId[]) => void; compact?: boolean }) {
  const hydrated = useHydrated();
  return <Sheet><SheetTrigger asChild><Button action="columns" variant={compact ? "quiet" : "outline"} size={compact ? "compact" : "default"} disabled={!hydrated}>Colonnes</Button></SheetTrigger><SheetContent side="right" className="kay-record-drawer"><SheetHeader className="kay-drawer-head"><SheetTitle>Colonnes des affaires</SheetTitle><SheetDescription>Seuls les identifiants des colonnes et leur ordre sont mémorisés, jamais les données des affaires.</SheetDescription></SheetHeader><div className="kay-drawer-body flex-1"><fieldset className="grid gap-2"><legend className="mb-2 font-medium">Colonnes visibles</legend>{Object.entries(columnLabels).map(([id, label]) => <Label key={id} className="flex min-h-control cursor-pointer items-center gap-3 rounded-control-compact px-3 hover:bg-muted"><Checkbox checked={visible.includes(id as ColumnId)} disabled={id === "name"} onCheckedChange={checked => change(checked ? [...visible, id as ColumnId] : visible.filter(v => v !== id))} />{label}{id === "name" ? " (toujours visible)" : ""}</Label>)}</fieldset><section className="grid gap-2" aria-label="Ordre des colonnes"><h3 className="font-medium">Ordre des colonnes visibles</h3>{visible.map((id, index) => <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2" key={id}><span>{columnLabels[id]}</span><div className="flex flex-wrap gap-2"><Button action="up" variant="outline" disabled={index === 0} aria-label={`Monter ${columnLabels[id]}`} onClick={() => { const next = [...visible]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; change(next); }}>Monter</Button><Button action="down" variant="outline" disabled={index === visible.length - 1} aria-label={`Descendre ${columnLabels[id]}`} onClick={() => { const next = [...visible]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; change(next); }}>Descendre</Button></div></div>)}</section></div><footer className="kay-upload-footer"><Button action="reset" variant="outline" onClick={() => change(defaults)}>Rétablir les colonnes</Button><SheetClose asChild><Button action="confirm">Terminer</Button></SheetClose></footer></SheetContent></Sheet>;
}
