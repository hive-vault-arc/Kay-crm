import type { ReactNode } from "react";
import type { KayIconComponent } from "@/components/icons";
import { TabsTrigger } from "@/components/ui/tabs";

export function InventoryTab({ value, icon: Icon, children }: { value: string; icon: KayIconComponent; children: ReactNode }) {
  return <TabsTrigger value={value} className="group gap-2 data-[state=active]:bg-accent">
    <Icon aria-hidden="true" className="size-4 shrink-0 group-data-[state=active]:text-link" />
    {children}
  </TabsTrigger>;
}

export function InventoryFact({ icon: Icon, label, children, wide = false, tone = "teal" }: {
  icon: KayIconComponent;
  label: string;
  children: ReactNode;
  wide?: boolean;
  tone?: "teal" | "info";
}) {
  return <div className={`grid min-w-0 grid-cols-[2rem_minmax(0,1fr)] content-start gap-2 ${wide ? "sm:col-span-2" : ""}`}>
    <span aria-hidden="true" className={`grid size-8 place-items-center rounded-sm ${tone === "teal" ? "bg-teal-background text-teal" : "bg-info-background text-info"}`}>
      <Icon aria-hidden="true" className="size-4" />
    </span>
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="wrap-anywhere text-sm font-medium">{children}</dd>
    </div>
  </div>;
}
