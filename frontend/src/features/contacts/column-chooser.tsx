"use client";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { parseColumnPreference } from "@/lib/table/column-preferences";
import { useHydrated } from "@/hooks/use-hydrated";

export const columnLabels = { name: "Contact", status: "Statut", budget: "Budget", rating: "Qualification", country: "Pays", languages: "Langues", email: "E-mail", responsibleAgent: "Agent responsable", source: "Source", provenance: "Provenance", receivedAt: "Réception", message: "Demande", updatedAt: "Modification" } as const;
export type ColumnId = keyof typeof columnLabels;
const defaults: ColumnId[] = ["name", "status", "budget", "rating", "source", "responsibleAgent", "updatedAt"];
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
  function move(index: number, target: number) {
    const next = [...visible];
    [next[index], next[target]] = [next[target], next[index]];
    change(next);
  }
  return <Sheet>
    <SheetTrigger asChild><Button action="columns" variant={compact ? "quiet" : "outline"} size={compact ? "compact" : "default"} disabled={!hydrated}>Colonnes</Button></SheetTrigger>
    <SheetContent side="right" className="kay-record-drawer">
      <SheetHeader className="kay-drawer-head">
        <SheetTitle>Colonnes des Leads</SheetTitle>
        <SheetDescription>La visibilité et l’ordre des colonnes sont mémorisés sur ce navigateur.</SheetDescription>
      </SheetHeader>
      <div className="kay-drawer-body flex-1">
        <fieldset className="grid gap-1">
          <legend className="mb-2 font-medium">Colonnes visibles</legend>
          {Object.entries(columnLabels).map(([id, label]) => <Label key={id} className="flex min-h-control cursor-pointer items-center gap-3 rounded-control-compact px-3 hover:bg-muted">
            <Checkbox checked={visible.includes(id as ColumnId)} disabled={id === "name"} onCheckedChange={checked => change(checked ? [...visible, id as ColumnId] : visible.filter(value => value !== id))} />
            {label}{id === "name" ? " (toujours visible)" : ""}
          </Label>)}
        </fieldset>
        <section aria-label="Ordre des colonnes">
          <h3 className="mb-2 font-medium">Ordre des colonnes visibles</h3>
          <ol className="divide-y">{visible.map((id, index) => <li className="flex items-center justify-between gap-2 py-1" key={id}>
            <span className="text-sm">{columnLabels[id]}</span>
            <div className="flex shrink-0 gap-1">
              <Button action="up" variant="quiet" size="icon" disabled={index === 0} aria-label={`Monter ${columnLabels[id]}`} onClick={() => move(index, index - 1)} />
              <Button action="down" variant="quiet" size="icon" disabled={index === visible.length - 1} aria-label={`Descendre ${columnLabels[id]}`} onClick={() => move(index, index + 1)} />
            </div>
          </li>)}</ol>
        </section>
      </div>
      <footer className="kay-upload-footer">
        <Button action="reset" variant="outline" onClick={() => change(defaults)}>Rétablir les colonnes</Button>
        <SheetClose asChild><Button action="confirm" variant="default">Terminer</Button></SheetClose>
      </footer>
    </SheetContent>
  </Sheet>;
}
