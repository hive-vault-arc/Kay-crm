"use client";
import Link from "next/link";
import { CalendarIcon, CompletedIcon, FileIcon, NotificationIcon, TaskIcon } from "@/components/icons";
import { CrmStatusBadge } from "@/components/shared/crm-presentation";
import { RecordEntry } from "@/components/shared/record-entry";
import { formatInstant } from "@/lib/format";
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
import { PushControl } from "@/features/realtime/push-control";

export function NotificationPanel() {
  const id = useId(), hydrated = useHydrated(), heading = useRef<HTMLHeadingElement>(null), lock = useRef(false);
  const [state, setState] = useState("all"), [page, setPage] = useState(1), [busy, setBusy] = useState<string>(), [error, setError] = useState<ApiError>(), [notice, setNotice] = useState("");
  const query = useQuery(queryPath("notifications", { state, page, page_size: 20 }), notificationsSchema);
  async function markRead(nid: string) {
    if (lock.current) return; lock.current = true; setBusy(nid); setError(undefined); setNotice("");
    try { await apiCommand(`/api/v1/notifications/${nid}/read`, {}, readSchema, crypto.randomUUID()); query.refresh(); setNotice("Notification marquée comme lue."); heading.current?.focus(); }
    catch (failure) { setError(failure instanceof ApiError ? failure : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); }
    finally { setBusy(undefined); lock.current = false; }
  }
  const denied = error && ["NOT_FOUND", "FORBIDDEN", "UNAUTHENTICATED"].includes(error.code);
  return <section className="kay-work-panel grid min-w-0 gap-4" aria-label="Notifications internes" aria-busy={Boolean(busy)}><header className="kay-section-head"><h2 ref={heading} tabIndex={-1} className="text-section font-medium">Notifications</h2>{query.value && !denied && !query.error ? <span className="kay-work-count">{query.value.unread_total} non lue(s)</span> : null}</header>
    <div className="kay-work-controls"><div className="grid min-w-0 gap-2"><Label htmlFor={id}>Afficher</Label><NativeSelect id={id} value={state} disabled={Boolean(busy)} onChange={event => { setState(event.target.value); setPage(1); setError(undefined); }}><option value="all">Toutes les notifications</option><option value="unread">Non lues</option><option value="read">Lues</option></NativeSelect></div><Button liveRefresh action="refresh" type="button" variant="quiet" size="icon" aria-label="Actualiser les notifications" title="Actualiser les notifications" disabled={!hydrated || Boolean(busy)} onClick={() => { setError(undefined); query.refresh(); }}><span className="sr-only">Actualiser</span></Button></div>
    {notice ? <p role="status" className="text-sm text-success">{notice}</p> : null}{error ? <RecordError error={error} /> : null}
    {query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <p role="status">Chargement des notifications…</p> : denied ? <p>Actualisez pour vérifier vos droits et les rappels encore actuels.</p> : <>{query.value.items.length ? <ul className="kay-work-list">{query.value.items.map(item => {
      const Icon = item.kind === "file.scanned" ? FileIcon : item.kind.startsWith("visit.") ? CalendarIcon : TaskIcon;
      const StateIcon = item.read_at ? CompletedIcon : NotificationIcon;
      return <li key={item.id}><RecordEntry title={item.title} icon={Icon} status={<CrmStatusBadge state={item.read_at ? "draft" : "in_progress"} dot={false}><StateIcon size={12} aria-hidden="true" />{item.read_at ? "Lue" : "Non lue"}</CrmStatusBadge>} meta={item.due_local ? [{ label: "Échéance", icon: CalendarIcon, value: localLabel(item.due_local) }] : []} actions={<><Button action="forward" asChild variant="quiet"><Link href={item.href}>Ouvrir le dossier</Link></Button>{!item.read_at ? <Button action="read" type="button" variant="outline" disabled={Boolean(busy)} onClick={() => void markRead(item.id)}>{busy === item.id ? "Enregistrement…" : "Marquer comme lue"}</Button> : null}</>}><p className="kay-notification-context">{item.context}</p><time className="kay-notification-time" dateTime={item.created_at}>{formatInstant(item.created_at)}</time></RecordEntry></li>;
    })}</ul> : <p className="text-sm text-muted-foreground">Aucune notification pour ce filtre. Les rappels apparaissent à leur échéance.</p>}{query.value.has_previous || query.value.has_next ? <NumberedPages compact page={query.value.page} total={query.value.total} size={query.value.page_size} change={setPage} label="Pages des notifications" /> : null}</>}
    <p className="text-xs text-muted-foreground">Les rappels et les liens suivent vos droits actuels. Les horaires remplacés et les tâches terminées ne restent pas dans cette liste.</p><PushControl />
  </section>;
}
