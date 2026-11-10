"use client";

import { SettingsWorkspace } from "./settings-workspace";
import Link from "next/link";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { DirectoryEmpty } from "@/components/shared/directory-presentation";
import { PasswordIcon } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import { roles, states, usersSchema, type StaffUser } from "./contracts";
import { Badge } from "@/components/ui/badge";
import { NumberedPages } from "@/features/contacts/numbered-pages";

function UserState({ state }: { state: StaffUser["state"] }) {
  return <Badge variant={state === "pending_handoff" ? "warning" : state === "disabled" ? "neutral" : "info"}>{states[state]}</Badge>;
}

function EditUser({ user }: { user: StaffUser }) {
  return <Button action="edit" variant="quiet" asChild><Link aria-label={`Modifier ${user.display_name}`} href={`/settings/users/${user.id}/edit`}>Modifier</Link></Button>;
}

const columns: ColumnDef<StaffUser>[] = [
  { accessorKey: "display_name", header: "Utilisateur", size: 210, cell: ({ row }) => <div className="flex min-w-0 items-center gap-2.5"><span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-medium">{row.original.display_name.split(/\s+/).map(part => part[0]).slice(0, 2).join("")}</span><span className="wrap-anywhere font-medium">{row.original.display_name}</span></div> },
  { accessorKey: "email", header: "E-mail", size: 265, cell: ({ row }) => <span className="wrap-anywhere">{row.original.email}</span> },
  { accessorKey: "role", header: "Rôle", size: 180, cell: ({ row }) => <Badge variant="neutral">{roles[row.original.role]}</Badge> },
  { accessorKey: "state", header: "Statut", size: 115, cell: ({ row }) => <UserState state={row.original.state} /> },
  { id: "actions", header: "Actions", size: 140, cell: ({ row }) => <EditUser user={row.original} /> },
];

function UserCard(user: StaffUser) {
  return <article className="kay-settings-user-card">
    <header><h3>{user.display_name}</h3><UserState state={user.state} /></header>
    <dl><div><dt>Rôle</dt><dd><Badge variant="neutral">{roles[user.role]}</Badge></dd></div></dl>
    <EditUser user={user} />
    <details><summary>Détails</summary><p className="wrap-anywhere"><span className="sr-only">E-mail : </span>{user.email}</p></details>
  </article>;
}
export function UserList() {
  const [page, setPage] = useState(1);
  const { value: result, error, refresh } = useQuery(`/api/v1/users?page=${page}&page_size=50`, usersSchema);
  return <SettingsWorkspace active="users" route="/settings/users" actions={<Button action="create" asChild><Link href="/settings/users/new">Créer un utilisateur</Link></Button>}>
    <header className="kay-settings-content-head"><div><h2>Utilisateurs</h2><p>Gérez les comptes, les rôles et les accès de l’équipe.</p></div>{result ? <p className="kay-settings-meta">{result.total} compte{result.total === 1 ? "" : "s"}</p> : null}</header>
    <div className="kay-surface kay-settings-users-card">{error ? <RecordError error={error} retry={error.status >= 500 ? refresh : undefined} /> : !result ? <div className="grid gap-3" role="status"><span className="sr-only">Chargement des utilisateurs…</span>{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-11 w-full" />)}</div> : <>
      {result.items.length ? <DataTable columns={columns} rows={result.items} getRowId={user => user.id} caption="Utilisateurs de l’agence" emptyLabel="Aucun utilisateur sur cette page." scrollLabel="Tableau des utilisateurs" mobileCard={UserCard} /> : <DirectoryEmpty title={result.total ? "Aucun utilisateur sur cette page" : "Aucun utilisateur"} action={result.total ? <Button action="back" variant="outline" onClick={() => setPage(1)}>Première page</Button> : undefined}>Les comptes de l’équipe apparaîtront ici.</DirectoryEmpty>}
      {result.total > result.page_size || page > 1 ? <NumberedPages compact label="Pages des utilisateurs" page={page} total={result.total} size={result.page_size} change={setPage} /> : null}
    </>}</div>
    {!error ? <p className="kay-settings-footnote"><PasswordIcon size={16} aria-hidden="true" />Les changements de rôle et d’accès conservent l’attribution des actions passées.</p> : null}
  </SettingsWorkspace>;
}
