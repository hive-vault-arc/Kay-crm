"use client";

import { useId, useState, type ReactNode, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { ButtonAction } from "@/components/ui/button-actions";
import { useHydrated } from "@/hooks/use-hydrated";
import { useUnsavedGuard } from "./unsaved-guard";

export function RecordDrawer({ label, title = label, description, action = "forward", children, initialOpen = false, busy = false, iconOnly = false, hideTrigger = false, onClosed, returnFocus, fallbackFocus }: {
  label: string; title?: string; description: string; action?: ButtonAction; children: ReactNode | ((close: () => void, saved: () => void) => ReactNode); initialOpen?: boolean; busy?: boolean; iconOnly?: boolean; hideTrigger?: boolean; onClosed?: () => void; returnFocus?: RefObject<HTMLElement | null>; fallbackFocus?: RefObject<HTMLElement | null>;
}) {
  const [open, setOpen] = useState(initialOpen);
  const control = useId();
  const hydrated = useHydrated();
  const { request, dialog } = useUnsavedGuard();
  const close = () => { if (!busy) request(() => { setOpen(false); onClosed?.(); }, document.getElementById(control) ?? document); };
  return <><Sheet open={open} onOpenChange={next => { if (next && !busy) setOpen(true); else if (!next) close(); }}><SheetTrigger asChild><Button hidden={hideTrigger} className={hideTrigger ? "hidden" : undefined} action={action} variant={iconOnly ? "quiet" : "outline"} size={iconOnly ? "icon" : "default"} aria-label={iconOnly ? label : undefined} disabled={!hydrated || busy}><span className={iconOnly ? "sr-only" : undefined}>{label}</span></Button></SheetTrigger><SheetContent id={control} className="kay-record-drawer" closeLabel={`Fermer : ${title}`} onCloseAutoFocus={event => { if (returnFocus || fallbackFocus) { event.preventDefault(); const target = returnFocus?.current?.isConnected ? returnFocus.current : fallbackFocus?.current; target?.focus(); } }}><SheetHeader className="kay-drawer-head"><SheetTitle>{title}</SheetTitle><SheetDescription>{description}</SheetDescription></SheetHeader><div className="kay-drawer-body">{typeof children === "function" ? children(close, () => { setOpen(false); onClosed?.(); }) : children}</div></SheetContent></Sheet>{dialog}</>;
}
