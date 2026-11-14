"use client";
import Link from "next/link";
import { useId, useRef } from "react";
import { CalendarIcon, CompletedIcon, NotificationIcon, TaskIcon } from "@/components/icons";
import { CrmStatusBadge } from "@/components/shared/crm-presentation";
import { RecordEntry } from "@/components/shared/record-entry";
import { Button } from "@/components/ui/button";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { localLabel } from "@/features/schedule/time";
import { PushControl } from "@/features/realtime/push-control";
import { formatBusinessDate, formatInstant } from "@/lib/format";
import { NotificationFilters, NotificationProblem } from "./notification-controls";
import { useNotificationFeed, type NotificationState } from "./notification-feed";
import { holidayNotice } from "./holiday-contracts";
import { isBirthdayNotification } from "./contracts";

export function NotificationPanel({ initialState = "all", navigate }: { initialState?: NotificationState; navigate?: () => void } = {}) {
  const id = useId(), heading = useRef<HTMLHeadingElement>(null), feed = useNotificationFeed(20, initialState);
  return <section className="kay-work-panel grid min-w-0 gap-4" aria-label="Notifications internes" aria-busy={Boolean(feed.busy)}><header className="kay-section-head"><h2 id={id} ref={heading} tabIndex={-1} className="text-section">Notifications</h2><div className="flex flex-wrap items-center gap-2">{feed.value ? <span className="kay-work-count">{feed.value.unread_total} non lue(s)</span> : null}<Button liveRefresh action="refresh" type="button" variant="quiet" size="icon" aria-label="Actualiser les notifications" title="Actualiser les notifications" disabled={!feed.hydrated || Boolean(feed.busy) || feed.uncertain} onClick={feed.refresh}><span className="sr-only">Actualiser</span></Button></div></header><NotificationFilters feed={feed} />
    <NotificationProblem feed={feed} />
    {!feed.value ? !feed.problem ? <p role="status">Chargement des notifications…</p> : null : <>{feed.value.items.length ? <ul className="kay-work-list">{feed.value.items.map(item => {
      const birthday = isBirthdayNotification(item.kind);
      const holiday = "start_on" in item;
      const Icon = birthday || holiday || item.kind.startsWith("visit.") ? CalendarIcon : TaskIcon;
      const due = holiday ? [{ label: "Date du jour férié", icon: CalendarIcon, value: holidayNotice(item) }] : item.due_local ? [{ label: birthday ? "Date de l’anniversaire" : "Échéance", icon: CalendarIcon, value: birthday ? formatBusinessDate(item.due_local.slice(0, 10)) : localLabel(item.due_local) }] : [];
      const StateIcon = item.read_at ? CompletedIcon : NotificationIcon;
      return <li key={item.id}><RecordEntry title={item.title} icon={Icon} status={<CrmStatusBadge state={item.read_at ? "draft" : "in_progress"} dot={false}><StateIcon size={12} aria-hidden="true" />{item.read_at ? "Lue" : "Non lue"}</CrmStatusBadge>} meta={due} actions={<>{item.href ? <Button action="forward" asChild variant="quiet"><Link href={item.href} onClick={navigate}>{birthday ? "Ouvrir le contact" : "Ouvrir le dossier"}</Link></Button> : null}{!item.read_at ? <Button action="read" type="button" variant="outline" disabled={!feed.hydrated || Boolean(feed.busy) || feed.uncertain} onClick={() => { void feed.markRead(item.id).then(saved => { if (saved) heading.current?.focus(); }); }}>{feed.busy === item.id ? "Enregistrement…" : "Marquer comme lue"}</Button> : null}</>}><p className="kay-notification-context">{item.context}</p><time className="kay-notification-time" dateTime={item.created_at}>{formatInstant(item.created_at)}</time></RecordEntry></li>;
    })}</ul> : <p className="text-sm text-muted-foreground">Aucune notification pour ce filtre. Les rappels apparaissent à leur échéance.</p>}{feed.value.has_previous || feed.value.has_next || feed.page > 1 ? <NumberedPages compact page={feed.page} total={feed.value.total} size={20} change={feed.changePage} label="Pages des notifications" /> : null}</>}
    <p className="text-xs text-muted-foreground">Les rappels et les liens suivent vos droits actuels. Les horaires remplacés et les tâches terminées ne restent pas dans cette liste.</p>{!feed.authority ? <PushControl /> : null}
  </section>;
}
