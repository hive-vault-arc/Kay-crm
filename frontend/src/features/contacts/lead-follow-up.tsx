"use client";
import Link from "next/link";
import { useState } from "react";
import { CalendarIcon } from "@/components/icons";
import { SectionHeading } from "@/components/shared/section-heading";
import { TaskForm } from "@/features/work/task-form";

export function LeadFollowUp({ contactId, enquiryId }: { contactId: string; enquiryId: string }) {
  const [saved, setSaved] = useState<string>();
  return <section className="crm-panel" aria-label="Préparer le suivi"><SectionHeading compact icon={CalendarIcon}>Préparer le suivi</SectionHeading>
    {saved ? <p role="status" className="crm-followup-success">Relance planifiée. <Link className="inline-flex min-h-control items-center text-link underline" href={`/contacts/${contactId}?task=${saved}`}>Voir la tâche du contact</Link></p> : null}
    <TaskForm key={saved ?? "new"} contactId={contactId} enquiryId={enquiryId} presentation="follow-up" saved={async id => { setSaved(id); }} cancel={() => setSaved(undefined)} />
  </section>;
}
