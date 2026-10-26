"use client";

import { AlertIcon, ArchiveIcon, CalendarIcon, CheckIcon, ChevronDownIcon, ClockIcon, ContactIcon, DealIcon, ForwardIcon, PhoneIcon, RadioIndicatorIcon, SearchIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function RecordStatusGlyph({ state }: { state: string }) {
  const Icon = state === "new" ? ContactIcon : state === "in_progress" ? PhoneIcon : state === "follow_up" ? ClockIcon : state === "analysis" ? SearchIcon : state === "qualified" || state === "won" ? CheckIcon : state === "visit" ? CalendarIcon : state === "negotiation" ? DealIcon : state === "closed" ? ArchiveIcon : ["lost", "junk_lead", "not_qualified"].includes(state) ? AlertIcon : state === "converted" ? ForwardIcon : RadioIndicatorIcon;
  return <Icon aria-hidden="true" size={16} />;
}

export function RecordStatusMenu({ value, label, prefix, groups, choose, disabled = false, kind = "enquiry" }: {
  value: string; label: string; prefix: string; groups: { label: string; items: { id: string; label: string }[] }[]; choose: (id: string) => void; disabled?: boolean; kind?: "enquiry" | "deal";
}) {
  const selected = groups.flatMap(group => group.items).find(item => item.id === value)?.label ?? label;
  return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="kay-status-trigger" data-crm-kind={kind} data-crm-state={value} disabled={disabled} aria-label={`${prefix} actuel : ${label}. Changer ${prefix.toLocaleLowerCase("fr")}`}><RecordStatusGlyph state={value} /><span>{prefix} : {selected}</span><ChevronDownIcon size={12} aria-hidden="true" /></Button></DropdownMenuTrigger><DropdownMenuContent align="start" className="kay-status-menu" data-crm-kind={kind} aria-label={`Changer ${prefix.toLocaleLowerCase("fr")}`}>
    {groups.map((group, index) => <div key={group.label}>{index ? <DropdownMenuSeparator /> : null}<DropdownMenuLabel>{group.label}</DropdownMenuLabel>{group.items.map(item => <DropdownMenuItem key={item.id} data-crm-state={item.id} className="kay-status-option" aria-current={value === item.id ? "true" : undefined} onSelect={() => { if (value !== item.id) choose(item.id); }}><span className="kay-status-option-icon"><RecordStatusGlyph state={item.id} /></span><span>{item.label}</span>{value === item.id ? <CheckIcon aria-hidden="true" size={16} className="ml-auto" /> : <ForwardIcon aria-hidden="true" size={12} className="ml-auto" />}</DropdownMenuItem>)}</div>)}
    <p className="px-3 py-2 text-xs text-muted-foreground">Une confirmation sera demandée.</p>
  </DropdownMenuContent></DropdownMenu>;
}
