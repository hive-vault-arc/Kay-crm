"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, ContactIcon, ContactsIcon, EmailIcon, LocationIcon, PhoneIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { RecordFact, RecordFacts } from "@/components/shared/record-facts";
import { RecordSection } from "@/components/shared/record-workspace";
import { currentRecord } from "@/features/realtime/current-record";
import { contactSchema } from "./contracts";
import { useQuery } from "./use-query";
import { RecordError } from "./record-states";
import type { ApiError } from "@/lib/api/client";
import type { Contact, ContactSummary } from "./contracts";
import { ContactInlineField } from "./contact-inline-field";
import type { ContactEditBinding } from "./contact-edit-intent";

export function ContactProfilePanel({ contact, writable = false, changed, denied, actorId, role, salesRecord = false }: { contact: ContactSummary; writable?: boolean; changed?: () => void | Promise<void>; denied?: (error: ApiError, acknowledged?: boolean) => void; salesRecord?: boolean } & ContactEditBinding) {
  const [updated, setUpdated] = useState<Contact>(), [methodsVisited, setMethodsVisited] = useState(false), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const current = currentRecord<ContactSummary>(contact, updated, contact.id) ?? contact;
  const editable = writable && !current.archived_at && Boolean(denied);
  const common = { contact: current, writable: editable, actorId, role, saved: async (value: Contact) => { if (!alive.current) return; setUpdated(value); await changed?.(); }, denied: denied ?? (() => {}) };
  const owner = <RecordFact icon={ContactsIcon} label="Agent responsable">{current.primary_agent.display_name}</RecordFact>;
  const country = <ContactInlineField {...common} icon={LocationIcon} field="country" label="Pays de résidence" />;
  const nationality = <ContactInlineField {...common} icon={LocationIcon} field="nationality" label="Nationalité" />;
  const languages = <ContactInlineField {...common} icon={ContactIcon} field="languages" label="Langues parlées" />;
  const phone = <ContactInlineField {...common} icon={PhoneIcon} field="phones" label="Téléphone" display={current.primary_phone} methodScope="primary" />;
  const email = <ContactInlineField {...common} icon={EmailIcon} field="emails" label="E-mail" display={current.primary_email || "Non renseigné"} methodScope="primary" />;
  return <RecordSection title={salesRecord ? "Coordonnées" : "Contact"} action={<Button action="contact" asChild variant={salesRecord ? "secondary" : "outline"}><Link href={`/contacts/${current.id}`}>{salesRecord ? "Fiche du contact" : "Voir le contact"}</Link></Button>}><RecordFacts>
    <ContactInlineField {...common} icon={ContactIcon} field="name" label="Nom" />
    {salesRecord ? <>{email}{phone}{languages}{country}{nationality}</> : <>{owner}{phone}{email}</>}
  </RecordFacts><details className="kay-contact-more" onToggle={event => { if (event.currentTarget.open) setMethodsVisited(true); }}><summary>{salesRecord ? <>Informations du contact <ChevronDownIcon size={16} aria-hidden="true" /></> : "Autres coordonnées"}</summary><RecordFacts>
    {salesRecord ? owner : <>{country}{nationality}{languages}</>}
    {methodsVisited ? <ContactAdditionalMethods actorId={actorId} role={role} key={`${current.id}:${actorId ?? ""}:${role ?? ""}`} contactId={current.id} writable={editable} saved={common.saved} denied={denied} /> : null}
    <RecordFact icon={PhoneIcon} label="Indicatif">{current.calling_code ?? "Non renseigné"}</RecordFact>
  </RecordFacts></details></RecordSection>;
}

function ContactAdditionalMethods({ contactId, writable, saved, denied, actorId, role }: { contactId: string; writable: boolean; saved: (value: Contact) => void | Promise<void>; denied?: (error: ApiError, acknowledged?: boolean) => void } & ContactEditBinding) {
  const query = useQuery(`/api/v1/contacts/${contactId}`, contactSchema);
  const [savedContact, setSavedContact] = useState<Contact>(), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const contact = currentRecord(query.value, savedContact, contactId);
  useEffect(() => { if (query.error && ["FORBIDDEN", "NOT_FOUND", "UNAUTHENTICATED", "PASSWORD_CHANGE_REQUIRED"].includes(query.error.code)) denied?.(query.error); }, [query.error, denied]);
  if (query.error) return <RecordFact icon={ContactIcon} label="Coordonnées supplémentaires"><RecordError error={query.error} retry={query.refresh} /></RecordFact>;
  if (!contact) return <RecordFact icon={ContactIcon} label="Coordonnées supplémentaires"><p role="status">Chargement…</p></RecordFact>;
  const common = { contact, writable, actorId, role, saved: async (value: Contact) => { if (!alive.current) return; setSavedContact(value); await saved(value); if (alive.current) query.refreshQuietly(); }, denied: denied ?? (() => {}) };
  return <>{contact.type === "person" ? <ContactInlineField {...common} icon={ContactIcon} field="birth_date" label="Date de naissance" /> : null}<ContactInlineField {...common} icon={PhoneIcon} field="phones" label="Téléphones secondaires" methodScope="secondary" display={<span className="whitespace-pre-wrap">{contact.phones.filter(value => !value.is_primary).map(value => value.number + (value.label ? " · " + value.label : "")).join("\n") || "Aucun"}</span>} /><ContactInlineField {...common} icon={EmailIcon} field="emails" label="E-mails supplémentaires" methodScope="secondary" display={<span className="whitespace-pre-wrap">{contact.emails.filter(value => !value.is_primary).map(value => value.email + (value.label ? " · " + value.label : "")).join("\n") || "Aucun"}</span>} /></>;
}
