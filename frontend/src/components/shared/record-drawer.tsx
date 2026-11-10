"use client";

import { useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { ButtonAction } from "@/components/ui/button-actions";
import { useHydrated } from "@/hooks/use-hydrated";
import { useUnsavedGuard } from "./unsaved-guard";

export function RecordDrawer({ label, title = label, description, action = "forward", children, initialOpen = false, busy = false, iconOnly = false, hideTrigger = false, onClosed, returnFocus, fallbackFocus, className }: {
  label: string; title?: string; description: string; action?: ButtonAction; children: ReactNode | ((close: () => void, saved: () => void) => ReactNode); initialOpen?: boolean; busy?: boolean; iconOnly?: boolean; hideTrigger?: boolean; onClosed?: () => void; returnFocus?: RefObject<HTMLElement | null>; fallbackFocus?: RefObject<HTMLElement | null>; className?: string;
}) {
  const [open, setOpen] = useState(initialOpen);
  const control = useId();
  const hydrated = useHydrated();
  const { request, dialog } = useUnsavedGuard();
  const closing = useRef(false);
  useLayoutEffect(() => {
    closing.current = !open;
    return () => { closing.current = false; };
  }, [open]);

  function finishClose() {
    setOpen(false);
  }

  function close() {
    if (!busy && open) request(finishClose, document.getElementById(control) ?? document);
  }

  return <>
    <Sheet open={open} onOpenChange={next => {
      if (!next) close();
      else if (!busy) setOpen(true);
    }}>
      {!hideTrigger ? <SheetTrigger asChild><Button action={action} variant={iconOnly ? "quiet" : "outline"} size={iconOnly ? "icon" : "default"} aria-label={iconOnly ? label : undefined} disabled={!hydrated || busy}><span className={iconOnly ? "sr-only" : undefined}>{label}</span></Button></SheetTrigger> : null}
      <SheetContent id={control} className={className ? `kay-record-drawer ${className}` : "kay-record-drawer"} closeLabel={`Fermer : ${title}`} onCloseAutoFocus={event => {
        if (returnFocus || fallbackFocus) {
          event.preventDefault();
          const target = returnFocus?.current?.isConnected ? returnFocus.current : fallbackFocus?.current;
          target?.focus();
        }
        // A parent-owned drawer can now unmount after Radix completes its exit.
        if (closing.current) {
          closing.current = false;
          onClosed?.();
        }
      }}>
        <SheetHeader className="kay-drawer-head"><SheetTitle>{title}</SheetTitle><SheetDescription>{description}</SheetDescription></SheetHeader>
        <div className="kay-drawer-body">{typeof children === "function" ? children(close, finishClose) : children}</div>
      </SheetContent>
    </Sheet>
    {dialog}
  </>;
}
