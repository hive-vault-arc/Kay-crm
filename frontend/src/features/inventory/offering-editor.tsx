"use client";
import { useEffect, useId, useRef, useState } from "react";
import { PropertyIcon } from "@/components/icons";
import { useDossierDraft } from "@/components/shared/dossier-form";
import { RecordEntry } from "@/components/shared/record-entry";
import { RecordSection } from "@/components/shared/record-workspace";
import { useUnsavedGuard } from "@/components/shared/unsaved-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { RecordError } from "@/features/contacts/record-states";
import { useHydrated } from "@/hooks/use-hydrated";
import { ApiError } from "@/lib/api/client";
import { kindLabels, offeringConditionsLabels, type Offering } from "./contracts";
import { currentOffering, offeringBody, offeringEditable, offeringPeriods, offeringValues, periodLabels, readOfferingTarget, type OfferTarget, type OfferingValues } from "./offering-form-model";
import { InventoryError, InventoryStatus, Price } from "./states";
import { useInventoryRecordCommand } from "./use-record-command";
import type { InventoryRecord } from "./record-scope";

type Props = { property: OfferTarget; kind: Offering["kind"]; offering?: Offering; saved: (record?: InventoryRecord) => void | Promise<void>; cancel: () => void };
export function OfferingEditor(props: Props) { return <OfferingForm {...props} />; }
export function Availability({ property, offering, saved, cancel }: Omit<Props, "kind" | "offering"> & { offering: Offering }) { return <OfferingForm property={property} kind={offering.kind} offering={offering} saved={saved} cancel={cancel} availability />; }

