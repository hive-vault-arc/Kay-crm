"use client";
import { Button } from "@/components/ui/button";
import { RecordError } from "@/features/contacts/record-states";
import { notificationFilters, type useNotificationFeed } from "./notification-feed";

export function NotificationFilters({ feed }: { feed: ReturnType<typeof useNotificationFeed> }) {
  return <div className="kay-notification-filters" role="group" aria-label="Notifications affichées">{Object.entries(notificationFilters).map(([state, label]) => <Button key={state} action="filter" type="button" variant="quiet" aria-pressed={feed.state === state} disabled={!feed.hydrated || Boolean(feed.busy) || feed.uncertain || Boolean(feed.authority)} onClick={() => feed.filter(state as keyof typeof notificationFilters)}>{label}</Button>)}</div>;
}
export function NotificationProblem({ feed }: { feed: ReturnType<typeof useNotificationFeed> }) {
  return <>{feed.problem ? <RecordError error={feed.problem} retry={!feed.busy && !feed.uncertain ? feed.refresh : undefined} /> : null}{feed.uncertain && !feed.authority ? <div className="grid min-w-0 gap-2"><p className="text-xs text-muted-foreground">La réponse est interrompue. Réessayez le même marquage ; le rappel et son dossier restent inchangés.</p><Button action="retry" type="button" variant="outline" disabled={!feed.hydrated || Boolean(feed.busy)} onClick={() => void feed.retry()}>Réessayer le marquage</Button></div> : null}{feed.notice && !feed.authority ? <p role="status" className="text-xs text-success">{feed.notice}</p> : null}</>;
}
