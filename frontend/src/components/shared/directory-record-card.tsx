"use client";

import Link from "next/link";
import { useId, useState, type ReactNode, type MouseEventHandler } from "react";
import { PhoneIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";

export function DirectoryRecordCard({ title, href, agent, status, phone, metadata, selection, details, onOpen }: {
  title: string; href: string; agent: string; status: ReactNode; phone: string;
  metadata?: ReactNode; selection?: ReactNode; details?: { label: string; value: ReactNode }[];
  onOpen?: MouseEventHandler<HTMLAnchorElement>;
}) {
  const [expanded, setExpanded] = useState(false);
  const control = useId();
  return <article><div className="kay-directory-card-head"><div className="kay-directory-card-title"><Link href={href} prefetch={onOpen ? false : undefined} onClick={onOpen}>{title}</Link><small>{agent}</small></div>{status}{selection}</div><div className="kay-directory-card-meta"><a href={`tel:${phone}`}><PhoneIcon aria-hidden="true" size={12} />{phone}</a><span>{metadata}{details?.length ? <Button action={expanded ? "up" : "down"} variant="quiet" size="compact" aria-expanded={expanded} aria-controls={control} onClick={() => setExpanded(value => !value)}>Détails</Button> : null}</span></div>{details?.length ? <dl id={control} hidden={!expanded} className="kay-directory-card-expansion">{details.map(({ label, value }) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl> : null}</article>;
}
