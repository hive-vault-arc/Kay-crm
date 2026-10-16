"use client";

import * as React from "react";
import { Tabs as Primitive } from "radix-ui";
import { cn } from "@/lib/utils";

// shadcn New York Tabs anatomy; KAY line selection, wrapping and touch targets.
export function Tabs({ className, ...props }: React.ComponentProps<typeof Primitive.Root>) {
  return <Primitive.Root data-slot="tabs" className={cn("grid min-w-0 gap-5", className)} {...props} />;
}
export function TabsList({ className, ...props }: React.ComponentProps<typeof Primitive.List>) {
  return <Primitive.List className={cn("flex flex-wrap gap-x-2 border-b bg-card px-2", className)} {...props} />;
}
export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof Primitive.Trigger>) {
  return <Primitive.Trigger className={cn("inline-flex min-h-control items-center justify-center border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 data-[state=active]:border-ring data-[state=active]:text-foreground", className)} {...props} />;
}
export function TabsContent({ className, ...props }: React.ComponentProps<typeof Primitive.Content>) {
  return <Primitive.Content data-slot="tabs-content" className={cn("min-w-0 outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring", className)} {...props} />;
}
