"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { BlockIcon } from "@/components/icons";
import { useDossierDraft } from "@/components/shared/dossier-form";
import { RecordEntry } from "@/components/shared/record-entry";
import { RecordSection } from "@/components/shared/record-workspace";
import { useUnsavedGuard } from "@/components/shared/unsaved-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { RecordError } from "@/features/contacts/record-states";
import { useHydrated } from "@/hooks/use-hydrated";
import { ApiError } from "@/lib/api/client";
import { categoryLabels } from "./contracts";
import type { Development } from "./development-contracts";
import { hierarchyBody, hierarchyValues, readHierarchyComparison, type HierarchyComparison, type HierarchyItem, type HierarchyKind, type HierarchyValues } from "./inventory-form-model";
import { InventoryError } from "./states";
import { useInventoryCommand } from "./use-command";

export function HierarchyEditor({ development, kind, parent, parentLabel, item, saved, cancel }: { development: Development; kind: HierarchyKind; parent: string; parentLabel?: string; item?: HierarchyItem; saved: () => void; cancel: () => void }) {
  const id = useId(), scope = useRef<HTMLFormElement>(null), alive = useRef(true), lock = useRef(false), reading = useRef<AbortController | null>(null);
  const command = useInventoryCommand(), hydrated = useHydrated(), guard = useUnsavedGuard();
  const [version, setVersion] = useState(development.version), [values, setValues] = useState(() => hierarchyValues(item));
  const [invalid, setInvalid] = useState<string[]>([]), [readBusy, setReadBusy] = useState(false), [readError, setReadError] = useState<ApiError>(), [denied, setDenied] = useState<ApiError>();
  const [comparison, setComparison] = useState<HierarchyComparison>();
  const busy = command.pending || readBusy, draft = useDossierDraft(values, busy);
  const type = kind === "unit-types", noun = kind === "blocks" ? "bloc" : kind === "floors" ? "étage" : "type réutilisable";
  const blocked = Boolean(development.archived_at || comparison?.development.archived_at);
  useEffect(() => { alive.current = true; return () => { alive.current = false; reading.current?.abort(); }; }, []);
  function failure(error: ApiError) {
    if ([401, 403, 404].includes(error.status)) { setDenied(error); const empty = hierarchyValues(); setValues(empty); draft.accept(empty); setComparison(undefined); }
  }
  function change(key: keyof HierarchyValues, value: string) { setValues(current => ({ ...current, [key]: value })); }
  async function save() {
    if (!hydrated || lock.current || blocked || denied || comparison) return;
    const parsed = hierarchyBody(kind, development.id, version, values);
    if (!parsed.success) {
      const keys = parsed.error.issues.map(issue => String(issue.path[0])); setInvalid(keys);
      scope.current?.querySelector<HTMLElement>(`[name="${keys[0]}"]`)?.focus(); return;
    }
    setInvalid([]); lock.current = true;
    const path = item ? `/api/v1/${kind}/${item.id}` as const : `/api/v1/${kind === "floors" ? "blocks" : "developments"}/${parent}/${kind}` as const;
    try {
      const error = await command.submit(path, parsed.data, item ? "PATCH" : "POST", () => { if (alive.current) { draft.accept(); saved(); } });
      if (error && alive.current) failure(error);
    } finally { lock.current = false; }
  }
  async function compare() {
    if (lock.current) return; lock.current = true; setReadBusy(true); setReadError(undefined);
    const abort = new AbortController(); reading.current = abort;
    try { const current = await readHierarchyComparison(development.id, kind, parent, item?.id, abort.signal); if (alive.current && !abort.signal.aborted) setComparison(current); }
    catch (reason) { if (alive.current && !abort.signal.aborted) { const error = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503); setReadError(error); failure(error); } }
    finally { if (alive.current) { lock.current = false; setReadBusy(false); } }
  }
  function adopt(keep: boolean) {
    if (!comparison || comparison.development.id !== development.id || item && comparison.item?.id !== item.id || comparison.development.archived_at) return;
    setVersion(comparison.development.version);
    const current = hierarchyValues(comparison.item);
    if (!keep) { setValues(current); setInvalid([]); }
    draft.accept(current); setComparison(undefined); setReadError(undefined); command.clear();
  }
  function input(key: keyof HierarchyValues, label: string, maxLength: number, mode?: "numeric" | "decimal") {
    return <div className="grid min-w-0 gap-2"><Label htmlFor={`${id}-${key}`}>{label}</Label><Input id={`${id}-${key}`} name={key} value={values[key]} required={["code", "label", "display_order"].includes(key)} maxLength={maxLength} inputMode={mode} aria-invalid={invalid.includes(key)} aria-describedby={invalid.includes(key) ? `${id}-validation` : undefined} onChange={event => change(key, event.target.value)} /></div>;
  }
  if (denied) return <div className="grid min-w-0 gap-4"><RecordError error={denied} /><Button action="back" type="button" variant="outline" onClick={cancel}>Retour à la structure</Button></div>;
  return <>{guard.dialog}<form ref={scope} className="kay-drawer-form" noValidate aria-label={`${item ? "Modifier" : "Créer"} un ${noun}`} aria-busy={busy} data-draft-managed data-live-dirty={draft.dirty ? "true" : undefined} onSubmit={event => { event.preventDefault(); void save(); }}>
    <p className="text-sm text-muted-foreground">{development.reference} · {development.name}{kind === "floors" && parentLabel ? ` · Bloc ${parentLabel}` : ""}</p>
    <InventoryError error={command.error} />{readError ? <RecordError error={readError} retry={() => void compare()} /> : null}
    {command.error?.code === "INVENTORY_VERSION_CONFLICT" && !comparison ? <Button action="compare" type="button" variant="outline" className="justify-self-start" disabled={busy} onClick={() => void compare()}>Comparer la version actuelle</Button> : null}
    {comparison ? <RecordSection title={`Version actuelle ${comparison.development.version}`} description="Votre saisie est conservée. Comparez cet élément avant de réessayer.">{comparison.item ? <HierarchyEntry item={comparison.item} /> : <p className="text-sm text-muted-foreground">Nouvel élément dans {comparison.development.name}.</p>}{blocked ? <p role="status">Le programme est archivé. Revenez à sa fiche pour consulter son état actuel.</p> : <div className="flex flex-wrap gap-2">{item ? <Button action="retry" type="button" variant="outline" disabled={busy} onClick={() => guard.request(() => adopt(false), scope.current ?? undefined)}>Recharger cet élément</Button> : null}<Button action="compare" type="button" variant="outline" disabled={busy} onClick={() => adopt(true)}>Conserver ma saisie sur cette version</Button></div>}</RecordSection> : null}
    <fieldset disabled={!hydrated || busy || blocked || Boolean(comparison)} className="min-w-0"><legend className="sr-only">Champs du {noun}</legend>
      <RecordSection title={`${item ? "Modifier" : "Créer"} un ${noun}`} description={kind === "floors" ? "L’étage reste rattaché au bloc sélectionné." : "Le code et le libellé identifient cet élément dans le programme."}><div className="kay-form-pair">{input("code", "Code", 40)}{input("label", "Libellé", 160)}{!type ? input("display_order", "Ordre d’affichage", 7, "numeric") : <div className="grid min-w-0 gap-2"><Label htmlFor={`${id}-category`}>Catégorie</Label><NativeSelect id={`${id}-category`} name="category" value={values.category} aria-invalid={invalid.includes("category")} aria-describedby={invalid.includes("category") ? `${id}-validation` : undefined} onChange={event => change("category", event.target.value)}>{["apartment", "villa", "house", "land", "commercial"].map(value => <option key={value} value={value}>{categoryLabels[value as keyof typeof categoryLabels]}</option>)}</NativeSelect></div>}</div></RecordSection>
      {type ? <RecordSection title="Valeurs par défaut" description="Facultatives. Elles servent à préparer de nouvelles unités ; modifier ce type ne change aucune unité existante."><div className="kay-form-pair">{input("default_area_sqm", "Surface par défaut (m²)", 19, "decimal")}{input("default_rooms", "Pièces par défaut", 4, "numeric")}</div></RecordSection> : null}
    </fieldset>
    {invalid.length ? <p id={`${id}-validation`} role="alert" className="text-danger">Renseignez le code et le libellé. L’ordre doit être un entier positif ou nul ; la surface et les pièces renseignées doivent être positives.</p> : null}
    {type ? <p className="text-sm text-muted-foreground">Un type réutilisable n’a ni prix ni disponibilité. Les offres et les réservations appartiennent au programme ou aux unités.</p> : null}
    {development.archived_at ? <p role="status">Ce programme est archivé.</p> : null}
    <div className="kay-form-footer"><Button action="back" type="button" variant="outline" disabled={busy} onClick={cancel}>Retour</Button><Button action="save" type="submit" disabled={!hydrated || busy || blocked || Boolean(comparison)}>{command.pending ? "Enregistrement…" : "Enregistrer"}</Button></div>
  </form></>;
}

export function HierarchyEntry({ item, actions }: { item: HierarchyItem; actions?: ReactNode }) {
  return <RecordEntry title={`${item.code} · ${item.label}`} icon={BlockIcon} actions={actions} meta={"category" in item ? [
    { label: "Catégorie", value: categoryLabels[item.category] }, { label: "Surface par défaut", value: item.default_area_sqm ? `${item.default_area_sqm} m²` : "Non renseignée" }, { label: "Pièces par défaut", value: item.default_rooms ?? "Non renseignées" },
  ] : [{ label: "Ordre d’affichage", value: item.display_order }]} />;
}
