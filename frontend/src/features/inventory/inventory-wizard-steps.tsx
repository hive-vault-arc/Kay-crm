import { CheckIcon, type KayIconComponent } from "@/components/icons";

export type InventoryStep = { label: string; mobileLabel: string; icon: KayIconComponent };

export function InventoryWizardSteps({ steps, current, label = "Progression de la création" }: { steps: readonly InventoryStep[]; current: number; label?: string }) {
  return <nav aria-label={label} className="min-w-0">
    <ol className="grid grid-cols-3 gap-2 lg:grid-cols-1 lg:gap-0">
      {steps.map(({ label, mobileLabel, icon: Icon }, index) => <li key={label} aria-label={label} aria-current={index === current ? "step" : undefined} className={`flex min-w-0 flex-col items-start gap-2 border-b-2 py-3 lg:flex-row lg:items-center lg:border-b-0 lg:border-l-2 lg:px-4 ${index === current ? "border-primary text-foreground" : index < current ? "border-success text-foreground" : "border-transparent text-muted-foreground"}`}>
        <span className={`flex size-8 shrink-0 items-center justify-center rounded-sm ${index === current ? "bg-warning-background text-warning" : index < current ? "bg-success-background text-success" : "bg-muted text-muted-foreground"}`}>
          {index < current ? <CheckIcon aria-hidden="true" size={20} /> : <Icon aria-hidden="true" size={20} />}
        </span>
        <span className="min-w-0 text-xs font-medium leading-snug lg:text-sm"><span className="lg:hidden">{mobileLabel}</span><span className="hidden lg:inline">{label}</span></span>
      </li>)}
    </ol>
    <p className="mt-4 text-sm text-muted-foreground" role="status">Étape {current + 1} sur {steps.length}</p>
  </nav>;
}
