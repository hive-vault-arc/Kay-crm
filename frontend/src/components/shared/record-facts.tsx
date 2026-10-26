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
  return <div className="kay-record-fact">
    <dt><Icon aria-hidden="true" size={16} /><span>{label}</span></dt>
    <dd>{children}</dd>
  </div>;
}
