"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Offering } from "@/features/inventory/contracts";
import { PhotoSelection } from "./photo-selection";
import { approveListing, pricePeriod, type Approval, type EnabledShare, type ShareKind } from "./contracts";

export type ShareTarget = {
  id: string;
  kind: ShareKind;
  offerings: Pick<Offering, "id" | "kind" | "is_current" | "price_mad" | "price_period">[];
};

const priceLabels = { sale: "Vente", month: "Par mois", year: "Par an", week: "Par semaine", day: "Par jour", night: "Par nuit" };
const priceFormat = new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD" });

export function ApprovalForm({ target, state, draft, busy, save, cancel }: {
  target: ShareTarget;
  state: EnabledShare;
  draft: NonNullable<EnabledShare["draft"]>;
  busy: boolean;
  save: (value: Approval) => void;
  cancel?: () => void;
}) {
  const id = useId();
  const [initial] = useState(() => {
    const published = state.active ? state.snapshot : null;
    const included = published ? new Set(published.photos) : undefined;
    return {
      title: published?.title ?? draft.title,
      description: published?.description ?? draft.description,
      neighbourhood: published?.neighbourhood ?? draft.neighbourhood,
      price: published?.price_mad ?? "",
      period: published?.price_period ?? "",
      catalogue: draft.photos,
      photos: new Set(draft.photos.filter(photo => !included || included.has(photo.version_id)).map(photo => photo.version_id)),
      targetVersion: state.target_version,
      version: state.version,
    };
  });
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [neighbourhood, setNeighbourhood] = useState(initial.neighbourhood);
  const [price, setPrice] = useState(initial.price);
  const [period, setPeriod] = useState<string>(initial.period);
  const [photos, setPhotos] = useState(initial.photos);
  const [error, setError] = useState("");
  const offers = target.offerings.filter(offer => offer.is_current && offer.price_mad);
  const selectedOffer = offers.find(offer => offer.price_mad === price && (offer.kind === "sale" ? "sale" : offer.price_period) === period)?.id ?? "";
  const dirty = title !== initial.title || description !== initial.description ||
    neighbourhood !== initial.neighbourhood || price !== initial.price || period !== initial.period ||
    photos.size !== initial.photos.size || [...photos].some(photo => !initial.photos.has(photo));

  function chooseOffer(id: string) {
    const offer = offers.find(candidate => candidate.id === id);
    if (!offer?.price_mad) { setPrice(""); setPeriod(""); return; }
    setPrice(offer.price_mad);
    setPeriod(offer.kind === "sale" ? "sale" : offer.price_period ?? "");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const money = price.trim().replace(",", ".");
    const parsed = approveListing.safeParse({
      title, description, neighbourhood,
      photos: initial.catalogue.filter(photo => photos.has(photo.version_id)).map(photo => photo.version_id),
      price_mad: money || null,
      price_period: money ? pricePeriod.safeParse(period).data ?? null : null,
      expected_version: initial.version,
      target_version: initial.targetVersion,
    });
    if (!parsed.success) {
      setError("Vérifiez le titre et, si vous affichez un prix, indiquez un montant valide et sa période.");
      return;
    }
    setError("");
    save(parsed.data);
  }

  return <form className="grid min-w-0 gap-4" aria-label="Fiche client" aria-busy={busy}
    data-draft-managed data-live-dirty={dirty ? "true" : undefined} onSubmit={submit}>
    <p className="text-sm text-muted-foreground">Retirez les informations privées et décochez les photos que vous ne souhaitez pas partager.</p>
    <div className="grid gap-1 text-sm"><label htmlFor={`${id}-title`}>Titre public</label>
      <Input id={`${id}-title`} value={title} maxLength={160} required disabled={busy} onChange={event => setTitle(event.target.value)} />
    </div>
    <div className="grid gap-1 text-sm"><label htmlFor={`${id}-description`}>Description publique (facultative)</label>
      <Textarea id={`${id}-description`} value={description} maxLength={5000} disabled={busy} onChange={event => setDescription(event.target.value)} />
    </div>
    <div className="grid gap-1 text-sm"><label htmlFor={`${id}-area`}>Quartier ou ville (facultatif)</label>
      <Input id={`${id}-area`} value={neighbourhood} maxLength={100} disabled={busy} onChange={event => setNeighbourhood(event.target.value)} />
    </div>
    <fieldset className="grid gap-3" disabled={busy}>
      <legend className="text-sm font-semibold">Prix à afficher (facultatif)</legend>
      {offers.length > 0 && <div className="grid gap-1 text-sm"><label htmlFor={`${id}-offer`}>Reprendre un prix existant</label>
        <select id={`${id}-offer`} className="min-h-control rounded-md border bg-background px-3" value={selectedOffer} onChange={event => chooseOffer(event.target.value)}>
          <option value="">Choisir une offre</option>
          {offers.map(offer => <option key={offer.id} value={offer.id}>
            {priceFormat.format(Number(offer.price_mad))} · {priceLabels[offer.kind === "sale" ? "sale" : offer.price_period ?? "month"]}
          </option>)}
        </select>
      </div>}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1 text-sm"><label htmlFor={`${id}-price`}>Montant en MAD</label>
          <Input id={`${id}-price`} inputMode="decimal" maxLength={19} value={price} onChange={event => setPrice(event.target.value)} />
        </div>
        <div className="grid gap-1 text-sm"><label htmlFor={`${id}-period`}>Type de prix</label>
          <select id={`${id}-period`} className="min-h-control rounded-md border bg-background px-3" value={period} onChange={event => setPeriod(event.target.value)}>
            <option value="">Choisir</option>
            {Object.entries(priceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </div>
    </fieldset>
    <PhotoSelection photos={initial.catalogue} selected={photos} select={setPhotos} disabled={busy} />
    {error && <p className="text-danger" role="alert">{error}</p>}
    {state.active && <p className="text-sm text-muted-foreground">Si le contenu change, les liens précédents cesseront de fonctionner.</p>}
    <div className="flex flex-wrap gap-2">
      <Button action="create" type="submit" disabled={busy}>{busy ? "Création du lien…" : "Créer le lien"}</Button>
      {cancel && <Button action="cancel" variant="outline" type="button" disabled={busy} onClick={cancel}>Annuler</Button>}
    </div>
  </form>;
}
