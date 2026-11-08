import Link from "next/link";
import { ContactIcon, ContactsIcon, DealIcon, DevelopmentIcon, FileIcon, ForwardIcon, PropertyIcon, SearchIcon } from "@/components/icons";
import type { SearchHit } from "./contracts";

const names = { contact: "Contact", enquiry: "Prospect", deal: "Affaire", development: "Programme", property: "Bien ou unité", unit_type: "Type réutilisable", document: "Document", generated_document: "PDF préparé" };
function KindIcon({ kind }: { kind: SearchHit["kind"] }) {
  if (kind === "contact") return <ContactIcon size={20} aria-hidden="true" />;
  if (kind === "enquiry") return <ContactsIcon size={20} aria-hidden="true" />;
  if (kind === "deal") return <DealIcon size={20} aria-hidden="true" />;
  if (kind === "development" || kind === "unit_type") return <DevelopmentIcon size={20} aria-hidden="true" />;
  if (kind === "property") return <PropertyIcon size={20} aria-hidden="true" />;
  return <FileIcon size={20} aria-hidden="true" />;
}

export function SearchResultLink({ item, close }: { item: SearchHit; close?: () => void }) {
  return <Link prefetch={false} href={item.href} onClick={close} data-search-result className="kay-search-result"><span className="kay-search-result-icon"><KindIcon kind={item.kind} /></span><span className="kay-search-result-copy"><strong>{item.label}</strong><small>{names[item.kind]}{item.kind === "generated_document" ? ` · ${item.template_title}` : ""}</small></span><ForwardIcon size={16} aria-hidden="true" /></Link>;
}

export function SearchEmpty({ query = false }: { query?: boolean }) {
  return <div className="kay-search-empty" role="status"><SearchIcon size={32} aria-hidden="true" /><strong>{query ? "Aucun résultat accessible" : "Que recherchez-vous ?"}</strong><p>{query ? "Essayez un autre nom, numéro ou référence, ou changez de type." : "Saisissez au moins deux caractères pour retrouver une fiche, un bien ou un document."}</p></div>;
}
