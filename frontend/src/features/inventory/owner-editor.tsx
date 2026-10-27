"use client";
import { useEffect, useId, useRef, useState } from "react";
import { OwnerIcon } from "@/components/icons";
import { useDossierDraft } from "@/components/shared/dossier-form";
import { RecordEntry } from "@/components/shared/record-entry";
import { RecordSection } from "@/components/shared/record-workspace";
import { useUnsavedGuard } from "@/components/shared/unsaved-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ContactSelector } from "@/features/contacts/contact-selector";
import { RecordError } from "@/features/contacts/record-states";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { ownersSchema, propertySchema, type InventoryTarget } from "./contracts";
import { developmentSchema } from "./development-contracts";
import { legalOwnerValues } from "./inventory-form-model";
import { InventoryError } from "./states";
import { useInventoryCommand } from "./use-command";

type OwnerTarget = InventoryTarget & { reference?: string; archived_at?: string | null };
const editable = (value: OwnerTarget) => !value.archived_at && value.owners.every(owner => owner.contact !== null);
const fields = (links: ReturnType<typeof legalOwnerValues>) => links.map(({ id, display }) => ({ id, display }));

export function OwnerEditor({ property, saved, cancel }: { property: OwnerTarget; saved: () => void; cancel: () => void }) {
  const id = useId(), scope = useRef<HTMLFormElement>(null), alive = useRef(true), lock = useRef(false), reading = useRef<AbortController | null>(null);
  const [source, setSource] = useState(property), [links, setLinks] = useState(() => legalOwnerValues(property.owners));
  const [notice, setNotice] = useState(""), [readBusy, setReadBusy] = useState(false), [readError, setReadError] = useState<ApiError>(), [denied, setDenied] = useState<ApiError>();
  const [comparison, setComparison] = useState<OwnerTarget>();
  const command = useInventoryCommand(), hydrated = useHydrated(), guard = useUnsavedGuard();
  const busy = command.pending || readBusy, draft = useDossierDraft(fields(links), busy);
  useEffect(() => { alive.current = true; return () => { alive.current = false; reading.current?.abort(); }; }, []);
  function failure(error: ApiError) {
    if ([401, 403, 404].includes(error.status)) { setDenied(error); setLinks([]); draft.accept([]); setSource(current => ({ ...current, owners: [] })); setComparison(undefined); }
  }
  function install(current: OwnerTarget, keep = false) {
    if (current.id !== property.id || current.inventoryLevel !== property.inventoryLevel || keep && !editable(current)) return;
    const next = legalOwnerValues(current.owners);
    setSource(current); if (!keep) setLinks(next);
    draft.accept(fields(next)); setNotice(""); setComparison(undefined); setDenied(undefined); setReadError(undefined); command.clear();
  }
  async function readCurrent(mode: "compare" | "reload") {
    if (lock.current) return; lock.current = true; setReadBusy(true); setReadError(undefined);
    const abort = new AbortController(); reading.current = abort;
    try {
      const current: OwnerTarget = property.inventoryLevel === "development"
        ? { ...await apiGet(`/api/v1/developments/${property.id}`, developmentSchema, abort.signal), inventoryLevel: "development" }
        : await apiGet(`/api/v1/properties/${property.id}`, propertySchema, abort.signal);
      if (!alive.current || abort.signal.aborted) return;
      if (current.id !== property.id) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503);
      if (mode === "reload") install(current); else setComparison(current);
    } catch (reason) { if (alive.current && !abort.signal.aborted) { const error = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503); setReadError(error); failure(error); } }
    finally { if (alive.current) { lock.current = false; setReadBusy(false); } }
  }
  async function save() {
    if (!hydrated || lock.current || !editable(source) || denied || comparison) return;
    const body = ownersSchema.safeParse({ expected_version: source.version, owners: links.map(link => ({ contact_id: link.id, marketing_display: link.display.trim() || null })) });
    if (!body.success) { setNotice("Vérifiez la liste et les libellés : 160 caractères maximum, sans doublon."); return; }
    lock.current = true; setNotice("");
    try {
      const error = await command.submit(`/api/v1/${property.inventoryLevel === "development" ? "developments" : "properties"}/${property.id}/owners`, body.data, "PUT", () => { if (alive.current) { draft.accept(); saved(); } });
      if (error && alive.current) failure(error);
    } finally { lock.current = false; }
  }
  if (denied) return <div className="grid min-w-0 gap-4" aria-busy={readBusy}><RecordError error={readError ?? denied} retry={() => void readCurrent("reload")} /><Button action="cancel" type="button" variant="outline" disabled={readBusy} onClick={cancel}>Fermer</Button></div>;
  return <>{guard.dialog}<form ref={scope} className="kay-drawer-form" aria-label="Propriétaires légaux" aria-busy={busy} data-draft-managed data-live-dirty={draft.dirty ? "true" : undefined} noValidate onSubmit={event => { event.preventDefault(); void save(); }}>
    <p className="text-sm text-muted-foreground">{property.reference ? `${property.reference} · ` : ""}Les libellés commerciaux sont partagés avec l’équipe. L’identité du contact reste privée.</p>
    <InventoryError error={command.error} />{readError ? <RecordError error={readError} retry={() => void readCurrent("compare")} /> : null}
    {command.error?.code === "INVENTORY_VERSION_CONFLICT" && !comparison ? <Button action="compare" type="button" variant="outline" className="justify-self-start" disabled={busy} onClick={() => void readCurrent("compare")}>Comparer les propriétaires actuels</Button> : null}
    {comparison ? <RecordSection title={`Version actuelle ${comparison.version}`} description="Votre liste n’a pas été remplacée. Conserver votre saisie remplacera cette liste, y compris les propriétaires ajoutés entre-temps."><LegalOwnerSummary owners={comparison.owners} /><div className="flex flex-wrap gap-2"><Button action="retry" type="button" variant="outline" disabled={busy} onClick={() => guard.request(() => install(comparison), scope.current ?? undefined)}>Recharger cette liste</Button><Button action="compare" type="button" variant="outline" disabled={busy || !editable(comparison)} onClick={() => install(comparison, true)}>Conserver ma liste sur cette version</Button></div>{comparison.archived_at ? <p role="status">Dossier archivé : la modification est indisponible.</p> : null}</RecordSection> : null}
    {!editable(source) ? <RecordSection title="Propriétaires du dossier"><LegalOwnerSummary owners={source.owners} /><p role="status" className="text-sm text-muted-foreground">{source.archived_at ? "Ce dossier est archivé." : "Une identité est protégée. La liste complète ne peut pas être remplacée depuis cette vue."}</p><Button action="retry" type="button" variant="outline" disabled={busy} onClick={() => void readCurrent("reload")}>Recharger les propriétaires</Button></RecordSection> : <fieldset disabled={!hydrated || busy || Boolean(comparison)} className="min-w-0"><legend className="sr-only">Propriétaires légaux du dossier</legend>
      <RecordSection title="Propriétaires liés" count={links.length} description="Retirer un propriétaire dissocie sa fiche de ce dossier ; le contact est conservé."><div className="grid min-w-0 gap-3">{links.length ? links.map(link => <RecordEntry key={link.id} title={link.name} icon={OwnerIcon} actions={<Button action="remove" type="button" variant="quiet" aria-label={`Retirer ${link.name} de la liste`} onClick={() => { setLinks(current => current.filter(item => item.id !== link.id)); setNotice(""); }}>Retirer</Button>}><div className="grid min-w-0 gap-2"><Label htmlFor={`${id}-${link.id}`}>Libellé commercial partagé (facultatif)</Label><Input id={`${id}-${link.id}`} maxLength={160} value={link.display} onChange={event => setLinks(current => current.map(item => item.id === link.id ? { ...item, display: event.target.value } : item))} /><p className="text-xs text-muted-foreground">Aucune coordonnée privée. Le nom du contact n’est jamais copié ici automatiquement.</p></div></RecordEntry>) : <p className="text-sm text-muted-foreground">Aucun propriétaire lié. Un brouillon peut rester incomplet ; une offre disponible doit conserver un propriétaire légal.</p>}</div></RecordSection>
      <RecordSection title="Ajouter un propriétaire" description="Choisissez une fiche existante dans votre périmètre Contacts.">{links.length < 100 ? <ContactSelector choose={contact => { if (lock.current) return; if (links.some(link => link.id === contact.id)) setNotice("Ce contact figure déjà dans la liste."); else { setLinks(current => current.some(link => link.id === contact.id) || current.length >= 100 ? current : [...current, { id: contact.id, name: contact.name, display: "" }]); setNotice(""); } }} denied={failure} /> : <p className="text-sm text-muted-foreground">La limite de 100 propriétaires est atteinte.</p>}</RecordSection>
    </fieldset>}
    <p className="text-sm text-muted-foreground">Un promoteur n’est pas automatiquement propriétaire. Les liens des unités et ceux du programme se gèrent séparément.</p>
    {notice ? <p role="alert" className="text-danger">{notice}</p> : null}
    <div className="kay-form-footer"><Button action="cancel" type="button" variant="outline" disabled={busy} onClick={cancel}>Annuler</Button><Button action="save" type="submit" disabled={!hydrated || busy || !editable(source) || Boolean(comparison)}>{command.pending ? "Enregistrement…" : "Enregistrer"}</Button></div>
  </form></>;
}

function LegalOwnerSummary({ owners }: { owners: InventoryTarget["owners"] }) {
  return <div className="grid min-w-0 gap-3">{owners.length ? owners.map((owner, index) => <RecordEntry key={owner.contact?.id ?? index} icon={OwnerIcon} title={owner.contact?.name ?? "Identité privée protégée"} meta={[{ label: "Libellé partagé", value: owner.marketing_display || "Non renseigné" }]} />) : <p className="text-sm text-muted-foreground">Aucun propriétaire renseigné.</p>}</div>;
}
