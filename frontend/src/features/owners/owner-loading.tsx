import { Skeleton } from "@/components/ui/skeleton";

export function OwnerLoading({ label, record = false }: { label: string; record?: boolean }) {
  if (record) return <div className="kay-sales-loading-record" role="status" aria-busy="true"><span className="sr-only">{label}</span><Skeleton aria-hidden="true" /><Skeleton aria-hidden="true" /></div>;
  return <div role="status" aria-busy="true" className="kay-party-section-loading"><span className="sr-only">{label}</span>{[0, 1, 2].map(index => <Skeleton key={index} aria-hidden="true" className="h-10" />)}</div>;
}
