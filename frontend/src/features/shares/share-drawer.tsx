"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RecordDrawer } from "@/components/shared/record-drawer";
import { RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import { ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { ApprovalForm, type ShareTarget } from "./approval-form";
import { issuedShare, listingShareState, shareSaved, type Approval } from "./contracts";
import { ClientListingFacts } from "./listing-facts";

const date = new Intl.DateTimeFormat("fr-MA", { dateStyle: "medium", timeZone: "Africa/Casablanca" });

export function ListingShareDrawer({ busy, ...target }: ShareTarget & { busy?: boolean }) {
  return <RecordDrawer label="Partager" title="Partager la fiche" description="Une fiche client accessible par lien, sans connexion." action="forward" busy={busy}>
    <SharePanel target={target} />
  </RecordDrawer>;
}

function SharePanel({ target }: { target: ShareTarget }) {
  const path = `/api/v1/listing-shares/${target.kind}/${target.id}` as const;
  const query = useQuery(`${path}/draft`, listingShareState);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError>();
  const [link, setLink] = useState<{ url: string; expiresAt: string; id?: string }>();
  const [notice, setNotice] = useState("");
  const [confirm, setConfirm] = useState<"withdraw" | string>();
  const issueKey = useRef<{ fingerprint: string; key: string } | undefined>(undefined);
  const lock = useRef(false);
  async function run(work: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(undefined); setNotice("");
    try { await work(); query.refreshQuietly(); }
    catch (failure) {
      setError(failure instanceof ApiError ? failure : new ApiError("DEPENDENCY_UNAVAILABLE", 503));
      if (failure instanceof ApiError && failure.status < 500) issueKey.current = undefined;
    } finally { lock.current = false; setBusy(false); }
  }
  if (query.error) return <RecordError error={query.error} retry={query.refresh} />;
  if (!query.value) return <p role="status">Chargement du partage…</p>;
  if (!query.value.enabled) return <p className="text-muted-foreground">Le partage client n’est pas encore activé.</p>;
  const state = query.value;
  const showDraft = state.can_approve && state.draft && (editing || (!state.active && !link));
  function issue(value?: Approval) {
    void run(async () => {
      const body = value ?? { expected_version: state.version };
      const action = value ? "publish" : "links";
      const fingerprint = JSON.stringify([action, body]);
      if (issueKey.current?.fingerprint !== fingerprint) {
        issueKey.current = { fingerprint, key: crypto.randomUUID() };
      }
      const { key } = issueKey.current;
      const result = await apiCommand(`${path}/${action}`, body, issuedShare, key);
      issueKey.current = undefined;
      const url = new URL("/partage", window.location.origin);
      url.hash = result.token;
      setLink({ url: url.href, expiresAt: result.expires_at, id: key });
      setEditing(false);
      setNotice("Lien créé. Copiez-le pour l’envoyer au client.");
    });
  }
  function deactivate() {
    if (!confirm) return;
    void run(async () => {
      const key = crypto.randomUUID();
      if (confirm === "withdraw") await apiCommand(`${path}/withdraw`, { expected_version: state.version }, shareSaved, key);
      else await apiCommand(`${path}/links/${confirm}/revoke`, {}, shareSaved, key);
      if (confirm === "withdraw" || confirm === link?.id) setLink(undefined);
      setConfirm(undefined); setNotice("Partage désactivé.");
    });
  }
  return <div className="grid min-w-0 gap-4">
    {error && <RecordError error={error} />}
    {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
    {showDraft && state.draft ? <ApprovalForm target={target} state={state} draft={state.draft} busy={busy} save={issue} cancel={editing ? () => setEditing(false) : undefined} /> : <>
      {state.active && state.snapshot ? <ClientListingFacts facts={state.snapshot} /> : <p className="text-sm text-muted-foreground">La fiche doit être approuvée par un responsable avant de créer un lien.</p>}
      <div className="flex flex-wrap gap-2">
        {state.active && <Button action="create" disabled={busy} onClick={() => issue()}>Créer un lien client</Button>}
        {state.active && state.can_approve && <Button action="edit" variant="outline" disabled={busy} onClick={() => setEditing(true)}>Modifier la fiche client</Button>}
        {state.active && state.can_approve && <Button action="archive" variant="outline" disabled={busy} onClick={() => setConfirm("withdraw")}>Retirer la fiche</Button>}
      </div>
      {link && <div className="grid gap-2 rounded-lg border p-3">
        <label className="grid gap-1 text-sm">Lien client<Input value={link.url} readOnly autoComplete="off" data-private-credential onFocus={event => event.target.select()} /></label>
        <p className="text-sm text-muted-foreground">Expire le {date.format(new Date(link.expiresAt))}. Toute personne qui reçoit le lien peut l’ouvrir ou le transférer.</p>
        <Button action="forward" variant="outline" className="justify-self-start" onClick={() => {
          if (!navigator.clipboard) { setNotice("Sélectionnez le lien dans le champ pour le copier."); return; }
          void navigator.clipboard.writeText(link.url).then(() => setNotice("Lien copié.")).catch(() => setNotice("Sélectionnez le lien dans le champ pour le copier."));
        }}>Copier le lien</Button>
      </div>}
      {state.links.length > 0 && <section className="grid gap-2 border-t pt-3"><h3 className="font-semibold">Liens actifs</h3><ul className="grid gap-2">{state.links.map((item, index) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm">Lien {index + 1} · expire le {date.format(new Date(item.expires_at))}</p><Button action="archive" variant="outline" disabled={busy} onClick={() => setConfirm(item.id)} aria-label={`Désactiver le lien ${index + 1}`}>Désactiver</Button></li>)}</ul></section>}
      {confirm && <div className="grid gap-2 rounded-lg border p-3" role="group" aria-label="Confirmation de la désactivation"><p>{confirm === "withdraw" ? "Tous les liens de cette fiche cesseront de fonctionner." : "Le client ne pourra plus ouvrir ce lien."}</p><div className="flex flex-wrap gap-2"><Button action="cancel" variant="outline" disabled={busy} onClick={() => setConfirm(undefined)}>Annuler</Button><Button action="archive" variant="destructive" disabled={busy} onClick={deactivate}>Confirmer la désactivation</Button></div></div>}
    </>}
  </div>;
}
