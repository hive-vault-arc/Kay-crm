"use client";

import * as React from "react";
import { AlertDialog as Primitive } from "radix-ui";
import { cn } from "@/lib/utils";

// shadcn New York AlertDialog anatomy with KAY spacing, scroll and reduced motion.
export const AlertDialog = Primitive.Root;
export const AlertDialogTrigger = Primitive.Trigger;
export const AlertDialogCancel = Primitive.Cancel;
export function AlertDialogContent({ className, ...props }: React.ComponentProps<typeof Primitive.Content>) {
  return <Primitive.Portal><Primitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
    <Primitive.Content className={cn("fixed inset-x-4 top-1/2 z-50 mx-auto grid max-h-[calc(100dvh-2rem)] max-w-entry -translate-y-1/2 gap-6 overflow-y-auto rounded-lg border bg-card p-4 shadow-lg sm:p-6", className)} {...props} />
  </Primitive.Portal>;
}
export function AlertDialogTitle(props: React.ComponentProps<typeof Primitive.Title>) {
  return <Primitive.Title className="text-section font-bold" {...props} />;
}
export function AlertDialogDescription(props: React.ComponentProps<typeof Primitive.Description>) {
  return <Primitive.Description className="text-sm text-muted-foreground" {...props} />;
}
