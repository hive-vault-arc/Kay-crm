"use client";

import { useState, type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHydrated } from "@/hooks/use-hydrated";

export type RecordTab = { id: string; label: string; count?: number; content: ReactNode };

// Visit lazily, then retain the real controls and their draft state across tabs.
// CSS handles the phone layout; resizing never moves or clones a form.
export function RecordWorkspace({ tabs, aside, initialTab, label }: {
  tabs: RecordTab[]; aside?: ReactNode; initialTab?: string; label: string;
}) {
  const initial = tabs.some(tab => tab.id === initialTab) ? initialTab! : tabs[0].id;
  const [active, setActive] = useState(initial);
  const [visited, setVisited] = useState(() => new Set([initial]));
  const hydrated = useHydrated();
  return <div className="kay-record-workspace" data-has-aside={Boolean(aside)}>
    <Tabs className="kay-record-dossier kay-surface" value={active} onValueChange={id => { setVisited(previous => new Set([...previous, id])); setActive(id); }}>
      <TabsList className="kay-record-tabs" aria-label={label}>{tabs.map(tab => <TabsTrigger key={tab.id} value={tab.id} disabled={!hydrated}>{tab.label}{tab.count !== undefined ? <span className="kay-tab-count">{tab.count}</span> : null}</TabsTrigger>)}</TabsList>
      {tabs.map(tab => visited.has(tab.id) ? <TabsContent forceMount key={tab.id} value={tab.id} hidden={active !== tab.id} className="kay-record-panel" tabIndex={0}>{tab.content}</TabsContent> : null)}
    </Tabs>
    {aside ? <aside className="kay-record-aside kay-surface" aria-label="Suivi et outils">{aside}</aside> : null}
  </div>;
}

export function RecordSection({ title, action, children, description, count }: {
  title: string; action?: ReactNode; children: ReactNode; description?: string; count?: number;
}) {
  return <section className="kay-record-section"><header className="kay-section-head"><h2>{title}{count !== undefined ? <span className="kay-section-count">{count}</span> : null}</h2>{action ? <div className="kay-section-actions">{action}</div> : null}</header>{description ? <p className="kay-section-description">{description}</p> : null}<div className="kay-section-body">{children}</div></section>;
}
