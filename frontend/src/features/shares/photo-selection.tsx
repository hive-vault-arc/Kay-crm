"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { photoPreview } from "@/features/files/photo-previews";
import type { SharePhoto } from "./contracts";

const PAGE_SIZE = 10;

export function PhotoSelection({ photos, selected, select, disabled }: {
  photos: SharePhoto[]; selected: Set<string>; select: (selection: Set<string>) => void; disabled: boolean;
}) {
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<SharePhoto>();
  const items = photos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pages = Math.ceil(photos.length / PAGE_SIZE);

  function toggle(id: string, checked: boolean) {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    select(next);
  }
  return <fieldset disabled={disabled} className="grid min-w-0 gap-3 rounded-lg border p-3">
    <legend className="px-1 text-sm font-semibold">Photos à partager</legend>
    <p className="text-sm text-muted-foreground" role="status">{selected.size} / {photos.length} photos sélectionnées</p>
    {photos.length > 0 && <div className="flex flex-wrap gap-2">
      <Button action="confirm" variant="outline" type="button" disabled={selected.size === photos.length} onClick={() => select(new Set(photos.map(photo => photo.version_id)))}>Tout sélectionner</Button>
      <Button action="reset" variant="outline" type="button" disabled={!selected.size} onClick={() => select(new Set())}>Tout désélectionner</Button>
    </div>}
    {!photos.length && <p className="text-sm text-muted-foreground">Aucune photo analysée à partager.</p>}
      {items.map(item => <div key={item.version_id} className="flex flex-wrap items-center gap-2">
        <label className="flex min-h-control min-w-0 flex-1 items-center gap-3 wrap-anywhere text-sm">
          <input type="checkbox" className="size-5 shrink-0 accent-foreground" checked={selected.has(item.version_id)}
            onChange={event => toggle(item.version_id, event.target.checked)} />
          {item.filename}
        </label>
        <Button action="preview" variant="outline" type="button" aria-label={`Voir la photo ${item.filename}`} onClick={() => setPreview(item)}>Aperçu</Button>
      </div>)}
      {pages > 1 && <nav aria-label="Pages des photos à partager" className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" action="previous" variant="outline" disabled={page === 1} onClick={() => { setPreview(undefined); setPage(n => n - 1); }}>Précédent</Button>
        <span className="text-sm tabular-nums">Page {page} sur {pages}</span>
        <Button type="button" action="next" variant="outline" disabled={page === pages} onClick={() => { setPreview(undefined); setPage(n => n + 1); }}>Suivant</Button>
      </nav>}
    {preview && <PrivatePreview key={preview.version_id} choice={preview} close={() => setPreview(undefined)} />}
  </fieldset>;
}

function PrivatePreview({ choice, close }: { choice: SharePhoto; close: () => void }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const abort = new AbortController();
    let objectUrl: string | undefined;
    void photoPreview(new Map(), choice, choice.version_id, false, abort.signal).then(blob => {
      if (!abort.signal.aborted) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); }
    }).catch(() => { if (!abort.signal.aborted) setUrl("failed"); });
    return () => { abort.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [choice]);
  return <div className="grid gap-2">
    <div className="relative grid aspect-video place-items-center overflow-hidden rounded-lg bg-muted">
      {url && url !== "failed" ? <Image src={url} alt="Aperçu de la photo sélectionnée" fill unoptimized sizes="100vw" className="object-contain" /> :
        <p role="status">{url === "failed" ? "Aperçu indisponible." : "Chargement de la photo…"}</p>}
    </div>
    <Button action="close" variant="outline" type="button" className="justify-self-start" onClick={close}>Fermer l’aperçu</Button>
  </div>;
}
