"use client";

import * as React from "react";
import { Dialog as Primitive } from "radix-ui";
import { cn } from "@/lib/utils";

export const Dialog = Primitive.Root;
export const DialogClose = Primitive.Close;

export function DialogContent({ className, ...props }: React.ComponentProps<typeof Primitive.Content>) {
  return <Primitive.Portal>
    <Primitive.Overlay className="fixed inset-0 z-50 bg-black/70" />
    <Primitive.Content className={cn("fixed inset-x-4 top-1/2 z-50 mx-auto grid max-h-[calc(100dvh-2rem)] max-w-entry -translate-y-1/2 gap-4 overflow-y-auto rounded-lg border bg-card p-4 shadow-lg sm:p-6", className)} {...props} />
  </Primitive.Portal>;
}

export function DialogTitle({ className, ...props }: React.ComponentProps<typeof Primitive.Title>) {
  return <Primitive.Title className={cn("text-section font-medium", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: React.ComponentProps<typeof Primitive.Description>) {
  return <Primitive.Description className={cn("text-sm text-muted-foreground", className)} {...props} />;
}
