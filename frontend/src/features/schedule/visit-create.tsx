"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ContactSelector } from "@/features/contacts/contact-selector";
import { contactSchema, type ContactSummary } from "@/features/contacts/contracts";
import { useQuery } from "@/features/contacts/use-query";
import { RecordError } from "@/features/contacts/record-states";
import { VisitForm } from "./visit-form";

export function VisitCreate({ actorId, contactId }: { actorId: string; contactId?: string }) {
  const [contact, setContact] = useState<ContactSummary>();
  if (contactId) return <Prefilled actorId={actorId} contactId={contactId} />;
  return contact ? <ForContact key={contact.id} actorId={actorId} contact={contact} /> : <section className="grid max-w-reading gap-6"><h2 className="text-section font-medium">Choisir le contact de la visite</h2><ContactSelector choose={setContact} /></section>;
}
function Prefilled({ actorId, contactId }: { actorId: string; contactId: string }) {
  const query = useQuery(`/api/v1/contacts/${contactId}`, contactSchema);
  if (query.error) return <RecordError error={query.error} retry={query.refresh} />;
  return query.value ? <ForContact key={query.value.id} actorId={actorId} contact={query.value} /> : <p role="status">Vérification du contact…</p>;
}
function ForContact({ actorId, contact }: { actorId: string; contact: ContactSummary }) {
  const router = useRouter();
  if (contact.archived_at) return <p role="status">Contact archivé. Restaurez-le avant de planifier une visite.</p>;
  return <div className="grid min-w-0 gap-6"><VisitForm contactId={contact.id} contactName={contact.name} actorId={actorId} saved={id => router.push(`/visits/${id}`)} /><Button action="back" variant="outline" className="justify-self-start" onClick={() => router.push("/visits")}>Retour au calendrier</Button></div>;
}
