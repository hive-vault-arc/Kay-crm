import { Skeleton } from "@/components/ui/skeleton";

export function OwnerLoading({ label = "Chargement des propriétaires" }: { label?: string }) {
  return <div role="status" aria-label={label} className="grid min-w-0 gap-3"><span className="sr-only">{label}</span><Skeleton className="h-7 w-40 max-w-full" /><div className="overflow-hidden rounded-md border bg-card"><Skeleton className="h-11 w-full rounded-none" />{[0, 1, 2].map(index => <div key={index} className="grid min-h-14 items-center gap-3 border-t px-3 py-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]"><Skeleton className="h-8 w-3/4" /><Skeleton className="hidden h-5 w-2/3 sm:block" /><Skeleton className="hidden h-5 w-1/2 sm:block" /></div>)}</div></div>;
}
