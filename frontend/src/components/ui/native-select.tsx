import * as React from "react";
import { ChevronDownIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

// shadcn New York NativeSelect, adapted to KAY's existing field geometry/tokens.
export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return <div className="relative w-full">
    <select data-slot="native-select" className={cn("h-field w-full min-w-0 appearance-none rounded-md border border-input bg-card px-3 py-2 pr-10 text-base disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", className)} {...props} />
    <ChevronDownIcon aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2" />
  </div>;
}
