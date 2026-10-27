"use client";

import * as React from "react";
import { Popover as Primitive } from "radix-ui";
import { cn } from "@/lib/utils";

export const Popover = Primitive.Root;
export const PopoverTrigger = Primitive.Trigger;
export const PopoverAnchor = Primitive.Anchor;
export function PopoverContent({ className, align = "end", sideOffset = 8, ...props }: React.ComponentProps<typeof Primitive.Content>) {
  return <Primitive.Portal><Primitive.Content data-slot="popover-content" align={align} sideOffset={sideOffset} className={cn("kay-menu z-50 grid min-w-60 gap-4 rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg outline-none", className)} {...props} /></Primitive.Portal>;
}
