import { Button } from "@/components/ui/button";

export function NumberedPages({ page, total, size, change, label = "Pages des Leads", compact = false, showPageSize = false }: { page: number; total: number; size: number; change: (page: number) => void; label?: string; compact?: boolean; showPageSize?: boolean }) {
  const last = Math.max(1, Math.ceil(total / size));
  const outside = page > last;
  const sizeHint = showPageSize ? ` · ${size} par page` : "";
  if (last === 1 && page === 1) return <p className="pt-2 text-xs text-muted-foreground" aria-label={label}>{total ? `1–${total} sur ${total}${sizeHint}` : "Aucun résultat"}</p>;
  const numbers = [...new Set([1, last, ...Array.from({ length: 5 }, (_, index) => page - 2 + index)])].filter(value => value >= 1 && value <= last).sort((a, b) => a - b);
  return <nav aria-label={label} className={`flex flex-wrap items-center justify-end gap-1 pt-3 ${compact ? "crm-directory-pagination" : "border-t"}`}><span className="mr-auto text-xs text-muted-foreground">{outside ? `Aucun résultat sur cette page · ${total} au total` : compact ? `${total ? (page - 1) * size + 1 : 0}–${Math.min(page * size, total)} sur ${total}${sizeHint}` : `Page ${page} sur ${last}`}</span><Button action="previous" variant="outline" size={compact ? "icon" : "default"} aria-label="Précédent" disabled={page <= 1} onClick={() => change(page - 1)}>{compact ? <span className="sr-only">Précédent</span> : "Précédent"}</Button>{numbers.map(value => <Button key={value} className="min-w-control" variant={page === value ? "default" : "ghost"} aria-label={`Page ${value}`} aria-current={page === value ? "page" : undefined} disabled={page === value} onClick={() => change(value)}>{value}</Button>)}<Button action="next" variant="outline" size={compact ? "icon" : "default"} aria-label="Suivant" disabled={page >= last} onClick={() => change(page + 1)}>{compact ? <span className="sr-only">Suivant</span> : "Suivant"}</Button></nav>;
}
