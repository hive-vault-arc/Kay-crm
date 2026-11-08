"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inventoryRangeLabels, inventoryRangeProblem, type InventoryRangeKey, type InventoryRangeValues } from "./inventory-range";

export function InventoryRangeFields({ prefix, values, change, dimensions = true, error }: {
  prefix: string; values: InventoryRangeValues; change: (key: InventoryRangeKey, value: string) => void; dimensions?: boolean; error?: string;
}) {
  const problem = error ? inventoryRangeProblem(values) : undefined;
  const keys: InventoryRangeKey[] = dimensions ? ["min_comparison_mad", "max_comparison_mad", "min_area_sqm", "min_rooms"] : ["min_comparison_mad", "max_comparison_mad"];
  return <fieldset className="grid min-w-0 gap-4"><legend className="mb-3 text-sm font-semibold">Prix{dimensions ? " et caractéristiques" : ""}</legend>
    {keys.map(key => <div className="grid min-w-0 gap-2" key={key}><Label htmlFor={`${prefix}-${key}`}>{inventoryRangeLabels[key]}</Label><Input id={`${prefix}-${key}`} inputMode={key === "min_rooms" ? "numeric" : "decimal"} value={values[key]} maxLength={key === "min_rooms" ? 4 : 24} onChange={event => change(key, event.target.value)} aria-invalid={problem?.field === key || undefined} aria-describedby={`${prefix}-range-hint${problem?.field === key ? ` ${prefix}-range-error` : ""}`} /></div>)}
    <p id={`${prefix}-range-hint`} className="text-xs text-muted-foreground">Vente ou loyer annuel : les loyers mensuels sont multipliés par 12. Les locations vacances ne sont pas annualisées et sont exclues si un prix est demandé. Les valeurs inconnues ne satisfont pas un minimum.</p>
    {error ? <p id={`${prefix}-range-error`} role="alert" className="text-sm text-danger">{error}</p> : null}
  </fieldset>;
}
