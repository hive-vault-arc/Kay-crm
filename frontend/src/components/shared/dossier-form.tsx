"use client";

import { useState, type ReactNode } from "react";
import { RecordHeader } from "./record-header";

/** One form, one action row and one continuous dossier surface at every width. */
export function DossierFormHeader({ title, route, backHref, description, actions }: {
  title: string; route: string; backHref?: string; description?: ReactNode; actions: ReactNode;
}) {
  return <RecordHeader title={title} route={route} backHref={backHref} metadata={description} actions={actions} />;
}

// Only actual editable values contribute: searching a picker is not a dossier edit.
// The baseline changes only after a successful command or an explicit reload.
export function useDossierDraft(values: unknown) {
  const signature = JSON.stringify(values);
  const [baseline, setBaseline] = useState(signature);
  return { dirty: signature !== baseline, accept: (next: unknown = values) => setBaseline(JSON.stringify(next)) };
}
