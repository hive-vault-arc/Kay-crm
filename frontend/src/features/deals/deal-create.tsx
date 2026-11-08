"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RecordHeader } from "@/components/shared/record-header";
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

export function DealCreate({ context, role, actorId }: { context: DealContext; role: StaffRole; actorId?: string }) {
  const router = useRouter();
  if (context.enquiry_id) return <><RecordHeader title="Nouvelle affaire" route="/deals/new" backHref="/deals" /><section className="grid gap-3"><p>Pour reprendre ce prospect, utilisez la conversion depuis sa fiche. Son projet, son budget et son motif d’achat seront enregistrés ensemble.</p><Button action="show" asChild className="justify-self-start"><Link href={`/leads/${context.enquiry_id}`}>Ouvrir le prospect à convertir</Link></Button></section></>;
  return context.contact_id ? <PrefilledContact key={`${actorId ?? ""}:${role}:${JSON.stringify(context)}`} context={context} role={role} actorId={actorId} /> : <DealForm role={role} actorId={actorId} saved={async id => { router.push(`/deals/${id}`); }} />;
}
function PrefilledContact({ context, role, actorId }: { context: DealContext; role: StaffRole; actorId?: string }) {
  const query = useQuery(`/api/v1/contacts/${context.contact_id}`, contactSchema);
  const [loaded, setLoaded] = useState(query.value);
  if (query.value && query.value !== loaded) setLoaded(query.value);
  const contact = query.value ?? loaded, failure = query.error && [401, 403, 404].includes(query.error.status) ? query.error : undefined;
  if (failure || !contact) return <><RecordHeader title="Nouvelle affaire" route="/deals/new" backHref="/deals" />{query.error ? <RecordError error={query.error} retry={query.refresh} /> : <p role="status">Vérification du contact…</p>}</>;
  return <>{query.error ? <RecordError error={query.error} retry={query.refresh} /> : null}<CreateForContact key={contact.id} contact={contact} context={context} role={role} actorId={actorId} unavailable={Boolean(query.error || !query.value)} /></>;
}
function CreateForContact({ contact, context, role, actorId, change, unavailable = false }: { contact: ContactSummary; context: DealContext; role: StaffRole; actorId?: string; change?: () => void; unavailable?: boolean }) {
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
        if ((requirement && (requirement.id !== requirementId || requirement.contact_id !== contact.id)) || (offeringId && (offerings?.items.length !== 1 || offerings.items[0].id !== offeringId))) throw new ApiError("INVALID_DEAL_CONTEXT", 422);
        if (!controller.signal.aborted) { setLoaded({ offering: offerings?.items[0] ?? null }); setError(undefined); }
      } catch (reason) { if (!controller.signal.aborted) setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); }
    }
    void load(); return () => controller.abort();
  }, [contact.id, requirementId, offeringId, retry]);
  const failure = error && [401, 403, 404].includes(error.status) ? error : undefined;
  if (failure) return <RecordError error={failure} />;
  return <div className="grid min-w-0 gap-6">{change ? <Button action="contact" type="button" variant="outline" className="justify-self-start" disabled={busy} onClick={change}>Changer de contact</Button> : null}{!loaded ? <RecordHeader title="Nouvelle affaire" route="/deals/new" backHref="/deals" /> : null}{contact.archived_at ? <p role="status">Contact archivé. Restaurez-le avant de créer une affaire.</p> : null}{error ? <RecordError error={error} retry={() => setRetry(v => v + 1)} /> : null}{loaded ? <DealForm contact={contact} context={context} role={role} actorId={actorId} unavailable={unavailable || Boolean(error || contact.archived_at)} offering={loaded.offering} busyChanged={setBusy} saved={async id => { router.push(`/deals/${id}`); }} /> : !error ? <p role="status">Vérification du contexte de l’affaire…</p> : null}</div>;
}
