"use client";

import { useState, type ReactNode } from "react";
import { MoreIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function RecordActions({ children, initialOpen = false, disabled = false }: { children: ReactNode; initialOpen?: boolean; disabled?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  if (disabled && open) setOpen(false);
  return <Popover open={open && !disabled} onOpenChange={value => { if (!disabled) setOpen(value); }}><PopoverTrigger asChild><Button variant="outline" disabled={disabled}><MoreIcon size={16} aria-hidden="true" /><span>Actions</span></Button></PopoverTrigger><PopoverContent align="end" className="kay-directory-utilities" aria-label="Actions du dossier">{children}</PopoverContent></Popover>;
}
