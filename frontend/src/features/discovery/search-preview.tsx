"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { usePathname } from "next/navigation";
import { ForwardIcon, SearchIcon } from "@/components/icons";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { searchSchema } from "./contracts";
import { searchFocusIndex, searchPageHref } from "./search-model";
import { SearchResultLink } from "./search-presentation";

export function DesktopSearch() {
  const [text, setText] = useState(""), [query, setQuery] = useState(""), [open, setOpen] = useState(false);
  const pathname = usePathname(), [route, setRoute] = useState(pathname);
  const input = useRef<HTMLInputElement>(null), anchor = useRef<HTMLDivElement>(null), popup = useRef<HTMLDivElement>(null), all = useRef<HTMLAnchorElement>(null), escaped = useRef(false);
  const id = useId(), trimmed = text.trim(), valid = trimmed.length >= 2 && trimmed.length <= 160;
  if (route !== pathname) { setRoute(pathname); setText(""); setQuery(""); setOpen(false); }
  useEffect(() => {
    if (trimmed.length < 2 || trimmed.length > 160) return;
    const timer = setTimeout(() => setQuery(trimmed), 300);
    return () => clearTimeout(timer);
  }, [trimmed]);
  useEffect(() => {
    const close = () => { setOpen(false); setText(""); setQuery(""); };
    window.addEventListener("popstate", close);
    return () => window.removeEventListener("popstate", close);
  }, []);
  function focusResult(last: boolean) {
    const links = popup.current?.querySelectorAll<HTMLAnchorElement>("[data-search-result]");
    if (links?.length) links[last ? links.length - 1 : 0].focus();
  }
  function fieldKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); escaped.current = true; setOpen(false); return; }
    if (!valid) return;
    if (event.key === "Enter") {
      event.preventDefault(); escaped.current = false; setOpen(true);
      if (all.current) all.current.click();
      else requestAnimationFrame(() => { if (input.current?.value.trim() === trimmed) all.current?.click(); });
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault(); escaped.current = false; setOpen(true);
      if (popup.current) focusResult(event.key === "ArrowUp");
      else requestAnimationFrame(() => { if (input.current?.value.trim() === trimmed) focusResult(event.key === "ArrowUp"); });
    }
  }
  return <Popover open={open && valid} onOpenChange={next => { if (next) escaped.current = false; setOpen(next && valid); }}><PopoverAnchor asChild><div className="kay-header-search" ref={anchor} role="search"><SearchIcon size={20} aria-hidden="true" /><Input ref={input} type="search" autoComplete="off" spellCheck={false} maxLength={160} placeholder="Rechercher…" aria-label="Recherche globale" aria-expanded={open && valid} aria-haspopup="dialog" aria-controls={open && valid ? id : undefined} value={text} onChange={event => { const value = event.target.value; setText(value); setOpen(value.trim().length >= 2 && value.trim().length <= 160); escaped.current = false; }} onFocus={() => { if (valid && !escaped.current) setOpen(true); }} onClick={() => { escaped.current = false; if (valid) setOpen(true); }} onKeyDown={fieldKey} /></div></PopoverAnchor>
    {open && valid ? <PopoverContent ref={popup} id={id} className="kay-search-popup" collisionPadding={12} align="end" aria-label="Suggestions de recherche" onOpenAutoFocus={event => event.preventDefault()} onEscapeKeyDown={() => { escaped.current = true; }} onInteractOutside={event => { if (anchor.current?.contains(event.target as Node)) event.preventDefault(); }} onCloseAutoFocus={event => { event.preventDefault(); if (escaped.current) input.current?.focus(); escaped.current = false; }} onPointerDown={event => {
      const links = Array.from(popup.current?.querySelectorAll<HTMLAnchorElement>("[data-search-result]") ?? []);
      if (links.some(link => link.contains(event.target as Node))) event.preventDefault();
    }} onKeyDown={event => {
      const links = Array.from(popup.current?.querySelectorAll<HTMLAnchorElement>("[data-search-result]") ?? []), current = links.findIndex(link => link.contains(event.target as Node));
      // The guard's return target must survive if navigation opens its confirmation.
      if (event.key === "Enter" && current >= 0) { event.preventDefault(); input.current?.focus(); links[current].click(); return; }
      const next = searchFocusIndex(event.key, current, links.length);
      if (next !== null) { event.preventDefault(); links[next]?.focus(); }
    }}>
      {query === trimmed ? <PreviewResults key={query} query={query} close={() => setOpen(false)} /> : <p role="status" className="kay-search-preview-note">Recherche en cours…</p>}
      <Link ref={all} prefetch={false} href={searchPageHref({ q: trimmed })} data-search-result className="kay-search-all" onClick={() => setOpen(false)}><SearchIcon size={16} aria-hidden="true" /><span>Voir tous les résultats</span><ForwardIcon size={16} aria-hidden="true" /></Link>
    </PopoverContent> : null}
  </Popover>;
}

function PreviewResults({ query, close }: { query: string; close: () => void }) {
  const result = useQuery(queryPath("search", { q: query, page: 1, page_size: 8 }), searchSchema);
  return result.error ? <RecordError error={result.error} retry={result.refresh} /> : !result.value ? <p role="status" className="kay-search-preview-note">Recherche en cours…</p> : <><p role="status" className="kay-search-preview-note">{result.value.total.toLocaleString("fr-MA")} résultat(s) accessible(s)</p>{result.value.items.length ? <ul>{result.value.items.slice(0, 8).map(item => <li key={item.kind + item.id}><SearchResultLink item={item} close={close} /></li>)}</ul> : <p className="kay-search-preview-note">Aucun résultat accessible.</p>}</>;
}
