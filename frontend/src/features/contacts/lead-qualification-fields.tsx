"use client";

import { useId } from "react";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { statusLabels, writableStatusSchema } from "./contracts";
import { campaignSchema, ratingLabels, ratingSchema, type QualificationMetadata } from "./qualification-contracts";
import { BudgetInput } from "./qualification-inputs";
import type { z } from "zod";

export type LeadQualification = {
  initial_budget: string; campaign_source: z.infer<typeof campaignSchema>;
  rating: z.infer<typeof ratingSchema>; status: z.infer<typeof writableStatusSchema>;
};
export const blankQualification: LeadQualification = { initial_budget: "", campaign_source: "unknown", rating: "cold", status: "new" };

export function LeadQualificationFields({ value, change, metadata, budgetError }: {
  value: LeadQualification; change: (values: Partial<LeadQualification>) => void;
  metadata: QualificationMetadata; budgetError?: string;
}) {
  const id = useId();
  return <div className="grid min-w-0 gap-4 sm:grid-cols-2">
    <div className="grid min-w-0 content-start gap-2"><Label htmlFor={`${id}-budget`}>Budget *</Label><BudgetInput id={`${id}-budget`} metadata={metadata} value={value.initial_budget} onChange={initial_budget => change({ initial_budget })} />{budgetError ? <p role="alert" className="text-sm text-danger">{budgetError}</p> : null}</div>
    <div className="grid min-w-0 content-start gap-2"><Label htmlFor={`${id}-campaign`}>Source du prospect</Label><NativeSelect id={`${id}-campaign`} value={value.campaign_source} onChange={event => change({ campaign_source: campaignSchema.parse(event.target.value) })}>{metadata.campaign_sources.map(source => <option key={source.value} value={source.value}>{source.label}</option>)}</NativeSelect></div>
    <div className="grid min-w-0 content-start gap-2"><Label htmlFor={`${id}-status`}>Statut</Label><NativeSelect id={`${id}-status`} value={value.status} onChange={event => change({ status: writableStatusSchema.parse(event.target.value) })}>{writableStatusSchema.options.map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}</NativeSelect></div>
    <div className="grid min-w-0 content-start gap-2"><Label htmlFor={`${id}-rating`}>Qualification</Label><NativeSelect id={`${id}-rating`} value={value.rating} onChange={event => change({ rating: ratingSchema.parse(event.target.value) })}>{Object.entries(ratingLabels).map(([rating, label]) => <option key={rating} value={rating}>{label}</option>)}</NativeSelect></div>
  </div>;
}
