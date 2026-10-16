import { CompletedIcon, DealIcon, InboxIcon, ContactsIcon, FinanceIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { formatMAD } from "@/lib/format";
import type { Metric, MetricKey } from "./contracts";

const highlights = [
  { key: "contacts", tone: "text-info", icon: ContactsIcon },
  { key: "active_deals", tone: "text-warning", icon: DealIcon },
  { key: "enquiries", tone: "text-purple", icon: InboxIcon },
  { key: "won", tone: "text-success", icon: CompletedIcon },
  { key: "collections", tone: "text-teal", icon: FinanceIcon },
] as const;

export function KpiSummary({ metrics, open }: { metrics: Metric[]; open: (key: MetricKey) => void }) {
  return <div role="group" className="grid min-w-0 overflow-hidden rounded-md border bg-card xl:grid-cols-5" aria-label="Synthèse des indicateurs">
    {(["current", "period"] as const).map(basis => <section key={basis} aria-label={basis === "current" ? "Situation actuelle" : "Période sélectionnée"} className={basis === "current" ? "min-w-0 border-b xl:col-span-2 xl:border-r xl:border-b-0" : "min-w-0 xl:col-span-3"}>
      <h2 className="border-b bg-muted/40 px-4 py-2 text-sm font-semibold">{basis === "current" ? "Situation actuelle" : "Période sélectionnée"}</h2>
      <dl className={`grid min-w-0 divide-y sm:divide-x sm:divide-y-0 ${basis === "current" ? "sm:grid-cols-2" : metrics.some(metric => metric.key === "collections") ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {highlights.map(({ key, tone, icon: Icon }) => {
          const metric = metrics.find(value => value.key === key && value.basis === basis);
          return metric ? <div key={key} className="grid min-w-0 content-start gap-1 px-4 py-3">
            <dt className="flex items-start gap-2 text-sm font-medium"><Icon aria-hidden="true" className={`mt-0.5 size-4 shrink-0 ${tone}`} /><span className="wrap-anywhere">{metric.label}</span></dt>
            <dd><Button variant="link" className={`h-auto min-h-control min-w-control max-w-full justify-start whitespace-normal p-0 text-left text-2xl font-semibold tabular-nums wrap-anywhere ${tone}`} aria-label={`Dossiers : ${metric.label}`} onClick={() => open(metric.key)}>{metric.unit === "MAD" ? formatMAD(metric.value) : metric.value}</Button></dd>
          </div> : null;
        })}
      </dl>
    </section>)}
  </div>;
}
