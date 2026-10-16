"use client";
import { PageHeader } from "@/components/shared/page-header";
import { ExportAction } from "@/features/discovery/export-action";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { contactsSchema, type StaffRole } from "./contracts";
import { NativeSelect } from "@/components/ui/native-select";
import { queryPath, useQuery } from "./use-query";
import { RecordError } from "./record-states";
import { NumberedPages } from "./numbered-pages";
import { useHydrated } from "@/hooks/use-hydrated";

export function ContactDirectory({ role }: { role: StaffRole }) {
  const hydrated = useHydrated();
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [archive, setArchive] = useState("active");
  const { value, error, refresh } = useQuery(queryPath("contacts", { q, page, page_size: 50, archive }), contactsSchema);
  return <div className="grid min-w-0 gap-3"><PageHeader title="Contacts" description="Une identité commune à plusieurs demandes." route="/leads" actions={<><Button asChild><Link href="/leads/new">Créer un Lead et son contact</Link></Button><Button asChild variant="outline"><Link href="/leads">Demandes</Link></Button>{role !== "agent" && value ? <ExportAction compact kind="contacts" filters={{ q, archive }} total={value.total} /> : null}</>} />
    <form className="filter-toolbar flex flex-wrap items-center gap-3" onSubmit={event => { event.preventDefault(); setQ(text); setPage(1); }}><div className="min-w-0 flex-1 basis-64"><Label className="sr-only" htmlFor="directory-search">Rechercher un nom, téléphone ou e-mail</Label><Input placeholder="Nom, téléphone ou e-mail" id="directory-search" disabled={!hydrated} value={text} maxLength={160} onChange={event => setText(event.target.value)} /></div><Button disabled={!hydrated} variant="outline" className="justify-self-start">Rechercher</Button>
    {role !== "agent" ? <div className="min-w-40"><Label className="sr-only" htmlFor="directory-archive">État des contacts</Label><NativeSelect id="directory-archive" disabled={!hydrated} value={archive} onChange={event => { setArchive(event.target.value); setPage(1); }}><option value="active">Actifs</option><option value="archived">Archivés</option><option value="all">Actifs et archivés</option></NativeSelect></div> : null}</form>
    {error ? <RecordError error={error} retry={refresh} /> : !value ? <p role="status">Chargement des contacts…</p> : <><p role="status">{value.total} contact(s) accessible(s).</p>{value.items.length ? <ul className="grid gap-4">{value.items.map(contact => <li className="grid min-w-0 gap-2 border-b pb-4 sm:grid-cols-2" key={contact.id}><div className="grid gap-2"><Link className="inline-flex min-h-control items-center wrap-anywhere font-medium text-link underline" href={`/contacts/${contact.id}`}>{contact.name}</Link>{contact.archived_at ? <span className="text-neutral">Archivé</span> : null}<span>{contact.primary_phone}</span>{contact.primary_email ? <span className="wrap-anywhere">{contact.primary_email}</span> : null}</div><p className="wrap-anywhere">Agent responsable : {contact.primary_agent.display_name}</p></li>)}</ul> : <p>{q ? "Aucun contact accessible ne correspond." : archive === "archived" ? "Aucun contact archivé sur cette page." : "Aucun contact sur cette page. Créez un Lead pour ajouter un contact."}</p>}<NumberedPages label="Pages des contacts" page={page} total={value.total} size={value.page_size} change={setPage} /></>}
  </div>;
}
