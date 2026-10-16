import Image from "next/image";
import { cn } from "@/lib/utils";

export function Brand({ className, appearance = "black" }: { className?: string; appearance?: "black" | "transparent" }) {
  const transparent = appearance === "transparent";
  return <div className={cn("flex aspect-[652/616] w-36 items-center overflow-hidden rounded-sm", !transparent && "bg-black", className)}>
    <Image src={transparent ? "/images/kay-champagne-gold.png" : "/images/kay-luxury-gold.png"} width={transparent ? 1030 : 805} height={transparent ? 680 : 555} sizes="144px" alt="KAY Real Estate" className="h-auto w-full" preload />
  </div>;
}
