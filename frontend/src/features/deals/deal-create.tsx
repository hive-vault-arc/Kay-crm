"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { contactSchema, type ContactSummary, type StaffRole } from "@/features/contacts/contracts";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { offeringsSchema, type Offering } from "@/features/inventory/contracts";
import { detailSchema } from "@/features/requirements/contracts";
import Link from "next/link";
import { apiGet, ApiError } from "@/lib/api/client";
import type { DealContext } from "./contracts";
import { DealForm } from "./deal-form";

export function DealCreate({ context, role }: { context: DealContext; role: StaffRole }) {
  const router = useRouter();
  if (context.enquiry_id) return <section className="grid gap-3"><p>Pour reprendre ce prospect, utilisez la conversion depuis sa fiche. Son projet, son budget et son motif d’achat seront enregistrés ensemble.</p><Button action="show" asChild className="justify-self-start"><Link href={`/leads/${context.enquiry_id}`}>Ouvrir le prospect à convertir</Link></Button></section>;
  return context.contact_id ? <PrefilledContact context={context} role={role} /> : <DealForm role={role} saved={async id => { router.push(`/deals/${id}`); }} />;
}
function PrefilledContact({ context, role }: { context: DealContext; role: StaffRole }) {
  const query = useQuery(`/api/v1/contacts/${context.contact_id}`, contactSchema);
  if (query.error) return <RecordError error={query.error} retry={query.refresh} />;
  return query.value ? <CreateForContact key={query.value.id} contact={query.value} context={context} role={role} /> : <p role="status">Vérification du contact…</p>;
}
function CreateForContact({ contact, context, role, change }: { contact: ContactSummary; context: DealContext; role: StaffRole; change?: () => void }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [retry, setRetry] = useState(0);
  const [loaded, setLoaded] = useState<{ offering: Offering | null }>(); const [error, setError] = useState<ApiError>();
  const requirementId = context.requirement_id; const offeringId = context.offering_id;
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const [requirement, offerings] = await Promise.all([
          requirementId ? apiGet(`/api/v1/requirements/${requirementId}`, detailSchema, controller.signal) : null,
          offeringId ? apiGet(queryPath("offerings", { offering_id: offeringId, state: "all", page_size: 1 }), offeringsSchema, controller.signal) : null,
        ]);
        if ((requirement && requirement.contact_id !== contact.id) || (offeringId && !offerings?.items.length)) throw new ApiError("INVALID_DEAL_CONTEXT", 422);
        if (!controller.signal.aborted) { setLoaded({ offering: offerings?.items[0] ?? null }); setError(undefined); }
      } catch (reason) { if (!controller.signal.aborted) setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); }
    }
    void load(); return () => controller.abort();
  }, [contact.id, requirementId, offeringId, retry]);
  if (contact.archived_at) return <p role="status">Contact archivé. Restaurez-le avant de créer une affaire.</p>;
  return <div className="grid min-w-0 gap-6">{change ? <Button action="contact" type="button" variant="outline" className="justify-self-start" disabled={busy} onClick={change}>Changer de contact</Button> : null}{error ? <RecordError error={error} retry={() => setRetry(v => v + 1)} /> : !loaded ? <p role="status">Vérification du contexte de l’affaire…</p> : <DealForm contact={contact} context={context} role={role} offering={loaded.offering} busyChanged={setBusy} saved={async id => { router.push(`/deals/${id}`); }} />}</div>;
}
