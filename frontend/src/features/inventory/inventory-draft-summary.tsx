import type { ReactNode } from "react";
import type { KayIconComponent } from "@/components/icons";

export function InventoryDraftSummary({ icon: Icon, title, facts, next, onlyFilled = false, wide = false }: {
  icon: KayIconComponent;
  title: string;
  facts: { label: string; value: ReactNode }[];
  next: string;
  onlyFilled?: boolean;
  wide?: boolean;
}) {
  const visibleFacts = onlyFilled ? facts.filter(fact => fact.value !== null && fact.value !== undefined && fact.value !== "") : facts;
  return <aside aria-label="Aperçu du dossier" className="surface grid min-w-0 content-start gap-5 self-start">
    <div className="flex min-w-0 items-center gap-3 border-b pb-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-warning-background text-warning"><Icon aria-hidden="true" className="size-5" /></span>
      <div className="min-w-0"><h2 className="text-section font-semibold">{title}</h2><p className="text-sm text-muted-foreground">Aperçu avant enregistrement</p></div>
    </div>
    <dl className={`grid min-w-0 gap-4 sm:grid-cols-2 ${wide ? "" : "xl:grid-cols-1 2xl:grid-cols-2"}`}>
      {visibleFacts.map(fact => <div key={fact.label} className="min-w-0"><dt className="mb-1 text-xs font-medium text-muted-foreground">{fact.label}</dt><dd className="wrap-anywhere text-sm font-medium">{fact.value || <span className="font-normal text-muted-foreground">Non renseigné</span>}</dd></div>)}
    </dl>
    <p className="border-t pt-4 text-sm text-muted-foreground">{next}</p>
  </aside>;
}
