"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SectionHeading } from "@/components/shared/section-heading";
import { PropertyIcon } from "@/components/icons";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { apiCommand } from "@/lib/api/command";
import { ApiError } from "@/lib/api/client";
import { catalogueChoicesSchema, projectLinksSchema, projectLinkResultSchema, type ProjectLink } from "./contracts";

type Scope = "enquiries" | "deals";
type Kind = "discussed" | "visited";
type CatalogueChoice = { development_id?: string; property_id?: string; name: string };

export function ProjectLinksPanel({ scope, id, writable, onChanged }: { scope: Scope; id: string; writable: boolean; onChanged: () => void }) {
  return <section className="crm-panel grid min-w-0 gap-4" aria-label="Projets liés au dossier">
    <SectionHeading compact icon={PropertyIcon}>Projets liés</SectionHeading>
    <p className="text-sm text-muted-foreground">Reliez les programmes et les biens du catalogue discutés ou visités. Ces deux listes restent indépendantes des offres et réservations.</p>
    <div className="grid min-w-0 gap-6 lg:grid-cols-2">
      <LinkList scope={scope} id={id} kind="discussed" writable={writable} onChanged={onChanged} />
      <LinkList scope={scope} id={id} kind="visited" writable={writable} onChanged={onChanged} />
    </div>
  </section>;
}

function LinkList({ scope, id, kind, writable, onChanged }: { scope: Scope; id: string; kind: Kind; writable: boolean; onChanged: () => void }) {
  const title = kind === "discussed" ? "Projets discutés" : "Projets visités";
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<string>();
  const [error, setError] = useState<ApiError>();
  const [notice, setNotice] = useState("");
  const [choice, setChoice] = useState<CatalogueChoice>();
  const attempt = useRef({ fingerprint: "", key: "" });
  const path = `/api/v1/${scope}/${id}/project-links` as const;
  const list = useQuery(`${path}?kind=${kind}&page=${page}&page_size=25`, projectLinksSchema);
  async function mutate(target: CatalogueChoice | ProjectLink) {
    if (busy) return;
    const removing = "id" in target;
    const commandPath = (removing ? `${path}/${target.id}` : path) as `/api/v1/${string}`;
    const body = removing ? {} : { kind, development_id: target.development_id, property_id: target.property_id };
    const fingerprint = JSON.stringify({ commandPath, body });
    if (attempt.current.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };
    setBusy(true); setError(undefined); setNotice("");
    try {
      await apiCommand(commandPath, body, projectLinkResultSchema, attempt.current.key, removing ? "DELETE" : "POST");
      attempt.current = { fingerprint: "", key: "" };
      setNotice(removing ? "Projet retiré de cette liste. L’historique est conservé." : "Projet ajouté. L’historique est conservé.");
      setConfirm(undefined); setChoice(undefined); setAdding(false);
      if (removing && list.value?.items.length === 1 && page > 1) setPage(page - 1);
      else list.refreshQuietly();
      onChanged();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503));
    } finally { setBusy(false); }
  }
  return <section className="grid min-w-0 content-start gap-3 border-t pt-4" aria-label={title}>
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-base font-semibold">{title}</h3>{list.value ? <span className="text-xs tabular-nums text-muted-foreground">{list.value.total}</span> : null}</div>
    {list.error ? <RecordError error={list.error} retry={list.refresh} /> : !list.value ? <p role="status">Chargement des projets…</p> : list.value.items.length ? <ul className="grid min-w-0 gap-2">{list.value.items.map(row => <li key={row.id} className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b pb-2">
      <Link className="min-h-control min-w-0 content-center wrap-anywhere text-link underline" href={row.development_id ? `/projects/${row.development_id}` : `/projects/properties/${row.property_id}`}>{row.name}</Link>
      {writable ? confirm === row.id ? <span className="flex flex-wrap gap-1"><Button action="remove" size="compact" variant="destructive" disabled={busy} onClick={() => void mutate(row)}>Confirmer le retrait</Button><Button action="cancel" size="compact" variant="outline" disabled={busy} onClick={() => setConfirm(undefined)}>Annuler</Button></span> : <Button action="remove" variant="quiet" size="compact" disabled={busy} onClick={() => setConfirm(row.id)}>Retirer</Button> : null}
    </li>)}</ul> : <p className="text-sm text-muted-foreground">Aucun projet {kind === "discussed" ? "discuté" : "visité"} enregistré.</p>}
    {list.value && list.value.total > 25 ? <NumberedPages page={page} total={list.value.total} size={25} change={setPage} label={`Pages des projets ${kind === "discussed" ? "discutés" : "visités"}`} /> : null}
    {notice ? <p role="status" className="text-success">{notice}</p> : null}
    {error ? <RecordError error={error} retry={() => setError(undefined)} /> : null}
    {writable ? adding ? <div className="grid min-w-0 gap-3 border-t pt-3"><CataloguePicker choice={choice} choose={setChoice} /><div className="flex flex-wrap gap-2"><Button action="add" disabled={!choice || busy} onClick={() => choice && void mutate(choice)}>{busy ? "Enregistrement…" : "Ajouter à cette liste"}</Button><Button action="close" variant="outline" disabled={busy} onClick={() => { setAdding(false); setChoice(undefined); }}>Annuler</Button></div></div>
      : <Button action="add" variant="outline" className="justify-self-start" onClick={() => { setAdding(true); setError(undefined); }}>Ajouter un projet</Button> : null}
  </section>;
}

