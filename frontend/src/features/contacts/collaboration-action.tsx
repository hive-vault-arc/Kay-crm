"use client";

import { Button } from "@/components/ui/button";
import { RecordDrawer } from "@/components/shared/record-drawer";
import { contactSchema, type ContactSummary, type StaffRole } from "./contracts";
import { OwnershipControls } from "./ownership-controls";
import { RecordError } from "./record-states";
import { useQuery } from "./use-query";

export function CollaborationAction({ contact, role, actorId, changed, busy }: {
  contact: ContactSummary; role: StaffRole; actorId?: string; changed?: () => void; busy?: boolean;
}) {
  if (contact.archived_at || (role === "agent" && contact.primary_agent.id !== actorId)) return null;
  return <RecordDrawer label="Collaborateurs" action="assign" busy={busy} description="Les collaborateurs peuvent consulter et modifier ce contact et ses dossiers liés.">
    {(_close, saved) => <CollaborationEditor id={contact.id} role={role} onSaved={() => { changed?.(); saved(); }} />}
  </RecordDrawer>;
}

function CollaborationEditor({ id, role, onSaved }: { id: string; role: StaffRole; onSaved: () => void }) {
  const record = useQuery(`/api/v1/contacts/${id}`, contactSchema);
  if (record.error) return <RecordError error={record.error} retry={record.refresh} />;
  if (!record.value) return <p role="status">Chargement des collaborateurs…</p>;
  if (record.value.id !== id || record.value.archived_at) return <Button action="refresh" type="button" variant="outline" onClick={record.refresh}>Actualiser le contact</Button>;
  return <OwnershipControls contact={record.value} role={role} collaborationOnly embedded changed={async (_id, _operation, signal) => { if (!signal.aborted) onSaved(); }} />;
}