function OfferingForm({ property, kind, offering, saved, cancel, availability = false }: Props & { availability?: boolean }) {
  const id = useId(), scope = useRef<HTMLFormElement>(null), alive = useRef(true), lock = useRef(false), reading = useRef<AbortController | null>(null), reported = useRef(false);
  const [source, setSource] = useState(property), [values, setValues] = useState(() => offeringValues(kind, offering));
  const [invalid, setInvalid] = useState<string[]>([]), [readBusy, setReadBusy] = useState(false), [readError, setReadError] = useState<ApiError>(), [denied, setDenied] = useState<ApiError>();
  const [comparison, setComparison] = useState<OfferTarget>();
  const command = useInventoryRecordCommand({ root: property.inventoryLevel === "development" ? "developments" : "properties", id: property.id, version: property.version, kind: "offering", campaign: kind, offeringId: offering?.id, availability }), guard = useUnsavedGuard(), hydrated = useHydrated();
  const busy = command.pending || readBusy, draft = useDossierDraft(availability ? { reason: values.reason } : values, busy);
  const current = currentOffering(source, kind, offering?.id), blocked = !offeringEditable(source, kind, offering?.id);
  const title = availability ? "Confirmer la disponibilité" : offering ? "Modifier l’offre" : "Offre et conditions";
  useEffect(() => { alive.current = true; scope.current?.querySelector<HTMLElement>(availability ? '[name="reason"]' : '[name="price"]')?.focus(); return () => { alive.current = false; reading.current?.abort(); }; }, [availability]);
  function failure(error: ApiError) {
    if ([401, 403, 404].includes(error.status)) { command.deny(error); const empty = offeringValues(kind); setValues(empty); draft.accept(availability ? { reason: "" } : empty); setSource({ id: property.id, version: property.version, inventoryLevel: property.inventoryLevel, owners: [], offerings: [] }); setComparison(undefined); setDenied(error); }
  }
  function install(target: OfferTarget, keep: boolean) {
    if (target.id !== property.id || target.inventoryLevel !== property.inventoryLevel || keep && !offeringEditable(target, kind, offering?.id)) return;
    if (!command.accept(target)) { setComparison(undefined); return; }
    const next = offeringValues(kind, currentOffering(target, kind, offering?.id));
    setSource(target); if (!keep) { setValues(next); setInvalid([]); }
    draft.accept(availability ? { reason: "" } : next); setComparison(undefined); setReadError(undefined); setDenied(undefined);
  }
  async function readCurrent(reload = false) {
    if (lock.current || command.locked()) return; lock.current = true; setReadBusy(true); setReadError(undefined);
    const abort = new AbortController(); reading.current = abort;
    try { const target = await command.inspect(signal => readOfferingTarget(property, signal), abort.signal); if (alive.current && !abort.signal.aborted) { if (reload) install(target, false); else setComparison(target); } }
    catch (reason) { if (alive.current && !abort.signal.aborted) { const error = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503); setReadError(error); failure(error); } }
    finally { if (alive.current) { lock.current = false; setReadBusy(false); } }
  }
  async function save() {
    if (!hydrated || lock.current || command.pending) return;
    if (command.uncertain) { lock.current = true; try { const error = await command.retry(); if (error && alive.current) failure(error); } finally { lock.current = false; } return; }
    if (!command.canEdit() || denied || blocked || comparison) return;
    const parsed = offeringBody(source, kind, values, offering?.id, availability);
    if (!parsed.success) { const fields = parsed.error.issues.map(issue => issue.path[0] === "price_mad" ? "price" : issue.path[0] === "price_period" ? "period" : String(issue.path[0])); setInvalid(fields); scope.current?.querySelector<HTMLElement>(`[name="${fields[0]}"]`)?.focus(); return; }
    lock.current = true; reported.current = false; setInvalid([]); setReadError(undefined);
    const path = availability ? `/api/v1/${source.inventoryLevel === "development" ? "developments" : "properties"}/${source.id}/confirm-availability` as const : offering ? `/api/v1/offerings/${offering.id}` as const : "/api/v1/offerings";
    try {
      const error = await command.submit(path, parsed.data, offering && !availability ? "PATCH" : "POST", async (record, signal) => { if (!alive.current || signal.aborted || reported.current) return; await saved(record); if (alive.current && !signal.aborted && !reported.current) { reported.current = true; draft.accept(); } });
      if (error && alive.current) failure(error);
    } finally { lock.current = false; }
  }
  function change(key: keyof OfferingValues, value: string) { if (lock.current || !command.canEdit()) return; setValues(current => ({ ...current, [key]: value })); }
  const description = availability ? "Vérifiez le prix, les propriétaires légaux et les conflits entre programme et unités. Aucune réservation n’est créée." : "Prix et conditions partagés avec l’équipe. Une nouvelle offre reste en brouillon jusqu’à confirmation de sa disponibilité.";
  if (denied) return <div className="grid min-w-0 gap-4" aria-busy={readBusy}><RecordError error={readError ?? denied} retry={() => void readCurrent(true)} /><Button action="cancel" type="button" variant="outline" disabled={readBusy} onClick={cancel}>Fermer</Button></div>;
  return <>{guard.dialog}<form ref={scope} noValidate className="kay-drawer-form" aria-label={availability ? `Disponibilité ${kindLabels[kind].toLowerCase()}` : `${offering ? "Modifier" : "Créer"} la campagne ${kindLabels[kind].toLowerCase()}`} aria-busy={busy || command.uncertain} data-draft-managed data-write-recovery={command.uncertain || undefined} data-live-dirty={draft.dirty || command.uncertain ? "true" : undefined} onSubmit={event => { event.preventDefault(); void save(); }}>
    <RecordEntry icon={PropertyIcon} title={source.reference || kindLabels[kind]} status={current ? <InventoryStatus state={current.state} conflict={current.reservation_conflict} occupied={current.occupied} /> : undefined} meta={[{ label: "Offre", value: kindLabels[kind] }]}>{availability && current ? <Price offering={current} /> : null}</RecordEntry>
    <InventoryError error={command.error} />{readError ? <RecordError error={readError} retry={() => void readCurrent()} /> : null}
    {command.error?.code === "INVENTORY_VERSION_CONFLICT" && !comparison ? <Button action="compare" type="button" variant="outline" disabled={busy} className="justify-self-start" onClick={() => void readCurrent()}>Comparer l’offre actuelle</Button> : null}
    {comparison ? <RecordSection title={`Version actuelle ${comparison.version}`} description="Votre saisie reste conservée. Vérifiez l’offre et son état avant de poursuivre."><OfferingComparison target={comparison} kind={kind} id={offering?.id} />{offeringEditable(comparison, kind, offering?.id) ? <div className="flex flex-wrap gap-2">{offering ? <Button action="refresh" type="button" variant="outline" disabled={busy} onClick={() => guard.request(() => install(comparison, false), scope.current ?? undefined)}>Recharger cette offre</Button> : null}<Button action="compare" type="button" variant="outline" disabled={busy} onClick={() => install(comparison, true)}>Conserver ma saisie sur cette version</Button></div> : <p role="status" className="text-sm text-warning">Cette campagne n’est plus modifiable. Revenez au dossier pour consulter son état actuel.</p>}</RecordSection> : null}
    {blocked ? <p role="status" className="text-sm text-warning">Le dossier est archivé, cette campagne est engagée ou une autre campagne est devenue actuelle. Aucun changement ordinaire n’est disponible ici.</p> : null}
    <fieldset disabled={!hydrated || busy || blocked || Boolean(comparison) || !command.canEdit()} className="grid min-w-0 gap-5"><legend className="sr-only">{title}</legend>
      <RecordSection title={title} description={description}><div className="kay-form-pair">
        {!availability ? <><div className="grid min-w-0 gap-2"><Label htmlFor={`${id}-price`}>Prix (MAD, facultatif)</Label><Input id={`${id}-price`} name="price" value={values.price} inputMode="decimal" maxLength={19} aria-invalid={invalid.includes("price")} aria-describedby={invalid.includes("price") ? `${id}-validation` : undefined} onChange={event => change("price", event.target.value)} /></div>
          {kind !== "sale" ? <div className="grid min-w-0 gap-2"><Label htmlFor={`${id}-period`}>Période du tarif d’origine</Label><NativeSelect id={`${id}-period`} name="period" value={values.period} aria-invalid={invalid.includes("period")} aria-describedby={invalid.includes("period") ? `${id}-validation` : undefined} onChange={event => change("period", event.target.value)}>{offeringPeriods[kind].map(period => <option key={period} value={period}>{periodLabels[period]}</option>)}</NativeSelect></div> : null}
          <div className="grid min-w-0 gap-2 col-span-full">
            <Label htmlFor={`${id}-conditions`}>{offeringConditionsLabels[kind]} (facultatives)</Label>
            <Textarea id={`${id}-conditions`} name="conditions" value={values.conditions} maxLength={2000}
              placeholder={kind === "rental" ? "Ex. Dépôt de garantie, durée du bail, animaux autorisés…" : kind === "holiday" ? "Ex. Heure d’arrivée, nombre de voyageurs, règles du logement…" : undefined}
              aria-invalid={invalid.includes("conditions")}
              aria-describedby={invalid.includes("conditions") ? `${id}-validation` : undefined}
              onChange={event => change("conditions", event.target.value)} />
          </div>
          {offering ? <div className="grid min-w-0 gap-2"><Label htmlFor={`${id}-state`}>Statut de la campagne</Label><NativeSelect id={`${id}-state`} name="state" value={values.state} aria-invalid={invalid.includes("state")} aria-describedby={invalid.includes("state") ? `${id}-validation` : undefined} onChange={event => change("state", event.target.value)}><option value="draft">Brouillon</option>{current?.state === "available" || values.state === "available" ? <option value="available" disabled={current?.state !== "available"}>{current?.state === "available" ? "Disponible" : "Disponible — confirmation requise"}</option> : null}<option value="withdrawn">Retirée</option></NativeSelect></div> : null}</> : null}
        {offering || availability ? <div className="grid min-w-0 gap-2 col-span-full"><Label htmlFor={`${id}-reason`}>{availability ? "Motif de confirmation" : "Motif de modification"}</Label><Textarea id={`${id}-reason`} name="reason" value={values.reason} required maxLength={1000} aria-invalid={invalid.includes("reason")} aria-describedby={invalid.includes("reason") ? `${id}-validation` : undefined} onChange={event => change("reason", event.target.value)} /></div> : null}
      </div></RecordSection>
    </fieldset>
    {invalid.length ? <p id={`${id}-validation`} role="alert" className="text-sm text-danger">{availability ? "Indiquez le motif de votre vérification (1 à 1 000 caractères)." : invalid.includes("state") ? "Une campagne en brouillon devient disponible par confirmation de disponibilité. Choisissez un statut autorisé pour cette modification." : "Vérifiez le prix positif ou vide, sa période, les conditions (2 000 caractères) et le motif requis (1 000 caractères)."}</p> : null}
    {!availability ? <p className="text-sm text-muted-foreground">La disponibilité exige un prix positif et au moins un propriétaire légal. Retirer une campagne conserve son historique ; son remplacement est une nouvelle campagne.</p> : null}
    {command.uncertain ? <p role="status">{command.acknowledged ? "La modification est enregistrée. Actualisez son résultat sans l’enregistrer à nouveau." : "La réponse est interrompue. Réessayez la même opération pour retrouver son résultat."}</p> : null}
    <div className="kay-form-footer"><Button action="cancel" type="button" variant="outline" disabled={busy || command.uncertain} onClick={() => { if (!lock.current && !command.locked()) cancel(); }}>Annuler</Button><Button action={availability ? "confirm" : offering ? "save" : "create"} type="submit" disabled={!hydrated || busy || !command.uncertain && (blocked || Boolean(comparison) || !command.canEdit())}>{busy ? "Enregistrement…" : command.uncertain ? command.acknowledged ? "Actualiser le résultat" : "Réessayer la même opération" : availability ? current?.state === "available" ? "Reconfirmer la disponibilité" : "Confirmer la disponibilité" : offering ? "Enregistrer la campagne" : "Créer la campagne"}</Button></div>
  </form></>;
}

function OfferingComparison({ target, kind, id }: { target: OfferTarget; kind: Offering["kind"]; id?: string }) {
  const exact = currentOffering(target, kind, id), current = exact ?? currentOffering(target, kind);
  return <RecordEntry icon={PropertyIcon} title={target.reference || kindLabels[kind]} status={current ? <InventoryStatus state={current.state} conflict={current.reservation_conflict} occupied={current.occupied} /> : undefined} meta={[{ label: "Dossier", value: target.archived_at ? "Archivé" : "Actif" }, { label: "Propriétaires légaux", value: target.owners.length }]}>{current ? <><Price offering={current} /><p className="text-sm whitespace-pre-wrap wrap-anywhere">{current.conditions || "Conditions non renseignées"}</p>{id && !exact ? <p className="text-sm text-warning">La campagne éditée n’est plus actuelle. Cette autre campagne ne sera pas modifiée.</p> : null}</> : <p className="text-sm">Aucune campagne actuelle de ce type.</p>}</RecordEntry>;
}