function CataloguePicker({ choice, choose }: { choice?: CatalogueChoice; choose: (choice?: CatalogueChoice) => void }) {
  const id = useId(); const [type, setType] = useState<"development" | "property">("development");
  const [input, setInput] = useState(""); const [q, setQ] = useState(""); const [page, setPage] = useState(1);
  useEffect(() => { const timer = setTimeout(() => setQ(input), 250); return () => clearTimeout(timer); }, [input]);
  const list = useQuery(queryPath(type === "development" ? "developments" : "properties", { q, page, page_size: 25 }), catalogueChoicesSchema);
  const options = list.value?.items.map(row => ({ id: row.id, name: row.name || row.marketing_name || row.reference, detail: row.reference }));
  return <div className="grid min-w-0 gap-2"><Label htmlFor={`${id}-type`}>Type de projet</Label><NativeSelect id={`${id}-type`} value={type} onChange={event => { setType(event.target.value as typeof type); setPage(1); choose(undefined); }}><option value="development">Programme</option><option value="property">Bien du catalogue</option></NativeSelect>
    <Label htmlFor={`${id}-search`}>Rechercher dans le catalogue</Label><Input id={`${id}-search`} value={input} maxLength={160} placeholder="Nom ou référence" onChange={event => { setInput(event.target.value); setPage(1); choose(undefined); }} />
    <Label htmlFor={`${id}-choice`}>Projet</Label><NativeSelect id={`${id}-choice`} value={type === "development" ? choice?.development_id ?? "" : choice?.property_id ?? ""} disabled={!list.value} onChange={event => { const selected = options?.find(row => row.id === event.target.value); choose(selected ? { [type === "development" ? "development_id" : "property_id"]: selected.id, name: selected.name } : undefined); }}><option value="">Choisir un projet…</option>{choice && !options?.some(row => row.id === (choice.development_id || choice.property_id)) ? <option value={choice.development_id || choice.property_id}>{choice.name}</option> : null}{options?.map(row => <option key={row.id} value={row.id}>{row.name} · {row.detail}</option>)}</NativeSelect>
    {list.error ? <RecordError error={list.error} retry={list.refresh} /> : !list.value ? <p role="status">Recherche en cours…</p> : list.value.total === 0 ? <p>Aucun projet trouvé. Essayez un autre nom ou une autre référence.</p> : list.value.total > 25 ? <NumberedPages page={page} size={25} total={list.value.total} change={next => { setPage(next); choose(undefined); }} label="Pages du catalogue" /> : null}
  </div>;
}
