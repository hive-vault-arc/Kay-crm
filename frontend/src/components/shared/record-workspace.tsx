"use client";

import { useState, type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHydrated } from "@/hooks/use-hydrated";

export type RecordTab = { id: string; label: string; count?: number; content: ReactNode };

// Visit lazily, then retain the real controls and their draft state across tabs.
// CSS handles the phone layout; resizing never moves or clones a form.
export function RecordWorkspace({ tabs, aside, initialTab, label, activeTab, onTabChange, hideSingleTab = false }: {
  tabs: RecordTab[]; aside?: ReactNode; initialTab?: string; label: string; activeTab?: string; onTabChange?: (id: string) => void; hideSingleTab?: boolean;
}) {
  const initial = tabs.some(tab => tab.id === initialTab) ? initialTab! : tabs[0].id;
  const [localActive, setActive] = useState(initial);
  const active = tabs.some(tab => tab.id === activeTab) ? activeTab! : localActive;
  const [visited, setVisited] = useState(() => new Set([initial]));
  // External overview links can select a panel without firing the tab callback.
  // Remember that panel before a later selection so its real draft stays mounted.
  if (!visited.has(active)) setVisited(previous => new Set([...previous, active]));
  const hydrated = useHydrated();
  return <div className="kay-record-workspace" data-has-aside={Boolean(aside)}>
    {hideSingleTab && tabs.length === 1 ? <section className="kay-record-dossier kay-surface"><div className="kay-record-panel" role="region" aria-label={label} tabIndex={0}>{tabs[0].content}</div></section> : <Tabs className="kay-record-dossier kay-surface" value={active} onValueChange={id => { setVisited(previous => new Set([...previous, active, id])); setActive(id); onTabChange?.(id); }}>
      <TabsList className="kay-record-tabs" aria-label={label}>{tabs.map(tab => <TabsTrigger key={tab.id} value={tab.id} disabled={!hydrated}>{tab.label}{tab.count !== undefined ? <span className="kay-tab-count">{tab.count}</span> : null}</TabsTrigger>)}</TabsList>
      {tabs.map(tab => visited.has(tab.id) || active === tab.id ? <TabsContent forceMount key={tab.id} value={tab.id} hidden={active !== tab.id} className="kay-record-panel" tabIndex={0}>{tab.content}</TabsContent> : null)}
    </Tabs>}
    {aside ? <aside className="kay-record-aside kay-surface" aria-label="Suivi et outils">{aside}</aside> : null}
  </div>;
}

export function RecordSection({ title, action, children, description, count }: {
  title: string; action?: ReactNode; children: ReactNode; description?: string; count?: number;
}) {
  return <section className="kay-record-section"><header className="kay-section-head"><h2>{title}{count !== undefined ? <span className="kay-section-count">{count}</span> : null}</h2>{action ? <div className="kay-section-actions">{action}</div> : null}</header>{description ? <p className="kay-section-description">{description}</p> : null}<div className="kay-section-body">{children}</div></section>;
}
