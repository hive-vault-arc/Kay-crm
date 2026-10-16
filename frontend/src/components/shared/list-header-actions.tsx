import type { ReactNode } from "react";

export function ListHeaderActions({ primary, children }: { primary: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-w-0 max-w-full flex-wrap items-center gap-4">
      {primary}
      <div role="group" aria-label="Actions secondaires" className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
        {children}
      </div>
    </div>
  );
}
