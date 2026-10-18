"use client";

import { PageHeader } from "@/components/shared/page-header";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { apiGet, ApiError } from "@/lib/api/client";
import { roles, states, usersSchema, type StaffUser } from "./contracts";
import { Badge } from "@/components/ui/badge";
import { NumberedPages } from "@/features/contacts/numbered-pages";

const columns: ColumnDef<StaffUser>[] = [
  { accessorKey: "display_name", header: "Utilisateur", cell: ({ row }) => <div className="flex min-w-0 items-center gap-3"><span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-medium">{row.original.display_name.split(/\s+/).map(part => part[0]).slice(0, 2).join("")}</span><Link aria-label={row.original.display_name} aria-describedby={`staff-email-${row.original.id}`} className="grid min-h-control min-w-0 content-center gap-0.5 wrap-anywhere text-foreground underline-offset-4 hover:underline" href={`/settings/users/${row.original.id}/edit`}><span className="font-medium">{row.original.display_name}</span><span id={`staff-email-${row.original.id}`} className="text-xs text-muted-foreground">{row.original.email}</span></Link></div> },
  { accessorKey: "role", header: "Rôle", cell: ({ row }) => <Badge variant={row.original.role === "administrator" ? "purple" : row.original.role === "manager" ? "info" : "neutral"}>{roles[row.original.role]}</Badge> },
  { accessorKey: "state", header: "État", cell: ({ row }) => <Badge variant={row.original.state === "pending_handoff" ? "warning" : row.original.state === "disabled" ? "neutral" : "success"}>{states[row.original.state]}</Badge> },
];
export function UserList() {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<z.infer<typeof usersSchema>>();
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    apiGet(`/api/v1/users?page=${page}&page_size=50`, usersSchema, controller.signal).then(setResult).catch((reason) => {
      if (!controller.signal.aborted) setError(reason instanceof ApiError ? reason.message : "La liste n’a pas pu être chargée.");
    });
    return () => controller.abort();
  }, [page, retry]);
  function navigate(next: number) { if (next === page) return; setResult(undefined); setError(""); setPage(next); }
  return <div className="grid min-w-0 gap-3">
    <PageHeader title="Tous les utilisateurs" description="Comptes, rôles et accès de l’équipe." route="/settings/users" actions={<><Button action="create" asChild><Link href="/settings/users/new">Créer un utilisateur</Link></Button><Button action="settings" asChild variant="outline"><Link href="/settings">Paramètres</Link></Button></>} />
    {error ? <div className="grid gap-4"><p role="alert" className="text-danger">{error}</p><Button action="retry" variant="outline" onClick={() => { setError(""); setRetry(retry + 1); }}>Réessayer</Button></div> : !result ? <p role="status">Chargement des utilisateurs…</p> : <>
      <div role="region" aria-label="Tableau des utilisateurs, défilement horizontal si nécessaire" tabIndex={0} className="min-w-0 overflow-x-auto"><DataTable columns={columns} rows={result.items} caption={`${result.total} utilisateur(s). Supprimer un compte conserve son historique CRM.`} emptyLabel="Aucun utilisateur sur cette page." /></div>
      <NumberedPages label="Pages des utilisateurs" page={page} total={result.total} size={result.page_size} change={navigate} />
    </>}
  </div>;
}
