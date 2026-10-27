"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { FileIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DataTable } from "@/components/shared/data-table";
import { RecordEntry } from "@/components/shared/record-entry";
import { AgentPicker } from "@/features/contacts/agent-picker";
import type { ApiError } from "@/lib/api/client";
import { rowErrors, rowLabels, type ImportRow } from "./contracts";

function RowStatus({ row }: { row: ImportRow }) {
  return <Badge variant={row.status === "invalid" ? "danger" : row.status === "committed" ? "success" : row.status === "eligible" ? "info" : "neutral"}>{rowLabels[row.status]}</Badge>;
}
function RowValues({ row }: { row: ImportRow }) {
  const labels = { name: "Nom", primary_phone: "Téléphone principal", other_phones: "Autres téléphones", primary_email: "E-mail principal", other_emails: "Autres e-mails", roles: "Rôles", agent_email: "E-mail de l’agent dans le CSV", notes: "Notes" };
  return <><details><summary className="min-h-control cursor-pointer py-3 text-sm">Voir les valeurs de la ligne {row.row_number}</summary><dl className="grid min-w-0 gap-3 sm:grid-cols-2">{Object.entries(labels).map(([key, label]) => <div key={key} className="grid min-w-0 gap-1"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="wrap-anywhere whitespace-pre-wrap text-sm">{row.values[key as keyof typeof labels] || "Non renseigné"}</dd></div>)}</dl>{row.values_truncated ? <p className="text-sm text-warning">Affichage abrégé : corrigez les champs trop longs dans le fichier source.</p> : null}</details>
    {row.errors.length ? <ul className="grid gap-2 text-sm text-danger" aria-label={`Erreurs ligne ${row.row_number}`}>{row.errors.map(code => <li key={code}>{rowErrors[code]}</li>)}</ul> : null}
    {row.contact_id ? <Button action="contact" asChild variant="quiet" size="compact"><Link prefetch={false} href={`/contacts/${row.contact_id}`}>Ouvrir le contact de la ligne {row.row_number}</Link></Button> : null}
  </>;
}

export function ImportRows({ rows, editable, overrides, change, authorityDenied }: { rows: ImportRow[]; editable: boolean; overrides: Record<number, string | null>; change: (number: number, agent: string | null) => void; authorityDenied: (error: ApiError) => void }) {
  const [editing, setEditing] = useState<ImportRow>();
  const trigger = useRef<HTMLButtonElement | null>(null), heading = useRef<HTMLHeadingElement>(null);
  const agent = (row: ImportRow) => <div className="grid min-w-0 gap-1"><span className="wrap-anywhere">{row.agent_name ?? (row.status === "skipped_existing" ? "Aucune attribution modifiée" : row.values.agent_email || "À sélectionner")}</span>{Object.hasOwn(overrides, row.row_number) ? <small className="text-warning">Sélection à prévisualiser</small> : null}{editable && row.status !== "skipped_existing" ? <Button action="assign" type="button" variant="quiet" size="compact" className="justify-self-start" onClick={event => { trigger.current = event.currentTarget; setEditing(row); }}>Modifier l’agent de la ligne {row.row_number}</Button> : null}</div>;
  const columns: ColumnDef<ImportRow>[] = [
    { id: "line", header: "Ligne", size: 70, cell: ({ row }) => row.original.row_number },
    { id: "contact", header: "Contact", cell: ({ row: { original: row } }) => <div className="grid min-w-0 gap-1"><strong className="line-clamp-2 wrap-anywhere">{row.values.name || "Nom manquant"}</strong><p className="line-clamp-2 wrap-anywhere text-sm text-muted-foreground">{row.values.primary_phone || "Téléphone manquant"}</p><RowValues row={row} /></div> },
    { id: "agent", header: "Agent", cell: ({ row }) => agent(row.original) },
    { id: "status", header: "État", cell: ({ row }) => <RowStatus row={row.original} /> },
  ];
  return <div className="min-w-0"><h3 ref={heading} tabIndex={-1} className="sr-only">Lignes du CSV</h3><DataTable columns={columns} rows={rows} getRowId={row => String(row.row_number)} caption="Lignes du CSV" emptyLabel="Aucune ligne prévisualisée pour ce lot." mobileCard={row => <RecordEntry icon={FileIcon} title={<span className="line-clamp-2 wrap-anywhere">Ligne {row.row_number} · {row.values.name || "Nom manquant"}</span>} status={<RowStatus row={row} />} meta={[{ label: "Téléphone", value: <span className="line-clamp-2 wrap-anywhere">{row.values.primary_phone || "Manquant"}</span> }, { label: "Agent", value: agent(row) }]}><RowValues row={row} /></RecordEntry>} />
    <Sheet open={Boolean(editing)} onOpenChange={open => { if (!open) setEditing(undefined); }}><SheetContent className="kay-record-drawer" closeLabel="Fermer le choix d’agent" onCloseAutoFocus={event => { event.preventDefault(); (trigger.current?.isConnected ? trigger.current : heading.current)?.focus(); }}><SheetHeader className="kay-drawer-head"><SheetTitle>Agent de la ligne {editing?.row_number}</SheetTitle><SheetDescription>La sélection devra être confirmée par un nouvel aperçu du lot.</SheetDescription></SheetHeader><form data-draft-managed className="kay-drawer-body grid content-start gap-4" onSubmit={event => event.preventDefault()}><fieldset disabled={!editable} className="grid min-w-0 gap-4">{editing ? <AgentPicker label={`Agent de la ligne ${editing.row_number}`} value={Object.hasOwn(overrides, editing.row_number) ? overrides[editing.row_number] ?? "" : editing.agent_id ?? ""} selectedLabel={editing.agent_name ?? undefined} change={value => change(editing.row_number, value || null)} denied={authorityDenied} /> : null}<p className="text-sm text-muted-foreground">Revenir au CSV retire la sélection propre à cette ligne. Un agent_email vide utilisera alors le remplacement du lot.</p><div className="flex flex-wrap gap-2"><Button action="back" type="button" variant="outline" onClick={() => { if (editing) change(editing.row_number, null); setEditing(undefined); }}>Revenir au CSV</Button><Button action="close" type="button" variant="outline" onClick={() => setEditing(undefined)}>Fermer le choix d’agent</Button></div></fieldset></form></SheetContent></Sheet>
  </div>;
}
