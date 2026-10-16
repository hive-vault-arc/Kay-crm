import type { ReactNode } from "react";
import type { KayIconComponent } from "@/components/icons";

const tones = {
  info: "bg-info-background text-info",
  purple: "bg-purple-background text-purple",
  warning: "bg-warning-background text-warning",
  teal: "bg-teal-background text-teal",
};

export function SectionHeading({ icon: Icon, children, tone = "info", as: Tag = "h2" }: {
  icon: KayIconComponent;
  children: ReactNode;
  tone?: keyof typeof tones;
  as?: "h2" | "h3" | "span";
}) {
  return <Tag className="flex items-center gap-3 text-section font-semibold"><span className={`flex size-8 shrink-0 items-center justify-center rounded-sm ${tones[tone]}`}><Icon aria-hidden="true" className="size-4" /></span>{children}</Tag>;
}
