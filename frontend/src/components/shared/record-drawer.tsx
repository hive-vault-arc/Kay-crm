"use client";

import { useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { ButtonAction } from "@/components/ui/button-actions";
import { useHydrated } from "@/hooks/use-hydrated";
import { useUnsavedGuard } from "./unsaved-guard";

export function RecordDrawer({ label, title = label, description, action = "forward", children, initialOpen = false, busy = false }: {
  label: string; title?: string; description: string; action?: ButtonAction; children: ReactNode | ((close: () => void, saved: () => void) => ReactNode); initialOpen?: boolean; busy?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  const control = useId();
  const hydrated = useHydrated();
  const { request, dialog } = useUnsavedGuard();
  const close = () => { if (!busy) request(() => setOpen(false), document.getElementById(control) ?? document); };
  return <><Sheet open={open} onOpenChange={next => { if (next && !busy) setOpen(true); else if (!next) close(); }}><SheetTrigger asChild><Button action={action} variant="outline" disabled={!hydrated || busy}>{label}</Button></SheetTrigger><SheetContent id={control} className="kay-record-drawer" closeLabel={`Fermer : ${title}`}><SheetHeader className="kay-drawer-head"><SheetTitle>{title}</SheetTitle><SheetDescription>{description}</SheetDescription></SheetHeader><div className="kay-drawer-body">{typeof children === "function" ? children(close, () => setOpen(false)) : children}</div></SheetContent></Sheet>{dialog}</>;
}
