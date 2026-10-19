import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return <section aria-busy="true" aria-label="Chargement des indicateurs" className="grid min-w-0 gap-4">
    <p role="status" className="text-sm text-muted-foreground">Chargement des indicateurs…</p>
    <div aria-hidden="true" className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {Array.from({ length: 5 }, (_, index) => <div key={index} className="surface grid min-h-28 gap-3"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-9 w-1/2" /><Skeleton className="h-3 w-3/4" /></div>)}
    </div>
    <div aria-hidden="true" className="grid min-w-0 gap-4 lg:grid-cols-2">
      {[0, 1].map(item => <div key={item} className="surface grid min-h-48 content-start gap-5"><Skeleton className="h-5 w-1/3" /><Skeleton className="h-28 w-full" /></div>)}
    </div>
  </section>;
}

export function DashboardListSkeleton({ label }: { label: string }) {
  return <div aria-busy="true" aria-label={label} className="grid min-w-0 gap-3">
    <p role="status" className="text-sm text-muted-foreground">{label}</p>
    <div aria-hidden="true" className="grid gap-4">
      {[0, 1, 2].map(item => <div key={item} className="grid gap-2 border-t pt-3"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-5/6" /></div>)}
    </div>
  </div>;
}
