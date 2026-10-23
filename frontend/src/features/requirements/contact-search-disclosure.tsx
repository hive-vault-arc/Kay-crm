"use client";

import { useState } from "react";
import { RequirementPanel } from "./requirement-panel";

export function ContactSearchDisclosure({ contactId, writable }: { contactId: string; writable: boolean }) {
  const [open, setOpen] = useState(false);
  return <details className="min-w-0 border-t pt-3" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="min-h-control cursor-pointer content-center text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Gérer les recherches du contact</summary>
    {open ? <div className="pt-3"><RequirementPanel contactId={contactId} writable={writable} compact /></div> : null}
  </details>;
}
