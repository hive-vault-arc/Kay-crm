import { Skeleton } from "@/components/ui/skeleton";

export function ResultsSkeleton({ label }: { label: string }) {
  return <section aria-busy="true" aria-label={label} className="grid min-w-0 gap-3">
    <p role="status" className="text-sm text-muted-foreground">{label}</p>
    <div aria-hidden="true" className="grid min-w-0 gap-0 overflow-hidden rounded-md border bg-card">
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-b bg-muted/40 p-3">
        {[0, 1, 2, 3].map(item => <Skeleton key={item} className="h-4 w-3/4" />)}
      </div>
      {Array.from({ length: 7 }, (_, index) => <div key={index} className="grid min-h-12 grid-cols-[2fr_1fr_1fr_1fr] items-center gap-4 border-b p-3 last:border-b-0">
        <div className="flex items-center gap-3"><Skeleton className="size-8 shrink-0 rounded-full" /><Skeleton className="h-4 w-3/5" /></div>
        <Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-2/3" /><Skeleton className="h-4 w-4/5" />
      </div>)}
    </div>
  </section>;
}
