"use client";

import { RecordDrawer } from "@/components/shared/record-drawer";
import { RecordSection } from "@/components/shared/record-workspace";
import type { Contact, StaffRole } from "@/features/contacts/contracts";
import { FilePanel } from "@/features/files/file-panel";

export function OwnerDocuments({ contact, actorId, role }: { contact: Contact; actorId?: string; role: StaffRole }) {
  const files = { parentKind: "contact" as const, parentId: contact.id, actorId, role, writable: !contact.archived_at };
  return <RecordSection title="Documents" action={
    <RecordDrawer label="Voir les documents" title="Documents du propriétaire" action="file" description="Pièces jointes privées du contact propriétaire.">
      {contact.type !== "person" ? <p className="text-sm text-muted-foreground">Les copies déjà enregistrées restent accessibles ici.</p> : null}
      <FilePanel {...files} writable={files.writable && contact.type === "person"} purpose="identity_card" />
      <FilePanel {...files} />
    </RecordDrawer>
  }>
    <p className="text-sm text-muted-foreground">{contact.type === "person" ? "Carte nationale et autres pièces jointes du propriétaire." : "Pièces jointes du propriétaire."}</p>
  </RecordSection>;
}
