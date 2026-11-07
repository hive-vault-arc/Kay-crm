"use client";

import * as React from "react";
import { Tabs as Primitive } from "radix-ui";
import { cn } from "@/lib/utils";

// shadcn New York Tabs anatomy; KAY line selection, wrapping and touch targets.
export function Tabs({ className, ...props }: React.ComponentProps<typeof Primitive.Root>) {
  return <Primitive.Root data-slot="tabs" className={cn("grid min-w-0 gap-5", className)} {...props} />;
}
export function TabsList({ className, ...props }: React.ComponentProps<typeof Primitive.List>) {
  return <Primitive.List data-slot="tabs-list" className={cn("flex min-w-0 flex-wrap gap-1 border-b bg-transparent p-3", className)} {...props} />;
}
export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof Primitive.Trigger>) {
  return <Primitive.Trigger data-slot="tabs-trigger" className={cn("inline-flex min-h-control items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground", className)} {...props} />;
}
export function TabsContent({ className, ...props }: React.ComponentProps<typeof Primitive.Content>) {
  return <Primitive.Content data-slot="tabs-content" className={cn("min-w-0 outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring", className)} {...props} />;
}
