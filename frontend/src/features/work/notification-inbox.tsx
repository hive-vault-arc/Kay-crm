"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { NotificationIcon } from "@/components/icons";
import { RecordDrawer } from "@/components/shared/record-drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LiveNotificationIcon } from "@/features/realtime/notification-bell";
import { useHydrated } from "@/hooks/use-hydrated";
import { NotificationFilters, NotificationProblem } from "./notification-controls";
import { useNotificationFeed, type NotificationState } from "./notification-feed";
import { holidayNotice } from "./holiday-contracts";
import { NotificationPanel } from "./notification-panel";

type Presentation = { view: "closed" | "preview" | "all"; state: NotificationState };
export function NotificationInbox() {
  const [presentation, setPresentation] = useState<Presentation>({ view: "closed", state: "all" });
  const current = useRef<Presentation["view"]>("closed"), trigger = useRef<HTMLButtonElement>(null), heading = useRef<HTMLHeadingElement>(null), returnFocus = useRef<HTMLElement | null>(null), navigating = useRef(false);
  const hydrated = useHydrated(), pathname = usePathname(), previousPath = useRef(pathname);
  const show = useCallback((next: Presentation) => { current.current = next.view; setPresentation(next); }, []);
  const close = useCallback(() => show({ view: "closed", state: "all" }), [show]);
  useEffect(() => {
    const changed = previousPath.current !== pathname; previousPath.current = pathname;
    if (!changed) return;
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) { navigating.current = true; returnFocus.current = null; close(); } });
    return () => { cancelled = true; };
  }, [pathname, close]);
  function navigate() { navigating.current = true; returnFocus.current = null; close(); }
  return <><Popover open={presentation.view === "preview"} onOpenChange={open => { if (!hydrated || current.current === "all") return; navigating.current = false; show({ view: open ? "preview" : "closed", state: "all" }); }}><PopoverTrigger asChild><Button ref={trigger} variant="ghost" size="icon" aria-label="Ouvrir les notifications" disabled={!hydrated}><LiveNotificationIcon /></Button></PopoverTrigger>
    <PopoverContent className="kay-notification-popover" aria-label="Notifications" side="bottom" align="end" sideOffset={9} collisionPadding={12} onOpenAutoFocus={event => { event.preventDefault(); heading.current?.focus(); }} onCloseAutoFocus={event => { if (current.current === "all" || navigating.current) event.preventDefault(); }}>
      {presentation.view === "preview" ? <NotificationPreview heading={heading} close={close} navigate={navigate} all={state => { if (!hydrated) return; returnFocus.current = trigger.current; show({ view: "all", state }); }} /> : null}
    </PopoverContent>
  </Popover>{presentation.view === "all" ? <RecordDrawer label="Notifications" description="Votre suivi et les notifications internes accessibles." initialOpen hideTrigger onClosed={close} returnFocus={returnFocus}><NotificationPanel initialState={presentation.state} navigate={navigate} /></RecordDrawer> : null}</>;
}
export function NotificationPreview({ heading, close, navigate, all }: { heading: RefObject<HTMLHeadingElement | null>; close: () => void; navigate: () => void; all: (state: NotificationState) => void }) {
  const feed = useNotificationFeed(10), list = useRef<HTMLDivElement>(null), filters = useRef<HTMLDivElement>(null), restore = useRef<{ scroll: number; origin: Element | null } | undefined>(undefined);
  function read(operation: () => Promise<boolean>) {
    restore.current = { scroll: list.current?.scrollTop ?? 0, origin: list.current?.ownerDocument.activeElement ?? null };
    void operation().then(saved => { if (!saved) restore.current = undefined; });
  }
  useEffect(() => {
    if (!restore.current || feed.busy || feed.uncertain || !feed.value || !list.current || !filters.current) return;
    const { scroll, origin } = restore.current; restore.current = undefined;
    const document = list.current.ownerDocument, active = document.activeElement;
    if (active !== origin && active !== document.body && active !== heading.current) return;
    filters.current.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus({ preventScroll: true });
    list.current.scrollTop = scroll;
  }, [feed.busy, feed.uncertain, feed.value, heading]);
  return <div className="kay-notification-preview" aria-busy={Boolean(feed.busy)}><header className="kay-notification-heading"><div><h2 ref={heading} tabIndex={-1}>Notifications</h2>{feed.value ? <Badge variant="neutral">{feed.value.unread_total ? `${feed.value.unread_total} non lue${feed.value.unread_total > 1 ? "s" : ""}` : "À jour"}</Badge> : null}</div><Button action="close" type="button" variant="quiet" size="icon" aria-label="Fermer les notifications" title="Fermer les notifications" onClick={close}><span className="sr-only">Fermer</span></Button></header>
    <div ref={filters}><NotificationFilters feed={feed} /></div>
    <div ref={list} className="kay-notification-preview-list" role="region" aria-label="Notifications récentes" tabIndex={0}><NotificationProblem feed={feed} retry={() => read(feed.retry)} />{!feed.value ? !feed.problem ? <p role="status" className="text-sm text-muted-foreground">Chargement des notifications…</p> : null : feed.value.items.length ? <ul>{feed.value.items.map(item => <li key={item.id}><article className="kay-notification-preview-entry" data-read={Boolean(item.read_at)}>{item.href ? <Link href={item.href} className="kay-notification-copy" onClick={navigate}><strong>{item.title}</strong><small>{item.context}</small></Link> : <div className="kay-notification-copy"><strong>{item.title} · {item.context}</strong><small>{"start_on" in item ? holidayNotice(item) : null}</small></div>}{item.read_at ? <span className="kay-notification-read-state">Lue</span> : <Button action="read" type="button" variant="quiet" size="icon" className="kay-notification-read" aria-label={`Marquer comme lue · ${item.title}`} title="Marquer comme lue" disabled={!feed.hydrated || Boolean(feed.busy) || feed.uncertain} onClick={() => read(() => feed.markRead(item.id))}><span className="sr-only">Marquer comme lue</span></Button>}</article></li>)}</ul> : <div className="kay-notification-empty"><NotificationIcon size={24} aria-hidden="true" /><p>{feed.state === "unread" ? "Aucune notification non lue." : feed.state === "read" ? "Aucune notification lue." : "Aucune notification pour le moment."}</p></div>}</div>
    {feed.value ? <Button action="forward" type="button" variant="quiet" className="kay-notification-all" disabled={!feed.hydrated || Boolean(feed.busy) || feed.uncertain} onClick={() => { if (feed.hydrated && !feed.locked() && !feed.uncertain) all(feed.state); }}>Tout voir{feed.value.total ? ` · ${feed.value.total}` : ""}</Button> : null}
  </div>;
}
