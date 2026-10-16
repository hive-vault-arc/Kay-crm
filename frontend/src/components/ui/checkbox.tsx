"use client";
import * as React from "react";
import { CheckIcon } from "@/components/icons";
import { Checkbox as Primitive } from "radix-ui";
import { cn } from "@/lib/utils";

export function Checkbox({ className, ...props }: React.ComponentProps<typeof Primitive.Root>) {
  return <Primitive.Root data-slot="checkbox" className={cn("peer flex size-5 shrink-0 items-center justify-center rounded-sm border border-input bg-card text-primary-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 data-[state=checked]:bg-primary", className)} {...props}><Primitive.Indicator><CheckIcon aria-hidden="true" className="size-4" /></Primitive.Indicator></Primitive.Root>;
}
