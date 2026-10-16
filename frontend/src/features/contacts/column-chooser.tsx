"use client";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { parseColumnPreference } from "@/lib/table/column-preferences";
import { useHydrated } from "@/hooks/use-hydrated";

export const columnLabels = { name: "Contact", status: "Statut", responsibleAgent: "Agent responsable", source: "Source", receivedAt: "Réception", message: "Demande", updatedAt: "Modification" } as const;
export type ColumnId = keyof typeof columnLabels;
const defaults: ColumnId[] = ["name", "status", "responsibleAgent", "source", "receivedAt"];
const storageKey = "kay:enquiries:columns:v1";
function subscribe(change: () => void) { window.addEventListener("storage", change); window.addEventListener("kay:columns-changed", change); return () => { window.removeEventListener("storage", change); window.removeEventListener("kay:columns-changed", change); }; }
function readPreference() { try { return localStorage.getItem(storageKey); } catch { return null; } }
export function useLeadColumns() {
  const raw = useSyncExternalStore(subscribe, readPreference, () => null);
  const [fallback, setFallback] = useState<ColumnId[]>();
  const [notice, setNotice] = useState("");
  let visible = fallback ?? defaults;
  try {
    const parsed = raw ? parseColumnPreference(JSON.parse(raw)) : null;
    if (!fallback && parsed?.list === "enquiries" && parsed.visibleColumns.includes("name") && parsed.visibleColumns.every(id => Object.hasOwn(columnLabels, id))) visible = parsed.visibleColumns as ColumnId[];
  } catch { /* Invalid presentation metadata never becomes record data. */ }
  function change(next: ColumnId[]) {
    try { localStorage.setItem(storageKey, JSON.stringify({ version: 1, list: "enquiries", visibleColumns: next })); setFallback(undefined); setNotice(""); window.dispatchEvent(new Event("kay:columns-changed")); }
    catch { setFallback(next); setNotice("Les colonnes sont appliquées ici, mais leur mémorisation est indisponible."); }
  }
  return { visible, change, notice };
}
export function ColumnChooser({ visible, change, compact = false }: { visible: ColumnId[]; change: (columns: ColumnId[]) => void; compact?: boolean }) {
  const hydrated = useHydrated();
  return <Sheet><SheetTrigger asChild><Button action="columns" variant={compact ? "quiet" : "outline"} size={compact ? "compact" : "default"} disabled={!hydrated}>Colonnes</Button></SheetTrigger><SheetContent side="right" className="overflow-y-auto"><SheetHeader><SheetTitle>Colonnes des Leads</SheetTitle><SheetDescription>Seuls les identifiants et leur ordre sont mémorisés sur ce navigateur, jamais les données des contacts.</SheetDescription></SheetHeader><div className="grid gap-6 p-4">
    <fieldset className="grid gap-2"><legend className="mb-2 font-medium">Colonnes visibles</legend>{Object.entries(columnLabels).map(([id, label]) => <Label key={id} className="flex min-h-control cursor-pointer items-center gap-2"><Checkbox checked={visible.includes(id as ColumnId)} disabled={id === "name"} onCheckedChange={checked => change(checked ? [...visible, id as ColumnId] : visible.filter(value => value !== id))} />{label}{id === "name" ? " (toujours visible)" : ""}</Label>)}</fieldset>
    <section className="grid gap-2" aria-label="Ordre des colonnes"><h3 className="font-medium">Ordre des colonnes visibles</h3>{visible.map((id, index) => <div className="grid gap-2 border-b pb-4" key={id}><span>{columnLabels[id]}</span><div className="flex flex-wrap gap-2"><Button action="up" variant="outline" disabled={index === 0} aria-label={`Monter ${columnLabels[id]}`} onClick={() => { const next = [...visible]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; change(next); }}>Monter</Button><Button action="down" variant="outline" disabled={index === visible.length - 1} aria-label={`Descendre ${columnLabels[id]}`} onClick={() => { const next = [...visible]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; change(next); }}>Descendre</Button></div></div>)}</section>
    <Button action="reset" variant="outline" onClick={() => change(defaults)}>Rétablir les colonnes</Button>
  </div></SheetContent></Sheet>;
}
