"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, ApiError } from "@/lib/api/client";
import { useDossierDraft } from "@/components/shared/dossier-form";
import { useHydrated } from "@/hooks/use-hydrated";
import { useEntryCommand, type EntryDenied } from "@/features/activities/use-entry-command";
import { currentRecord } from "@/features/realtime/current-record";
import { contactSchema, enquirySchema, type Contact, type Enquiry } from "./contracts";
import { RecordError } from "./record-states";
import { useQuery } from "./use-query";
import { ContactsIcon } from "@/components/icons";
import { SectionHeading } from "@/components/shared/section-heading";

type AssignmentProps = { enquiry: Enquiry; saved: (signal: AbortSignal) => void | Promise<void>; denied?: EntryDenied };
export function EnquiryAssignment(props: AssignmentProps) { return <AssignmentLifetime key={`${props.enquiry.id}:${props.enquiry.contact.id}`} {...props} />; }
function AssignmentLifetime({ enquiry, saved, denied }: AssignmentProps) {
  const query = useQuery(`/api/v1/contacts/${enquiry.contact.id}`, contactSchema);
  const control = useId(), hydrated = useHydrated();
  const [snapshot, setSnapshot] = useState(enquiry), [available, setAvailable] = useState<Contact>(), [refreshed, setRefreshed] = useState<Contact>();
  if (query.value && query.value !== available) setAvailable(query.value);
  const contact = currentRecord(query.value ?? available, refreshed, enquiry.contact.id);
  const [selected, setSelected] = useState(enquiry.assigned_agent?.id ?? "");
  const [reason, setReason] = useState("");
  const authorityError = query.error && [401, 403, 404].includes(query.error.status) ? query.error : undefined;
  const command = useEntryCommand({ path: `/api/v1/enquiries/${enquiry.id}/assign`, contactId: enquiry.contact.id, denied, authorityError, saved: async signal => { draft.accept(); await saved(signal); } });
  const draft = useDossierDraft({ selected, reason }, command.protected);
  const options = contact ? [contact.primary_agent, ...contact.collaborators] : [], validSelection = !selected || options.some(value => value.id === selected);
  const unavailable = Boolean(query.error) || !contact || contact.id !== enquiry.contact.id;
  async function refresh() {
    await command.refresh(async signal => {
      const [fresh, updated] = await Promise.all([apiGet(`/api/v1/contacts/${enquiry.contact.id}`, contactSchema, signal), apiGet(`/api/v1/enquiries/${enquiry.id}`, enquirySchema, signal)]);
      if (signal.aborted) return;
      if (fresh.id !== enquiry.contact.id || updated.id !== enquiry.id || updated.contact.id !== enquiry.contact.id) throw new ApiError("CONTACT_MERGED", 409);
      setSnapshot(updated); setRefreshed(fresh); query.refresh();
    });
  }
  const accessError = command.accessError;
  if (accessError) return <section className="grid gap-3"><RecordError error={accessError} />{command.acknowledged ? <p role="status">L’attribution est enregistrée. Les droits d’accès ont changé.</p> : null}</section>;
  return <section className="crm-panel crm-assignment-panel"><SectionHeading compact icon={ContactsIcon}>Attribution de la demande</SectionHeading>
    {query.error ? <RecordError error={query.error} /> : !contact ? <p role="status">Chargement des agents du contact…</p> : contact.id !== enquiry.contact.id ? <RecordError error={new ApiError("CONTACT_MERGED", 409)} /> : null}
    <form className="grid gap-4" method="post" data-draft-managed data-live-dirty={draft.dirty || command.uncertain || undefined} data-write-recovery={command.uncertain || undefined} aria-busy={command.protected} onSubmit={event => { event.preventDefault(); if (command.uncertain) void command.retry(); else if (!unavailable && validSelection && selected !== (snapshot.assigned_agent?.id ?? "")) void command.submit({ expected_version: snapshot.version, assigned_agent_id: selected || null, reason }); }}>
      <fieldset className="grid gap-4" disabled={!hydrated || unavailable || command.protected || command.complete}>
        <div className="grid gap-2"><Label htmlFor={`${control}-agent`}>Attribuer à un agent du contact</Label><NativeSelect id={`${control}-agent`} value={selected} onChange={event => { if (command.canEdit()) setSelected(event.target.value); }}><option value="">File du responsable, non attribuée</option>{selected && !validSelection ? <option value={selected} disabled>Agent précédemment choisi · à vérifier</option> : null}{options.map(value => <option key={value.id} value={value.id}>{value.display_name}</option>)}</NativeSelect></div>
        <div className="grid gap-2"><Label htmlFor={`${control}-reason`}>Motif de l’attribution</Label><Textarea required maxLength={1000} rows={2} id={`${control}-reason`} value={reason} onChange={event => { if (command.canEdit()) setReason(event.target.value); }} /></div>
      </fieldset>
      {command.error ? <RecordError error={command.error} /> : null}
      {command.uncertain ? <p role="status">{command.acknowledged ? "L’attribution est enregistrée. Actualisez son résultat sans l’enregistrer à nouveau." : "La réponse est interrompue. Réessayez la même attribution pour retrouver son résultat."}</p> : command.complete ? <p role="status">Attribution enregistrée.</p> : null}
      <div className="flex flex-wrap gap-2"><Button action="refresh" type="button" variant="outline" disabled={!hydrated || command.protected || command.complete} onClick={() => void refresh()}>Actualiser les versions</Button><Button action="assign" type="submit" disabled={!hydrated || command.busy || command.complete || !command.uncertain && (unavailable || !validSelection || selected === (snapshot.assigned_agent?.id ?? ""))}>{command.busy ? "Enregistrement…" : command.uncertain ? command.acknowledged ? "Actualiser le résultat" : "Réessayer la même opération" : "Attribuer cette demande"}</Button></div>
    </form>
  </section>;
}
