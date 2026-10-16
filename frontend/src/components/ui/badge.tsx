import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Slot } from "radix-ui";

export const badgeVariants = cva("inline-flex max-w-full items-center rounded-sm border border-current/15 px-2 py-1 text-xs font-medium leading-4", {
  variants: { variant: {
    neutral: "bg-neutral-background text-neutral",
    info: "bg-info-background text-info",
    warning: "bg-warning-background text-warning",
    success: "bg-success-background text-success",
    danger: "bg-danger-background text-danger",
    purple: "bg-purple-background text-purple",
    teal: "bg-teal-background text-teal",
  } }, defaultVariants: { variant: "neutral" },
});

export function Badge({ className, variant = "neutral", asChild = false, ...props }: ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";
  return <Comp data-slot="badge" data-variant={variant} className={cn(badgeVariants({ variant }), className)} {...props} />;
}
