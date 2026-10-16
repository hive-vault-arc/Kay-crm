"use client";
import * as React from "react";
import { RadioIndicatorIcon } from "@/components/icons";
import { RadioGroup as Primitive } from "radix-ui";
import { cn } from "@/lib/utils";

export function RadioGroup({ className, ...props }: React.ComponentProps<typeof Primitive.Root>) {
  return <Primitive.Root data-slot="radio-group" className={cn("grid gap-4", className)} {...props} />;
}
export function RadioGroupItem({ className, ...props }: React.ComponentProps<typeof Primitive.Item>) {
  return <Primitive.Item data-slot="radio-group-item" className={cn("flex size-5 shrink-0 items-center justify-center rounded-full border border-input bg-card text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50", className)} {...props}><Primitive.Indicator><RadioIndicatorIcon aria-hidden="true" className="size-3 fill-primary" /></Primitive.Indicator></Primitive.Item>;
}
