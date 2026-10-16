"use client";

import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { contactSchema, type Enquiry } from "./contracts";
import { commandResultSchema } from "./ownership-contracts";
import { RecordError } from "./record-states";
import { useQuery } from "./use-query";

export function EnquiryAssignment({ enquiry, saved }: { enquiry: Enquiry; saved: () => void }) {
  const query = useQuery(`/api/v1/contacts/${enquiry.contact.id}`, contactSchema);
  const control = useId();
  const [selected, setSelected] = useState(enquiry.assigned_agent?.id ?? "");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError>();
  const attempt = useRef({ body: "", key: "" });
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(undefined);
    const body = { expected_version: enquiry.version, assigned_agent_id: selected || null, reason: reason.trim() };
    const fingerprint = JSON.stringify(body);
    if (attempt.current.body !== fingerprint) attempt.current = { body: fingerprint, key: crypto.randomUUID() };
    try { await apiCommand(`/api/v1/enquiries/${enquiry.id}/assign`, body, commandResultSchema, attempt.current.key); saved(); }
    catch (failure) { setError(failure instanceof ApiError ? failure : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); }
    finally { setBusy(false); }
  }
  return <section className="grid gap-4"><h2 className="text-section font-medium">Attribution de la demande</h2>
    {query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <p role="status">Chargement des agents du contact…</p> : <form className="grid gap-4" onSubmit={event => void submit(event)} aria-busy={busy}>
      <fieldset className="grid gap-4" disabled={busy}>
        <div className="grid gap-2"><Label htmlFor={`${control}-agent`}>Attribuer à un agent du contact</Label><NativeSelect id={`${control}-agent`} value={selected} onChange={event => setSelected(event.target.value)}><option value="">File du responsable, non attribuée</option>{[query.value.primary_agent, ...query.value.collaborators].map(value => <option key={value.id} value={value.id}>{value.display_name}</option>)}</NativeSelect></div>
        <div className="grid gap-2"><Label htmlFor={`${control}-reason`}>Motif de l’attribution</Label><Textarea required maxLength={1000} rows={2} id={`${control}-reason`} value={reason} onChange={event => setReason(event.target.value)} /></div>
        <Button action="assign" className="justify-self-start" disabled={selected === (enquiry.assigned_agent?.id ?? "")}>Attribuer cette demande</Button>
      </fieldset>
      {error ? <RecordError error={error} /> : null}
      <p className="text-sm text-muted-foreground">L’accès au contact est revérifié à l’enregistrement ; le changement conserve l’ancien et le nouvel agent ainsi que l’acteur de la décision.</p>
    </form>}
  </section>;
}
