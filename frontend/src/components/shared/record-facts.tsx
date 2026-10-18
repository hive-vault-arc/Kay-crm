import type { ReactNode } from "react";
import type { KayIconComponent } from "@/components/icons";

export function RecordFacts({ children, columns = 2 }: { children: ReactNode; columns?: 1 | 2 }) {
  return <dl data-summary data-columns={columns} className="record-facts">{children}</dl>;
}

export function RecordFact({ icon: Icon, label, children }: {
  icon: KayIconComponent;
  label: string;
  children: ReactNode;
}) {
  return <div className="grid min-w-0 content-start gap-1 sm:grid-cols-5 sm:gap-4">
    <dt className="flex min-w-0 items-start gap-2 sm:col-span-2"><Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><span>{label}</span></dt>
    <dd className="min-w-0 whitespace-pre-wrap wrap-anywhere sm:col-span-3">{children}</dd>
  </div>;
}
