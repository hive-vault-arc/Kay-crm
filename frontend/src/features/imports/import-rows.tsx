"use client";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AgentPicker } from "@/features/contacts/agent-picker";
import { rowErrors, rowLabels, type ImportRow } from "./contracts";

export function ImportRows({ rows, editable, overrides, change }: { rows: ImportRow[]; editable: boolean; overrides: Record<number, string | null>; change: (number: number, agent: string | null) => void }) {
  const [editing, setEditing] = useState<number>();
  return <ol className="grid min-w-0 gap-6" aria-label="Lignes du CSV">{rows.map(row => <li key={row.row_number} className="grid min-w-0 gap-4 border-t pt-4">
    <div className="grid min-w-0 gap-2 sm:grid-cols-2"><h3 className="wrap-anywhere font-medium">Ligne {row.row_number} : {row.values.name || "Nom manquant"}</h3><p className={row.status === "invalid" ? "text-danger" : row.status === "committed" ? "text-success" : "text-neutral"}>{rowLabels[row.status]}</p><p className="wrap-anywhere">Téléphone principal : {row.values.primary_phone || "Manquant"}</p><p className="wrap-anywhere">Agent : {row.agent_name ?? (row.status === "skipped_existing" ? "Aucune attribution modifiée" : row.values.agent_email || "À sélectionner")}{Object.hasOwn(overrides, row.row_number) ? " (sélection à prévisualiser)" : ""}</p></div>
    {row.errors.length ? <ul className="grid gap-2 text-danger" aria-label={`Erreurs ligne ${row.row_number}`}>{row.errors.map(code => <li key={code}>{rowErrors[code]}</li>)}</ul> : null}
    <details><summary className="min-h-control cursor-pointer py-3">Voir les valeurs de la ligne {row.row_number}</summary><dl className="grid min-w-0 gap-2 sm:grid-cols-2">{([['Autres téléphones', row.values.other_phones], ['E-mail principal', row.values.primary_email], ['Autres e-mails', row.values.other_emails], ['Rôles', row.values.roles], ['E-mail de l’agent dans le CSV', row.values.agent_email], ['Notes', row.values.notes]] as const).map(([label, value]) => <div key={label} className="grid min-w-0 gap-2"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="wrap-anywhere whitespace-pre-wrap">{value || "Non renseigné"}</dd></div>)}</dl>{row.values_truncated ? <p className="text-warning">Affichage abrégé : corrigez les champs trop longs dans le fichier source.</p> : null}</details>
    {row.contact_id ? <Button asChild variant="outline" className="justify-self-start"><Link href={`/contacts/${row.contact_id}`}>Ouvrir le contact de la ligne {row.row_number}</Link></Button> : null}
    {editable && row.status !== "skipped_existing" ? editing === row.row_number ? <div className="grid min-w-0 max-w-reading gap-4"><AgentPicker label={`Agent de la ligne ${row.row_number}`} value={Object.hasOwn(overrides, row.row_number) ? overrides[row.row_number] ?? "" : row.agent_id ?? ""} change={agent => { change(row.row_number, agent || null); }} /><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => { change(row.row_number, null); setEditing(undefined); }}>Revenir au CSV</Button><Button type="button" variant="outline" onClick={() => setEditing(undefined)}>Fermer le choix d’agent</Button></div></div> : <Button type="button" variant="outline" className="justify-self-start" onClick={() => setEditing(row.row_number)}>Modifier l’agent de la ligne {row.row_number}</Button> : null}
  </li>)}</ol>;
}
