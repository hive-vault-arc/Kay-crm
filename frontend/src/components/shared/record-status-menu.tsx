"use client";

import { AddIcon, ArchiveIcon, BlockIcon, CalendarIcon, CheckIcon, ChevronDownIcon, ClockIcon, FileIcon, FailureIcon, FlagIcon, ForwardIcon, NewLeadIcon, NegotiationIcon, PasswordIcon, PhoneIcon, QualifiedLeadIcon, RejectedLeadIcon, RestoreIcon, SearchIcon } from "@/components/icons";
import { useRef, type Ref } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function RecordStatusGlyph({ state, kind = "enquiry" }: { state: string; kind?: "enquiry" | "deal" }) {
  const Icon = state === "new" ? kind === "deal" ? AddIcon : NewLeadIcon : state === "in_progress" ? PhoneIcon : state === "follow_up" ? ClockIcon : state === "analysis" ? SearchIcon : state === "qualified" ? QualifiedLeadIcon : state === "not_qualified" ? RejectedLeadIcon : state === "won" ? CheckIcon : state === "visit" ? CalendarIcon : state === "negotiation" ? NegotiationIcon : state === "closed" ? ArchiveIcon : state === "lost" ? FailureIcon : state === "junk_lead" || state === "cancelled" ? BlockIcon : state === "converted" ? ForwardIcon : state === "documents" ? FileIcon : state === "reserved" ? PasswordIcon : state === "reopen" ? RestoreIcon : FlagIcon;
  return <Icon aria-hidden="true" size={16} />;
}

export function RecordStatusMenu({ value, label, prefix, groups, choose, disabled = false, kind = "enquiry", triggerRef, iconTrigger = false }: {
  value: string; label: string; prefix: string; groups: { label: string; items: { id: string; label: string; disabled?: boolean }[] }[]; choose: (id: string) => void; disabled?: boolean; kind?: "enquiry" | "deal"; triggerRef?: Ref<HTMLButtonElement>; iconTrigger?: boolean;
}) {
  const selected = label;
  const choosing = useRef(false);
  return <DropdownMenu><DropdownMenuTrigger asChild>{iconTrigger ? <Button action="forward" ref={triggerRef} type="button" variant="quiet" size="icon" aria-label={"Changer " + prefix.toLocaleLowerCase("fr") + " : " + label} disabled={disabled}><span className="sr-only">Changer</span></Button> : <Button ref={triggerRef} variant="ghost" className="kay-status-trigger" data-crm-kind={kind} data-crm-state={value} disabled={disabled} aria-label={`${prefix === "Étape" ? "Étape actuelle" : "Statut actuel"} : ${label}. Changer ${prefix.toLocaleLowerCase("fr")}`}><RecordStatusGlyph state={value} kind={kind} /><span>{prefix} : {selected}</span><ChevronDownIcon size={12} aria-hidden="true" /></Button>}</DropdownMenuTrigger><DropdownMenuContent align="start" className="kay-status-menu" data-crm-kind={kind} aria-label={`Changer ${prefix.toLocaleLowerCase("fr")}`} onCloseAutoFocus={event => { if (choosing.current) { event.preventDefault(); choosing.current = false; } }}>
    {groups.map((group, index) => <div key={group.label}>{index ? <DropdownMenuSeparator /> : null}<DropdownMenuLabel>{group.label}</DropdownMenuLabel>{group.items.map(item => <DropdownMenuItem key={item.id} disabled={item.disabled} data-crm-state={item.id} className="kay-status-option" aria-current={value === item.id ? "true" : undefined} onSelect={() => { if (value !== item.id || item.id === "reserved") { choosing.current = true; choose(item.id); } }}><span className="kay-status-option-icon"><RecordStatusGlyph state={item.id} kind={kind} /></span><span>{item.label}</span>{value === item.id ? <CheckIcon aria-hidden="true" size={16} className="ml-auto" /> : <ForwardIcon aria-hidden="true" size={12} className="ml-auto" />}</DropdownMenuItem>)}</div>)}
    <p className="px-3 py-2 text-xs text-muted-foreground">Une confirmation sera demandée.</p>
  </DropdownMenuContent></DropdownMenu>;
}
