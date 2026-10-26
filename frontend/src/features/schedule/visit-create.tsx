"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ContactSelector } from "@/features/contacts/contact-selector";
import { contactSchema, type ContactSummary } from "@/features/contacts/contracts";
import { useQuery } from "@/features/contacts/use-query";
import { RecordError } from "@/features/contacts/record-states";
import { useUnsavedGuard } from "@/components/shared/unsaved-guard";
import { VisitForm } from "./visit-form";

export function VisitCreate({ actorId, contactId, date }: { actorId: string; contactId?: string; date?: string }) {
  const [contact, setContact] = useState<ContactSummary>();
  if (contactId) return <Prefilled actorId={actorId} contactId={contactId} date={date} />;
  return contact ? <ForContact key={`${contact.id}/${date ?? ""}`} actorId={actorId} contact={contact} date={date} /> : <section className="grid max-w-reading gap-6"><h2 className="text-section font-medium">Choisir le contact de la visite</h2><ContactSelector choose={setContact} /></section>;
}
function Prefilled({ actorId, contactId, date }: { actorId: string; contactId: string; date?: string }) {
  const query = useQuery(`/api/v1/contacts/${contactId}`, contactSchema);
  if (query.error) return <RecordError error={query.error} retry={query.refresh} />;
  return query.value ? <ForContact key={`${query.value.id}/${date ?? ""}`} actorId={actorId} contact={query.value} date={date} /> : <p role="status">Vérification du contact…</p>;
}
function ForContact({ actorId, contact, date }: { actorId: string; contact: ContactSummary; date?: string }) {
  const router = useRouter(), guard = useUnsavedGuard();
  if (contact.archived_at) return <p role="status">Contact archivé. Restaurez-le avant de planifier une visite.</p>;
  return <div className="grid min-w-0 gap-6">{guard.dialog}<VisitForm initialDate={date} contactId={contact.id} contactName={contact.name} actorId={actorId} saved={id => router.push(`/visits/${id}`)} /><Button action="back" variant="outline" className="justify-self-start" onClick={() => guard.request(() => router.push("/visits"))}>Retour au calendrier</Button></div>;
}
