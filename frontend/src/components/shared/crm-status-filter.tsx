"use client";
import { Checkbox } from "@/components/ui/checkbox";

export function CrmStatusFilter({ label, labels, counts, value, change }: { label: string; labels: Record<string, string>; counts?: Record<string, number>; value: string; change: (value: string) => void }) {
  return <fieldset className="crm-status-filter"><legend>{label}</legend><div>{Object.entries(labels).map(([id, name]) => <label key={id} data-crm-state={id} data-selected={value === id || undefined}><Checkbox aria-label={name} checked={value === id} onCheckedChange={checked => change(checked ? id : "")} /><span className="crm-status-dot" aria-hidden="true" /><span>{name}</span>{counts ? <span className="crm-status-filter-count">{counts[id] ?? 0}</span> : null}</label>)}</div></fieldset>;
}
