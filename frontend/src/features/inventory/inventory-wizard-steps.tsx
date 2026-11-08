"use client";

import type { KayIconComponent } from "@/components/icons";
import { Button } from "@/components/ui/button";

export type InventoryStep = { label: string; mobileLabel: string; icon: KayIconComponent };

export function InventoryWizardSteps({ steps, current, change, disabled, label = "Progression de la création" }: {
  steps: readonly InventoryStep[]; current: number; change: (step: number) => void; disabled: boolean; label?: string;
}) {
  return <nav aria-label={label} className="kay-form-stepper">
    <ol>{steps.map(({ label, mobileLabel }, index) => <li key={label}><Button type="button" variant="ghost" className="kay-stepper-item" aria-label={`Étape ${index + 1} sur ${steps.length} : ${label}`} aria-current={index === current ? "step" : undefined} disabled={disabled} onClick={() => change(index)}><span className="kay-stepper-number" aria-hidden="true">{index + 1}</span><span>{mobileLabel}</span></Button></li>)}</ol>
    <p className="sr-only" role="status">Étape {current + 1} sur {steps.length} : {steps[current].label}</p>
  </nav>;
}
