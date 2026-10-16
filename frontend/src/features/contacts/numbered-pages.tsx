import { Button } from "@/components/ui/button";

export function NumberedPages({ page, total, size, change, label = "Pages des Leads" }: { page: number; total: number; size: number; change: (page: number) => void; label?: string }) {
  const last = Math.max(1, Math.ceil(total / size));
  const numbers = [...new Set([1, last, ...Array.from({ length: 5 }, (_, index) => page - 2 + index)])].filter(value => value >= 1 && value <= last).sort((a, b) => a - b);
  return <nav aria-label={label} className="flex flex-wrap items-center justify-end gap-1 border-t pt-3"><span className="mr-auto text-xs text-muted-foreground">Page {page} sur {last}</span><Button variant="outline" disabled={page <= 1} onClick={() => change(page - 1)}>Précédent</Button>{numbers.map(value => <Button key={value} className="min-w-control" variant={page === value ? "default" : "ghost"} aria-label={`Page ${value}`} aria-current={page === value ? "page" : undefined} disabled={page === value} onClick={() => change(value)}>{value}</Button>)}<Button variant="outline" disabled={page >= last} onClick={() => change(page + 1)}>Suivant</Button></nav>;
}
