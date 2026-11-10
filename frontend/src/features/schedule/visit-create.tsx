"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ContactsIcon } from "@/components/icons";
import { SectionHeading } from "@/components/shared/section-heading";
import { ContactSelector } from "@/features/contacts/contact-selector";
import { contactSchema, type ContactSummary } from "@/features/contacts/contracts";
import { useQuery } from "@/features/contacts/use-query";
import { RecordError } from "@/features/contacts/record-states";
import { VisitForm } from "./visit-form";
import { VisitRouteDrawer } from "./visit-route-drawer";

export function VisitCreate({ actorId, contactId, date }: { actorId: string; contactId?: string; date?: string }) {
  const [contact, setContact] = useState<ContactSummary>();
  const [choosing, setChoosing] = useState(!contactId);
  const choose = (value: ContactSummary) => { setContact(value); setChoosing(false); };
  return <VisitRouteDrawer title="Planifier une visite" description="Nouveau rendez-vous">{close => choosing ? <section className="kay-visit-contact-step"><SectionHeading as="h3" icon={ContactsIcon}>Choisir le contact</SectionHeading><p className="text-sm text-muted-foreground">Sélectionnez le contact avant de renseigner le rendez-vous.</p><ContactSelector choose={choose} /></section> : contact ? <ForContact key={contact.id} actorId={actorId} contact={contact} date={date} close={close} change={() => setChoosing(true)} /> : <Prefilled actorId={actorId} contactId={contactId!} date={date} close={close} change={() => setChoosing(true)} />}</VisitRouteDrawer>;
}
function Prefilled({ actorId, contactId, date, close, change }: { actorId: string; contactId: string; date?: string; close: () => void; change: () => void }) {
  const query = useQuery(`/api/v1/contacts/${contactId}`, contactSchema);
  if (query.error) return <RecordError error={query.error} retry={query.refresh} />;
  return query.value ? <ForContact key={query.value.id} actorId={actorId} contact={query.value} date={date} close={close} change={change} /> : <p role="status">Vérification du contact…</p>;
}
function ForContact({ actorId, contact, date, close, change }: { actorId: string; contact: ContactSummary; date?: string; close: () => void; change: () => void }) {
  const router = useRouter();
  if (contact.archived_at) return <p role="status">Contact archivé. Restaurez-le avant de planifier une visite.</p>;
  return <VisitForm initialDate={date} contactId={contact.id} contactName={contact.name} actorId={actorId} changeContact={change} cancel={close} saved={id => router.replace(`/visits/${id}`, { scroll: false })} />;
}
