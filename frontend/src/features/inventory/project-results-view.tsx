"use client";

import type { ReactNode } from "react";
import { DashboardIcon, TaskIcon } from "@/components/icons";
import { NativeSelect } from "@/components/ui/native-select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePhoneLayout } from "@/hooks/use-phone-layout";

export type ProjectView = "cards" | "list";
export type ProjectViewState = { view: ProjectView; changeView: (view: ProjectView) => void };

export function ProjectResultsView({ view, changeView, entity, status, sort, changeSort, children }: ProjectViewState & {
  entity: "biens" | "programmes"; status: string; sort: string; changeSort: (sort: string) => void; children: ReactNode;
}) {
  const phone = usePhoneLayout();
  return <Tabs value={phone ? "cards" : view} onValueChange={value => changeView(value === "list" ? "list" : "cards")} className="gap-3">
    <div className="projects-results-toolbar flex min-w-0 flex-wrap items-center justify-between gap-3">
      <p role="status" className="text-base">{status}</p>
      <div className="flex min-w-0 flex-wrap items-center gap-4">
        <TabsList aria-label={`Présentation des ${entity}`} className="kay-project-view-options"><TabsTrigger value="cards"><DashboardIcon aria-hidden="true" className="mr-2 size-5" />Cartes</TabsTrigger><TabsTrigger value="list"><TaskIcon aria-hidden="true" className="mr-2 size-5" />Liste</TabsTrigger></TabsList>
        <div className="project-sort"><NativeSelect aria-label="Trier par" value={sort} onChange={event => changeSort(event.target.value)}><option value="-updated_at">Plus récents</option><option value="reference">Référence</option></NativeSelect></div>
      </div>
    </div>
    {children}
  </Tabs>;
}
