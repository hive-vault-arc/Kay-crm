"use client";
import Link from "next/link";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { localLabel } from "@/features/schedule/time";
import { useHydrated } from "@/hooks/use-hydrated";
import { ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { notificationsSchema, readSchema } from "./contracts";

export function NotificationPanel() {
  const id = useId(), hydrated = useHydrated(), heading = useRef<HTMLHeadingElement>(null), lock = useRef(false);
  const [state, setState] = useState("all"), [page, setPage] = useState(1), [busy, setBusy] = useState<string>(), [error, setError] = useState<ApiError>(), [notice, setNotice] = useState("");
  const query = useQuery(queryPath("notifications", { state, page }), notificationsSchema);
  async function markRead(nid: string) {
    if (lock.current) return; lock.current = true; setBusy(nid); setError(undefined); setNotice("");
    try { await apiCommand(`/api/v1/notifications/${nid}/read`, {}, readSchema, crypto.randomUUID()); query.refresh(); setNotice("Notification marquée comme lue."); heading.current?.focus(); }
    catch (failure) { setError(failure instanceof ApiError ? failure : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); }
    finally { setBusy(undefined); lock.current = false; }
  }
  const denied = error && ["NOT_FOUND", "FORBIDDEN", "UNAUTHENTICATED"].includes(error.code);
  return <section className="grid min-w-0 gap-4 border-t pt-8" aria-label="Notifications internes"><h2 ref={heading} tabIndex={-1} className="text-section font-medium">Notifications internes</h2>
    <div className="flex flex-wrap items-end gap-4"><div className="grid min-w-0 gap-2"><Label htmlFor={id}>Notifications affichées</Label><NativeSelect id={id} value={state} disabled={Boolean(busy)} onChange={e => { setState(e.target.value); setPage(1); setError(undefined); }}><option value="all">Toutes les notifications actuelles</option><option value="unread">Non lues</option><option value="read">Lues</option></NativeSelect></div><Button action="refresh" type="button" variant="outline" disabled={!hydrated || Boolean(busy)} onClick={() => { setError(undefined); query.refresh(); }}>Actualiser les notifications</Button></div>
    {notice ? <p role="status" className="text-success">{notice}</p> : null}{error ? <RecordError error={error} /> : null}
    {query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <p role="status">Chargement des notifications…</p> : denied ? <p>Actualisez pour vérifier vos droits et les rappels encore actuels.</p> : <><p>{query.value.unread_total} notification(s) actuelle(s) non lue(s).</p>{query.value.items.length ? <ul className="grid min-w-0 gap-4">{query.value.items.map(item => <li key={item.id} className="grid min-w-0 gap-2 border-t pt-4"><h3 className="font-medium">{item.title}</h3><p className="wrap-anywhere">{item.context}</p>{item.due_local ? <p>{localLabel(item.due_local)}</p> : null}<p className="text-sm text-muted-foreground">{item.read_at ? "Lue" : "Non lue"}</p><div className="flex flex-wrap gap-2"><Button action="preview" asChild variant="outline"><Link href={item.href}>Ouvrir le dossier</Link></Button>{!item.read_at ? <Button action="read" type="button" variant="outline" disabled={Boolean(busy)} onClick={() => void markRead(item.id)}>{busy === item.id ? "Enregistrement…" : "Marquer comme lue"}</Button> : null}</div></li>)}</ul> : <p>Aucune notification actuelle pour ce filtre. Les rappels programmés apparaîtront ici à partir de leur échéance.</p>}<NumberedPages page={query.value.page} total={query.value.total} size={query.value.page_size} change={setPage} label="Pages des notifications" /></>}
    <p className="text-sm text-muted-foreground">Rappels internes uniquement. Les liens et les totaux suivent vos droits actuels ; les anciens horaires et les tâches terminées ne restent pas dans cette liste.</p>
  </section>;
}
