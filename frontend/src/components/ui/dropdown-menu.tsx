"use client";

import * as React from "react";
import { DropdownMenu as Primitive } from "radix-ui";
import { CompletedIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

export const DropdownMenu = Primitive.Root;
export const DropdownMenuTrigger = Primitive.Trigger;
export const DropdownMenuRadioGroup = Primitive.RadioGroup;
export function DropdownMenuContent({ className, sideOffset = 8, ...props }: React.ComponentProps<typeof Primitive.Content>) {
  return <Primitive.Portal><Primitive.Content data-slot="dropdown-menu-content" sideOffset={sideOffset} className={cn("kay-menu z-50 min-w-48 rounded-lg border bg-popover p-2 text-popover-foreground shadow-lg outline-none", className)} {...props} /></Primitive.Portal>;
}
export function DropdownMenuItem({ className, ...props }: React.ComponentProps<typeof Primitive.Item>) {
  return <Primitive.Item data-slot="dropdown-menu-item" className={cn("flex min-h-control cursor-default items-center gap-3 rounded-control-compact px-3 py-2 text-label font-medium outline-none data-[highlighted]:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className)} {...props} />;
}
export function DropdownMenuRadioItem({ className, children, ...props }: React.ComponentProps<typeof Primitive.RadioItem>) {
  return <Primitive.RadioItem data-slot="dropdown-menu-item" className={cn("flex min-h-control cursor-default items-center gap-3 rounded-control-compact px-3 py-2 text-label font-medium outline-none data-[highlighted]:bg-accent", className)} {...props}>{children}<span className="ml-auto flex size-4 items-center"><Primitive.ItemIndicator><CompletedIcon size={16} aria-hidden="true" /></Primitive.ItemIndicator></span></Primitive.RadioItem>;
}
export function DropdownMenuLabel({ className, ...props }: React.ComponentProps<typeof Primitive.Label>) {
  return <Primitive.Label className={cn("px-3 py-2 text-xs font-medium text-muted-foreground", className)} {...props} />;
}
export function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof Primitive.Separator>) {
  return <Primitive.Separator className={cn("my-2 h-px bg-border", className)} {...props} />;
}
