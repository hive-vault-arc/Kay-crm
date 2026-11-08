"use client";

import { ChartIcon, ContactsIcon, DevelopmentIcon, FinanceIcon, ForwardIcon, NotificationIcon } from "@/components/icons";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { formatMAD } from "@/lib/format";
import type { Metric, MetricKey } from "./contracts";
import { attributionTitles, reportGroups, reportTitles, type AttributionMetric } from "./report-model";

const sectionIcons = { activity: ChartIcon, inventory: DevelopmentIcon, finance: FinanceIcon };
export function ReportOverview({ metrics, drill, attribution, alerts }: {
  metrics: Metric[]; drill: (metric: MetricKey) => void; attribution: (metric: AttributionMetric) => void; alerts: () => void;
}) {
  return <div className="kay-report-overview">
    {reportGroups.map(group => {
      const rows = group.keys.flatMap(key => metrics.find(metric => metric.key === key) ?? []);
      return rows.length ? <section className="kay-report-section" key={group.title} aria-label={group.title}>
        <SectionHeading icon={sectionIcons[group.icon]} as="h2">{group.title}</SectionHeading>
        <div className="kay-report-grid">{rows.map(metric => <article className="kay-report-metric" data-metric={metric.key} key={metric.key} aria-label={metric.label}>
          <h3>{reportTitles[metric.key]}</h3><strong>{metric.unit === "MAD" ? formatMAD(metric.value) : metric.value}</strong>
          <small>{metric.basis === "current" ? "Situation actuelle" : "Période sélectionnée"}</small>
          <Button action="forward" variant="quiet" aria-label={`Dossiers : ${metric.label}`} onClick={() => drill(metric.key)}>Voir les dossiers</Button>
        </article>)}</div>
      </section> : null;
    })}
    <section className="kay-report-section" aria-label="Répartition par attribution">
      <SectionHeading icon={ContactsIcon} as="h2">Répartition par attribution</SectionHeading>
      <div className="kay-work-list">{(Object.keys(attributionTitles) as AttributionMetric[]).map(key => <Button key={key} variant="quiet" className="kay-report-tool" onClick={() => attribution(key)}><ContactsIcon aria-hidden="true" className="size-5" /><span>{attributionTitles[key]}</span><ForwardIcon aria-hidden="true" className="size-4" /></Button>)}</div>
    </section>
    <section className="kay-report-section" aria-label="Alertes à examiner">
      <SectionHeading icon={NotificationIcon} as="h2">À examiner</SectionHeading>
      <Button action="forward" variant="quiet" className="kay-report-alert-tool" onClick={alerts}>Alertes des affaires et disponibilités</Button>
    </section>
    <p className="kay-report-caption">Les niveaux d’inventaire ne s’additionnent pas. Les offres ne sont pas des biens supplémentaires. Les encaissements sont distincts des prix conclus et commissions prévues.</p>
  </div>;
}
