"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { contactsSchema, type ContactSummary } from "./contracts";
import { queryPath, useQuery } from "./use-query";
import { RecordError } from "./record-states";

export function ContactSelector({ choose }: { choose: (contact: ContactSummary) => void }) {
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const { value, error, refresh } = useQuery(queryPath("contacts", { q: query, page, page_size: 10 }), contactsSchema);
  return <div className="grid min-w-0 gap-4"><div className="grid gap-2"><Label htmlFor="contact-search">Rechercher un contact accessible</Label><div className="flex flex-wrap gap-2"><Input id="contact-search" value={text} maxLength={160} className="flex-1" onChange={event => setText(event.target.value)} /><Button type="button" variant="outline" onClick={() => { setQuery(text); setPage(1); }}>Rechercher le contact</Button></div></div>
    {error ? <RecordError error={error} retry={refresh} /> : !value ? <p role="status">Chargement des contacts…</p> : <><ul className="grid min-w-0 gap-2">{value.items.map(contact => <li key={contact.id} className="grid min-w-0 gap-2 border-b pb-4"><span className="wrap-anywhere font-medium">{contact.name}</span><span>{contact.primary_phone}</span><Button type="button" variant="outline" className="h-auto min-h-control max-w-full justify-self-start whitespace-normal text-left wrap-anywhere" onClick={() => choose(contact)}>Choisir {contact.name}</Button></li>)}</ul>{!value.items.length ? <p role="status">Aucun contact accessible ne correspond. Vous pouvez créer un nouveau contact.</p> : null}<div className="flex flex-wrap items-center gap-2"><Button type="button" variant="outline" disabled={!value.has_previous} onClick={() => setPage(page - 1)}>Contacts précédents</Button><span>Page {page}</span><Button type="button" variant="outline" disabled={!value.has_next} onClick={() => setPage(page + 1)}>Contacts suivants</Button></div></>}
  </div>;
}
