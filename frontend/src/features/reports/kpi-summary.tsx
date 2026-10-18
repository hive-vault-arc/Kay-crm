import { CompletedIcon, DealIcon, InboxIcon, ContactsIcon, FinanceIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { formatBusinessDate, formatMAD } from "@/lib/format";
import type { Metric, MetricKey } from "./contracts";

const highlights = [
  { key: "contacts", tone: "text-info", icon: ContactsIcon },
  { key: "active_deals", tone: "text-warning", icon: DealIcon },
  { key: "enquiries", tone: "text-purple", icon: InboxIcon },
  { key: "won", tone: "text-success", icon: CompletedIcon },
  { key: "collections", tone: "text-teal", icon: FinanceIcon },
] as const;
const shortLabels: Record<(typeof highlights)[number]["key"], string> = {
  contacts: "Contacts actifs",
  active_deals: "Affaires actives",
  enquiries: "Demandes reçues",
  won: "Affaires gagnées",
  collections: "Encaissements",
};

export function KpiSummary({ metrics, startOn, endOn, open }: { metrics: Metric[]; startOn: string; endOn: string; open: (key: MetricKey) => void }) {
  const [startYear, startMonth, startDay] = startOn.split("-").map(Number);
  const [endYear, endMonth, endDay] = endOn.split("-").map(Number);
  const sameMonth = startYear === endYear && startMonth === endMonth;
  const monthLabel = new Intl.DateTimeFormat("fr-MA", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(startYear, startMonth - 1, 1)));
  const periodLabel = sameMonth ? `${startDay}–${endDay} ${monthLabel}` : `${formatBusinessDate(startOn)} – ${formatBusinessDate(endOn)}`;
  return <div role="group" className="kpi-summary grid min-w-0 xl:grid-cols-5" aria-label="Synthèse des indicateurs" aria-describedby="dashboard-period-description">
    {(["current", "period"] as const).map(basis => <section key={basis} aria-label={basis === "current" ? "Situation actuelle" : "Période sélectionnée"} className={basis === "current" ? "min-w-0 xl:col-span-2" : "min-w-0 xl:col-span-3"}>
      <h2>{basis === "current" ? "Situation actuelle" : <>Période sélectionnée <span className="kpi-summary-period">({periodLabel})</span></>}</h2>
      <dl className={`grid min-w-0 gap-3 ${basis === "current" ? "sm:grid-cols-2" : metrics.some(metric => metric.key === "collections") ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {highlights.map(({ key, icon: Icon }) => {
          const metric = metrics.find(value => value.key === key && value.basis === basis);
          return metric ? <div key={key} data-category={key} className="kpi-card min-w-0">
            <dt className="contents"><span className="kpi-badge" aria-hidden="true"><Icon className="size-5" /></span><span className="min-w-0 wrap-anywhere text-sm font-semibold"><span aria-hidden="true">{shortLabels[key]}</span><span className="sr-only">{metric.label}</span></span></dt>
            <dd className="col-start-2"><Button variant="link" className="kpi-value h-auto min-h-control min-w-control max-w-full justify-start whitespace-normal p-0 text-left tabular-nums wrap-anywhere" aria-label={`Dossiers : ${metric.label}`} onClick={() => open(metric.key)}>{metric.unit === "MAD" ? formatMAD(metric.value) : metric.value}</Button></dd>
          </div> : null;
        })}
      </dl>
    </section>)}
  </div>;
}
