"use client";
import { useState } from "react";
import { SearchIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useHydrated } from "@/hooks/use-hydrated";
import { usePhoneLayout } from "@/hooks/use-phone-layout";
import { DesktopSearch } from "./search-preview";
import { SearchWorkspace } from "./search-workspace";

export function SearchTrigger({ compact = false, sidebar = false, responsive = false }: { compact?: boolean; sidebar?: boolean; responsive?: boolean }) {
  const [open, setOpen] = useState(false), hydrated = useHydrated(), phone = usePhoneLayout();
  const preview = responsive && !compact && !sidebar && !phone, [wasPreview, setWasPreview] = useState(preview);
  if (wasPreview !== preview) { setWasPreview(preview); setOpen(false); }
  if (preview) return <DesktopSearch />;
  const iconOnly = compact || responsive && phone;
  return <Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild><Button variant="outline" size={iconOnly ? "icon" : "default"} aria-label="Rechercher" title={iconOnly ? "Rechercher" : undefined} data-sidebar-search={sidebar ? "true" : undefined} className={`w-full justify-start gap-3 ${iconOnly ? "justify-center px-0" : ""} ${sidebar ? "bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent" : "text-muted-foreground"}`} disabled={!hydrated}><SearchIcon size={20} aria-hidden="true" /><span className={iconOnly ? "sr-only" : "min-w-0"}>Rechercher…</span></Button></SheetTrigger>
    <SheetContent closeLabel="Fermer la recherche" className="kay-record-drawer"><SheetHeader className="kay-drawer-head"><SheetTitle>Recherche globale</SheetTitle><SheetDescription>Retrouvez une fiche, un bien ou un document dans votre périmètre.</SheetDescription></SheetHeader><div className="kay-drawer-body"><SearchWorkspace panel close={() => setOpen(false)} /></div></SheetContent>
  </Sheet>;
}
