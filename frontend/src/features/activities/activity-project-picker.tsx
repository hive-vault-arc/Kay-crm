"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { ChevronDownIcon, DevelopmentIcon, PropertyIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { catalogueChoicesSchema, catalogueTargetKey, type CatalogueTarget } from "@/features/project-links/contracts";

export type ActivityProject = { target: CatalogueTarget; name: string; reference: string };
const pageSize = 8;
const maxProjects = 3;

export function ActivityProjectPicker({ selected, disabled, change }: {
  selected: ActivityProject[]; disabled: boolean; change: (projects: ActivityProject[]) => void;
}) {
  const heading = useId();
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const atLimit = selected.length >= maxProjects;
  return <fieldset className="kay-drawer-form-section grid min-w-0 gap-3">
    <legend className="mb-3 text-sm font-medium">Projets évoqués</legend>
    {selected.length ? <ul className="grid min-w-0 gap-2">{selected.map((project, index) => <li key={catalogueTargetKey(project.target)} className="flex min-w-0 items-center justify-between gap-2 rounded-md border px-3">
      <span className="min-w-0 wrap-anywhere text-sm">{project.name}{project.name !== project.reference ? <small className="block text-muted-foreground">{project.reference}</small> : null}</span>
      <Button action="close" type="button" variant="quiet" size="icon" disabled={disabled} aria-label={`Retirer ${project.name}`} onClick={() => change(selected.filter((_, position) => position !== index))} />
    </li>)}</ul> : null}
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverTrigger asChild><Button type="button" variant="outline" className="w-full justify-between" aria-describedby={heading} disabled={disabled || atLimit}><span>Choisir des projets</span><ChevronDownIcon size={16} aria-hidden="true" /></Button></PopoverTrigger>
      <PopoverContent aria-label="Catalogue des projets" align="start" collisionPadding={12} className="w-[var(--radix-popover-trigger-width)] min-w-0 max-w-[var(--radix-popover-content-available-width)] max-h-[min(24rem,var(--radix-popover-content-available-height))] overflow-y-auto overscroll-contain" onOpenAutoFocus={event => { event.preventDefault(); input.current?.focus(); }}>
        <ProjectSearch input={input} selected={selected} choose={project => { change([...selected, project]); setOpen(false); }} />
      </PopoverContent>
    </Popover>
    <p id={heading} className="text-xs text-muted-foreground">Jusqu’à trois projets. Ils seront ajoutés à la liste « Projets discutés » du dossier.</p>
  </fieldset>;
}

function ProjectSearch({ input, selected, choose }: {
  input: RefObject<HTMLInputElement | null>; selected: ActivityProject[]; choose: (project: ActivityProject) => void;
}) {
  const id = useId();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  return <>
    <div className="grid gap-2"><Label htmlFor={id}>Rechercher un projet</Label>
      <Input id={id} ref={input} type="search" maxLength={160} placeholder="Nom ou référence" value={search} onChange={event => setSearch(event.target.value)} />
    </div>
    {search.trim() !== query ? <p role="status" className="text-sm text-muted-foreground">Recherche en cours…</p> : <div key={query} className="grid min-w-0 gap-3">
      <CatalogueResults kind="developments" query={query} selected={selected} choose={choose} />
      <CatalogueResults kind="properties" query={query} selected={selected} choose={choose} />
    </div>}
  </>;
}

function CatalogueResults({ kind, query, selected, choose }: {
  kind: "developments" | "properties"; query: string; selected: ActivityProject[]; choose: (project: ActivityProject) => void;
}) {
  const [page, setPage] = useState(1);
  const result = useQuery(queryPath(kind, { q: query, page, page_size: pageSize }), catalogueChoicesSchema);
  const programmes = kind === "developments";
  const label = programmes ? "Programmes" : "Biens et unités";
  const items = result.value?.items.map(row => ({
    target: programmes ? { development_id: row.id } : { property_id: row.id },
    name: row.name || row.marketing_name || row.reference,
    reference: row.reference,
  }));
  return <section className="grid min-w-0 gap-2" aria-label={label}>
    <h3 className="text-sm font-medium">{label}</h3>
    {result.error ? <RecordError error={result.error} retry={result.refresh} /> : !items ? <p role="status" className="text-sm text-muted-foreground">Chargement…</p> : items.length ? <ul className="grid min-w-0 gap-1">{items.map(project => {
      const key = catalogueTargetKey(project.target);
      const chosen = selected.some(item => catalogueTargetKey(item.target) === key);
      return <li key={key} className="min-w-0"><Button type="button" variant="ghost" className="h-auto min-h-control w-full justify-start whitespace-normal text-start" disabled={chosen} onClick={() => choose(project)}>{programmes ? <DevelopmentIcon size={16} aria-hidden="true" /> : <PropertyIcon size={16} aria-hidden="true" />}<span className="min-w-0 wrap-anywhere">{project.name}{project.name !== project.reference ? <small className="block text-muted-foreground">{project.reference}</small> : null}</span></Button></li>;
    })}</ul> : <p className="text-sm text-muted-foreground">Aucun résultat.</p>}
    {result.value && (page > 1 || result.value.has_next) ? <div className="flex flex-wrap gap-2">
      <Button action="previous" type="button" variant="outline" disabled={page === 1} aria-label={`Page précédente · ${label}`} onClick={() => setPage(page - 1)}>Précédent</Button>
      <Button action="next" type="button" variant="outline" disabled={!result.value.has_next} aria-label={`Page suivante · ${label}`} onClick={() => setPage(page + 1)}>Suivant</Button>
    </div> : null}
  </section>;
}
