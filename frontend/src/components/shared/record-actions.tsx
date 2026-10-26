"use client";

import type { ReactNode } from "react";
import { MoreIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function RecordActions({ children, initialOpen = false }: { children: ReactNode; initialOpen?: boolean }) {
  return <Popover defaultOpen={initialOpen}><PopoverTrigger asChild><Button variant="outline"><MoreIcon size={16} aria-hidden="true" /><span>Actions</span></Button></PopoverTrigger><PopoverContent align="end" className="kay-directory-utilities" aria-label="Actions du dossier">{children}</PopoverContent></Popover>;
}
