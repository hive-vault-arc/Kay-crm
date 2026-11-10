"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { RecordDrawer } from "@/components/shared/record-drawer";
import { Button } from "@/components/ui/button";
import { useHydrated } from "@/hooks/use-hydrated";

export function ProjectEditLink({ href, label, title, description, busy, children }: {
  href: string; label: string; title: string; description: string; busy: boolean;
  children: (close: () => void, saved: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLAnchorElement>(null);
  const hydrated = useHydrated();
  return <>
    <Button action="edit" asChild variant="outline"><Link href={href} ref={trigger} prefetch={false} aria-haspopup="dialog" aria-disabled={busy || undefined} onNavigate={event => {
      if (!hydrated && !busy) return;
      event.preventDefault();
      if (!busy) setOpen(true);
    }}>{label}</Link></Button>
    {open ? <RecordDrawer className="kay-project-form-drawer" label={label} title={title} description={description} busy={busy} initialOpen hideTrigger returnFocus={trigger} onClosed={() => setOpen(false)}>{children}</RecordDrawer> : null}
  </>;
}
