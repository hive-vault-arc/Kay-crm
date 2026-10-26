"use client";

import { useCallback, useSyncExternalStore, type Ref } from "react";
import { Button } from "@/components/ui/button";
import { useHydrated } from "@/hooks/use-hydrated";
import { directoryViewCookie, readDirectoryView, type DirectoryKind, type DirectoryView } from "@/lib/directory-view";
import { useUnsavedGuard } from "./unsaved-guard";

const subscribe = (changed: () => void) => { window.addEventListener("kay:directory-view", changed); return () => window.removeEventListener("kay:directory-view", changed); };
const serverSnapshot = (): DirectoryView => "list";
export function useDirectoryView(kind: DirectoryKind) {
  const snapshot = useCallback(() => readDirectoryView(kind, document.cookie), [kind]);
  const value = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const change = useCallback((view: DirectoryView) => { document.cookie = directoryViewCookie(kind, view, location.protocol === "https:"); window.dispatchEvent(new Event("kay:directory-view")); }, [kind]);
  return { value, change };
}
export function DirectoryViewSwitch({ value, change, phone, listRef }: { value: DirectoryView; change: (view: DirectoryView) => void; phone: boolean; listRef?: Ref<HTMLButtonElement> }) {
  const hydrated = useHydrated(), guard = useUnsavedGuard();
  const selected = phone ? "list" : value;
  return <><div className="kay-directory-views" role="group" aria-label="Présentation des dossiers"><Button action="list" ref={listRef} type="button" variant={selected === "list" ? "default" : "quiet"} aria-pressed={selected === "list"} disabled={!hydrated} onClick={() => { if (!phone && value !== "list") guard.request(() => change("list")); }}>Liste</Button>{!phone ? <Button action="board" type="button" data-kanban-choice variant={selected === "kanban" ? "default" : "quiet"} aria-pressed={selected === "kanban"} disabled={!hydrated} onClick={() => { if (value !== "kanban") guard.request(() => change("kanban")); }}>Kanban</Button> : null}</div>{guard.dialog}</>;
}
