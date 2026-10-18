import type { KayIconComponent } from "@/components/icons";

export function DirectoryColumnHeading({ icon: Icon, label }: { icon: KayIconComponent; label: string }) {
  return <span className="inline-flex items-center gap-2 whitespace-nowrap"><Icon aria-hidden="true" className="size-4 shrink-0" />{label}</span>;
}
