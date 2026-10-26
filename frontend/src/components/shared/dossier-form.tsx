"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { RecordHeader } from "./record-header";

/** One form, one action row and one continuous dossier surface at every width. */
export function DossierFormHeader({ title, route, backHref, description, actions }: {
  title: string; route: string; backHref?: string; description?: ReactNode; actions: ReactNode;
}) {
  return <RecordHeader title={title} route={route} backHref={backHref} metadata={description} actions={actions} />;
}

// Only actual editable values contribute: searching a picker is not a dossier edit.
// The baseline changes only after a successful command or an explicit reload.
export function useDossierDraft(values: unknown, busy = false) {
  const signature = JSON.stringify(values);
  const [baseline, setBaseline] = useState(signature);
  const dirty = signature !== baseline, active = dirty || busy;
  const wasActive = useRef(false);
  useEffect(() => {
    const released = wasActive.current && !active;
    wasActive.current = active;
    if (released) notifyDraftCleared();
  }, [active]);
  useEffect(() => () => { if (wasActive.current) notifyDraftCleared(); }, []);
  return { dirty, accept: (next: unknown = values) => setBaseline(JSON.stringify(next)) };
}

function notifyDraftCleared() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("kay:draft-cleared"));
}
