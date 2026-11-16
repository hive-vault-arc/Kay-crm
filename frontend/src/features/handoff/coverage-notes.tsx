"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { FileIcon } from "@/components/icons";
import { RecordSection } from "@/components/shared/record-workspace";
import { Button } from "@/components/ui/button";
import { RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import { useHydrated } from "@/hooks/use-hydrated";
import { ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { formatInstant } from "@/lib/format";
import { coverageNotes, noteSeen, type CoverageKind, type HandoffNote } from "./contracts";

const anchor = "notes-autres-agents";

export function HandoffSection({ items, action, status, children }: {
  items?: HandoffNote[]; action?: (note: HandoffNote) => ReactNode; status?: ReactNode; children?: ReactNode;
}) {
  const section = useRef<HTMLDivElement>(null);
  const loaded = items !== undefined;
  useEffect(() => {
    function scrollToNotes() {
      if (window.location.hash === "#" + anchor) section.current?.scrollIntoView({ block: "start" });
    }
    scrollToNotes();
    window.addEventListener("hashchange", scrollToNotes);
    return () => window.removeEventListener("hashchange", scrollToNotes);
  }, [loaded]);
  return <div id={anchor} ref={section} className="mt-3 min-w-0 scroll-mt-24 rounded-lg border border-info/30 bg-info-background p-4">
    <RecordSection title="Notes d’autres agents" label="Notes d’autres agents" action={<FileIcon size={20} aria-hidden="true" className="text-info" />}>
      {status}
      {items?.length ? <ul className="grid min-w-0 gap-3">{items.map(note => <li key={note.id} className="grid min-w-0 gap-2 rounded-md border bg-background p-3">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-sm"><strong className="wrap-anywhere">{note.author_name}</strong><time dateTime={note.created_at} className="text-muted-foreground">{formatInstant(note.created_at)}</time></div>
          {note.seen_at ? <span className="text-sm text-muted-foreground">Vue le {formatInstant(note.seen_at)}</span> : action?.(note)}
        </div>
        <p className="whitespace-pre-wrap wrap-anywhere">{note.body}</p>
      </li>)}</ul> : items ? <p className="text-sm text-muted-foreground">Aucune note d’un autre agent.</p> : null}
      {children}
    </RecordSection>
  </div>;
}

export function ScopedCoverageNotes({ kind, id }: { kind: CoverageKind; id: string }) {
  const path = `/api/v1/coverage/${kind}/${id}/notes` as const;
  const query = useQuery(path, coverageNotes);
  const hydrated = useHydrated();
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<ApiError>();
  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  async function mark(id: string) {
    if (!query.value?.can_mark_seen || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(id); setError(undefined);
    try {
      await apiCommand(`${path}/${id}/seen`, {}, noteSeen, crypto.randomUUID(), "POST", undefined, controller.signal);
      if (controller.signal.aborted) return;
      setSeen(current => new Set(current).add(id));
      query.refreshQuietly();
      window.dispatchEvent(new CustomEvent("kay:live-invalidate", { detail: ["notifications"] }));
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof ApiError ? cause : new ApiError("DEPENDENCY_UNAVAILABLE", 503));
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setBusy(undefined);
    }
  }
  return <HandoffSection items={query.error ? undefined : query.value?.items}
    status={query.error ? <RecordError error={query.error} retry={query.refresh} /> : error ? <RecordError error={error} /> : !query.value ? <p role="status">Chargement des notes…</p> : null}
    action={query.value?.can_mark_seen ? note => seen.has(note.id) ? <span role="status" className="text-sm">Vue</span> : <Button action="read" type="button" variant="outline" disabled={!hydrated || Boolean(busy)} onClick={() => void mark(note.id)}>{busy === note.id ? "Enregistrement…" : "Marquer comme vue"}</Button> : undefined} />;
}
