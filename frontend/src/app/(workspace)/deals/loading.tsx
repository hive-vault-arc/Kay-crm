import { ResultsSkeleton } from "@/components/shared/results-skeleton";

export default function Loading() {
  return <div className="grid min-w-0 gap-4"><div className="h-28 rounded-md bg-muted/40" aria-hidden="true" /><ResultsSkeleton label="Chargement des affaires…" /></div>;
}
