import Image from "next/image";
import { cn } from "@/lib/utils";

export function Brand({ className }: { className?: string }) {
  return <div className={cn("w-36 overflow-hidden rounded-sm bg-black", className)}>
    <Image src="/images/kay-logo.png" width={652} height={616} alt="KAY Real Estate" className="h-auto w-full" preload />
  </div>;
}
