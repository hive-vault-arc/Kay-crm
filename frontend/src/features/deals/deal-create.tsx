"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ContactSelector } from "@/features/contacts/contact-selector";
import { contactSchema, enquirySchema, type ContactSummary } from "@/features/contacts/contracts";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { offeringsSchema, type Offering } from "@/features/inventory/contracts";
import { detailSchema } from "@/features/requirements/contracts";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import type { DealContext } from "./contracts";
import { DealForm } from "./deal-form";

export function DealCreate({ context }: { context: DealContext }) {
  const [chosen, setChosen] = useState<ContactSummary>(); const hydrated = useHydrated();
  return context.contact_id ? <PrefilledContact context={context} /> : chosen ? <CreateForContact contact={chosen} context={context} change={() => setChosen(undefined)} /> : <section className="grid max-w-reading gap-6"><h2 className="text-section font-medium">Choisir le contact de l’affaire</h2><p>La création est explicite. Elle ne convertit ni ne clôture une demande existante.</p><fieldset disabled={!hydrated}><ContactSelector choose={setChosen} /></fieldset></section>;
}
function PrefilledContact({ context }: { context: DealContext }) {
  const query = useQuery(`/api/v1/contacts/${context.contact_id}`, contactSchema);
  if (query.error) return <RecordError error={query.error} retry={query.refresh} />;
  return query.value ? <CreateForContact key={query.value.id} contact={query.value} context={context} /> : <p role="status">Vérification du contact…</p>;
}
function CreateForContact({ contact, context, change }: { contact: ContactSummary; context: DealContext; change?: () => void }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [retry, setRetry] = useState(0);
  const [loaded, setLoaded] = useState<{ offering: Offering | null }>(); const [error, setError] = useState<ApiError>();
  const enquiryId = context.enquiry_id; const requirementId = context.requirement_id; const offeringId = context.offering_id;
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const [enquiry, requirement, offerings] = await Promise.all([
          enquiryId ? apiGet(`/api/v1/enquiries/${enquiryId}`, enquirySchema, controller.signal) : null,
          requirementId ? apiGet(`/api/v1/requirements/${requirementId}`, detailSchema, controller.signal) : null,
          offeringId ? apiGet(queryPath("offerings", { offering_id: offeringId, state: "all", page_size: 1 }), offeringsSchema, controller.signal) : null,
        ]);
        if ((enquiry && enquiry.contact.id !== contact.id) || (requirement && requirement.contact_id !== contact.id) || (offeringId && !offerings?.items.length)) throw new ApiError("INVALID_DEAL_CONTEXT", 422);
        if (!controller.signal.aborted) { setLoaded({ offering: offerings?.items[0] ?? null }); setError(undefined); }
      } catch (reason) { if (!controller.signal.aborted) setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); }
    }
    void load(); return () => controller.abort();
  }, [contact.id, enquiryId, requirementId, offeringId, retry]);
  if (contact.archived_at) return <p role="status">Contact archivé. Restaurez-le avant de créer une affaire.</p>;
  return <div className="grid min-w-0 gap-6">{change ? <Button action="contact" type="button" variant="outline" className="justify-self-start" disabled={busy} onClick={change}>Changer de contact</Button> : null}{error ? <RecordError error={error} retry={() => setRetry(v => v + 1)} /> : !loaded ? <p role="status">Vérification du contexte de l’affaire…</p> : <DealForm contact={contact} context={context} offering={loaded.offering} busyChanged={setBusy} saved={async id => { router.push(`/deals/${id}`); }} />}</div>;
}
