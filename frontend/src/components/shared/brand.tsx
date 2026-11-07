import Image from "next/image";
import { cn } from "@/lib/utils";

export function Brand({ className, appearance = "black" }: { className?: string; appearance?: "black" | "transparent" }) {
  return <div data-brand-appearance={appearance} className={cn("kay-brand aspect-[60/34] w-15 shrink-0", className)}>
    <Image src="/images/workspace/kay-logo.svg" width={60} height={34} sizes="60px" alt="KAY" className="h-full w-full object-contain" preload />
  </div>;
}
