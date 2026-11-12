"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ClientListingFacts } from "./listing-facts";
import { PhotoSelection } from "./photo-selection";
import { approveListing, pricePeriod, type Approval, type EnabledShare, type ListingFacts, type ShareKind } from "./contracts";

export type ShareTarget = { id: string; kind: ShareKind; title: string; category: ListingFacts["category"]; area?: string | null; rooms?: number | null };

export function ApprovalForm({ target, state, busy, save, cancel }: {
  target: ShareTarget; state: EnabledShare; busy: boolean; save: (value: Approval) => void; cancel: () => void;
}) {
  const id = useId();
  const initial = state.snapshot;
  const [title, setTitle] = useState(initial?.title ?? target.title);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [neighbourhood, setNeighbourhood] = useState(initial?.neighbourhood ?? "");
  const [price, setPrice] = useState(initial?.price_mad ?? "");
  const [period, setPeriod] = useState<string>(initial?.price_period ?? "");
  const [photos, setPhotos] = useState(initial?.photos ?? []);
  const [error, setError] = useState("");
  const [review, setReview] = useState<Approval>();
  const dirty = title !== (initial?.title ?? target.title) || description !== (initial?.description ?? "") ||
    neighbourhood !== (initial?.neighbourhood ?? "") || price !== (initial?.price_mad ?? "") ||
    period !== (initial?.price_period ?? "") || photos.join() !== (initial?.photos ?? []).join();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (review) { save(review); return; }
    const money = price.trim().replace(",", ".");
    const parsed = approveListing.safeParse({
      title, description, neighbourhood, photos, price_mad: money || null,
      price_period: money ? pricePeriod.safeParse(period).data ?? null : null,
      expected_version: state.version, target_version: state.target_version,
    });
    if (!parsed.success) { setError("Indiquez un titre. Si vous affichez un prix, choisissez aussi sa période."); return; }
    setError(""); setReview(parsed.data);
  }
  return <form className="grid min-w-0 gap-4" aria-label="Fiche client" aria-busy={busy}
    data-draft-managed data-live-dirty={dirty ? "true" : undefined} onSubmit={submit}>
    {review ? <>
      <div className="grid gap-3 rounded-lg border p-4" aria-label="Aperçu de la fiche client">
        <p className="text-sm font-semibold">Aperçu de la fiche client</p>
        <ClientListingFacts facts={{ ...review, kind: target.kind, category: target.category, area_sqm: target.area ?? null, rooms: target.rooms ?? null }} />
        <p className="text-sm text-muted-foreground">{review.photos.length} photo(s) sélectionnée(s)</p>
      </div>
      <p className="text-sm text-muted-foreground">Vérifiez que le texte et les photos ne révèlent aucune donnée privée. Une nouvelle approbation remplace la précédente et désactive ses liens si la fiche a changé.</p>
      <div className="flex flex-wrap gap-2"><Button action="back" variant="outline" type="button" disabled={busy} onClick={() => setReview(undefined)}>Modifier l’aperçu</Button><Button action="read" type="submit" disabled={busy}>Approuver la fiche</Button></div>
    </> : <>
      <p className="text-sm text-muted-foreground">Ces champs seront visibles par toute personne qui reçoit un lien. N’ajoutez ni adresse exacte, ni coordonnées, ni informations internes.</p>
      <label className="grid gap-1 text-sm" htmlFor={`${id}-title`}>Titre public<Input id={`${id}-title`} value={title} maxLength={160} required onChange={event => setTitle(event.target.value)} /></label>
      <label className="grid gap-1 text-sm" htmlFor={`${id}-description`}>Description publique (facultative)<Textarea id={`${id}-description`} value={description} maxLength={2000} onChange={event => setDescription(event.target.value)} /></label>
      <label className="grid gap-1 text-sm" htmlFor={`${id}-area`}>Quartier ou ville (facultatif)<Input id={`${id}-area`} value={neighbourhood} maxLength={100} placeholder="Ex. Iberia, Tanger" onChange={event => setNeighbourhood(event.target.value)} /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm" htmlFor={`${id}-price`}>Prix affiché en MAD (facultatif)<Input id={`${id}-price`} inputMode="decimal" maxLength={16} value={price} onChange={event => setPrice(event.target.value)} /></label>
        <label className="grid gap-1 text-sm" htmlFor={`${id}-period`}>Type de prix<select id={`${id}-period`} className="min-h-control rounded-md border bg-background px-3" value={period} onChange={event => setPeriod(event.target.value)}><option value="">Choisir</option><option value="sale">Vente</option><option value="month">Par mois</option><option value="year">Par an</option><option value="night">Par nuit</option></select></label>
      </div>
      <PhotoSelection id={target.id} kind={target.kind} selected={photos} select={setPhotos} />
      {error && <p className="text-danger" role="alert">{error}</p>}
      <div className="flex flex-wrap gap-2"><Button action="preview" type="submit">Prévisualiser</Button><Button action="cancel" variant="outline" type="button" onClick={cancel}>Annuler</Button></div>
    </>}
  </form>;
}
