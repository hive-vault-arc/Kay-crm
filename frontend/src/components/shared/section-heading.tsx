import type { ReactNode } from "react";
import type { KayIconComponent } from "@/components/icons";

export function SectionHeading({ icon: Icon, children, tone = "info", as: Tag = "h2", compact = false }: {
  icon: KayIconComponent;
  children: ReactNode;
  tone?: "info" | "purple" | "warning" | "teal";
  as?: "h2" | "h3" | "span";
  compact?: boolean;
}) {
  return <Tag data-tone={tone} data-compact={compact || undefined} className="kay-section-title"><Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />{children}</Tag>;
}
