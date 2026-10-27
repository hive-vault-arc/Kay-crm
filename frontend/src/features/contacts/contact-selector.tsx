"use client";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { contactsSchema, type ContactSummary } from "./contracts";
import { queryPath, useQuery } from "./use-query";
import { RecordError } from "./record-states";
import { NumberedPages } from "./numbered-pages";
import type { ApiError } from "@/lib/api/client";

export function ContactSelector({ choose, denied }: { choose: (contact: ContactSummary) => void; denied?: (error: ApiError) => void }) {
  const id = useId();
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const { value, error, refresh } = useQuery(queryPath("contacts", { q: query, page, page_size: 10 }), contactsSchema);
  useEffect(() => { if (error && [401, 403].includes(error.status)) denied?.(error); }, [error, denied]);
  return <div className="grid min-w-0 gap-4"><div className="grid gap-2"><Label htmlFor={`${id}-search`}>Rechercher un contact accessible</Label><div className="flex flex-wrap gap-2"><Input id={`${id}-search`} value={text} maxLength={160} className="min-w-0 flex-1" onChange={event => setText(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); setQuery(text); setPage(1); } }} /><Button action="search" type="button" variant="outline" onClick={() => { setQuery(text); setPage(1); }}>Rechercher</Button></div></div>
    {error ? <RecordError error={error} retry={refresh} /> : !value ? <p role="status">Chargement des contacts…</p> : <><ul className="grid min-w-0 gap-3">{value.items.map(contact => <li key={contact.id} className="min-w-0"><Button action="contact" type="button" variant="ghost" className="h-auto min-h-control w-full justify-start gap-3 rounded-[18px] bg-muted p-4 whitespace-normal text-left" aria-label={`Choisir ${contact.name}`} onClick={() => choose(contact)}><span className="grid min-w-0 flex-1 gap-1"><span className="wrap-anywhere font-medium">{contact.name}</span><span className="kay-contact-choice-meta"><span className="wrap-anywhere">{contact.primary_phone}</span><span className="wrap-anywhere">{contact.primary_agent.display_name}</span></span></span><span className="text-xs text-muted-foreground">Choisir</span></Button></li>)}</ul>{!value.items.length ? <p role="status">Aucun contact accessible ne correspond. Vous pouvez créer un nouveau contact.</p> : null}{value.total > 10 || page > 1 ? <NumberedPages page={page} size={10} total={value.total} change={setPage} label="Pages des contacts accessibles" /> : null}</>}
  </div>;
}
