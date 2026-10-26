"use client";

import { createContext, useContext, useEffect, useId, useRef, useState, type FormEventHandler, type ReactNode } from "react";
import type { KayIconComponent } from "@/components/icons";
import { EditIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useHydrated } from "@/hooks/use-hydrated";
import { useUnsavedGuard } from "./unsaved-guard";

type Scope = { active?: string; open: (id: string) => void; close: () => void };
const Editing = createContext<Scope | null>(null);
export function InlineEditScope({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<string>();
  const guard = useUnsavedGuard();
  return <Editing.Provider value={{ active, open: id => { if (active !== id) guard.request(() => setActive(id), active ? document.getElementById(active + "-inline") ?? document : document); }, close: () => setActive(undefined) }}>{children}{guard.dialog}</Editing.Provider>;
}
export type InlineEditorControls = { cancel: () => void; saved: () => void };
export function InlineRecordField({ label, icon: Icon, display, writable, editor, actions, disabled = false }: {
  label: string; icon: KayIconComponent; display: ReactNode; writable: boolean; editor: (controls: InlineEditorControls) => ReactNode; actions?: ReactNode; disabled?: boolean;
}) {
  const scope = useContext(Editing), id = useId(), hydrated = useHydrated();
  if (writable && !scope) throw new Error("INLINE_EDIT_SCOPE_REQUIRED");
  const editing = writable && scope?.active === id;
  const close = () => { scope?.close(); requestAnimationFrame(() => document.getElementById(id + "-trigger")?.focus()); };
  return <div id={id + "-inline"} className="kay-record-fact kay-inline-fact" data-editing={editing || undefined} onKeyDown={event => { if (editing && event.key === "Escape" && !event.defaultPrevented && !event.currentTarget.querySelector('[aria-busy="true"]')) { event.preventDefault(); event.stopPropagation(); close(); } }}>
    <dt id={id + "-label"}><Icon aria-hidden="true" size={16} /><span>{label}</span></dt>
    <dd>{editing ? editor({ cancel: close, saved: close }) : <div className="kay-inline-display">{writable ? <Button id={id + "-trigger"} type="button" variant="ghost" className="kay-inline-value" aria-describedby={id + "-value"} aria-label={"Modifier " + label.toLocaleLowerCase("fr")} disabled={!hydrated || disabled} onClick={() => scope?.open(id)}><span id={id + "-value"}>{display}</span><EditIcon size={16} aria-hidden="true" /></Button> : <div className="kay-inline-static">{display}</div>}{actions}</div>}</dd>
  </div>;
}
export function InlineFieldForm({ label, children, submit, cancel, dirty, busy, disabled = false }: {
  label: string; children: ReactNode; submit: FormEventHandler<HTMLFormElement>; cancel: () => void; dirty: boolean; busy: boolean; disabled?: boolean;
}) {
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const input = form.current?.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input:not([type=hidden]),select,textarea,[role=combobox]');
    input?.focus();
    try { if (input && "setSelectionRange" in input) input.setSelectionRange(input.value.length, input.value.length); } catch { /* Native email/number controls reject text selection. */ }
  }, []);
  return <form ref={form} className="kay-inline-form" aria-label={"Modifier " + label.toLocaleLowerCase("fr")} aria-busy={busy} data-live-dirty={dirty || undefined} noValidate onSubmit={submit} onKeyDown={event => { if (event.key === "Escape" && !event.defaultPrevented && !busy) { event.preventDefault(); event.stopPropagation(); cancel(); } }}>
    <fieldset disabled={busy || disabled} className="kay-inline-controls">{children}</fieldset>
    <div className="kay-inline-actions"><Button action="confirm" type="submit" size="icon" aria-label={"Enregistrer " + label.toLocaleLowerCase("fr")} disabled={busy || disabled}><span className="sr-only">Enregistrer</span></Button><Button action="cancel" type="button" size="icon" variant="quiet" aria-label={"Annuler " + label.toLocaleLowerCase("fr")} disabled={busy} onClick={cancel}><span className="sr-only">Annuler</span></Button></div>
  </form>;
}

export function InlineFieldLoading({ cancel }: { cancel: () => void }) {
  return <div className="flex min-w-0 items-center justify-between gap-2"><p role="status" className="text-sm text-muted-foreground">Chargement du champ…</p><Button autoFocus action="cancel" type="button" size="icon" variant="quiet" aria-label="Annuler la modification" onClick={cancel}><span className="sr-only">Annuler</span></Button></div>;
}
