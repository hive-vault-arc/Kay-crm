"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import { documentsSchema, type ProtectedDocument } from "@/features/files/contracts";
import { photoPreview } from "@/features/files/photo-previews";
import { maxSharePhotos, type ShareKind } from "./contracts";

type Choice = { document: ProtectedDocument; version: string };

export function PhotoSelection({ id, kind, selected, select }: {
  id: string; kind: ShareKind; selected: string[]; select: (selection: string[]) => void;
}) {
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<Choice>();
  const query = useQuery(`/api/v1/documents?parent_kind=${kind}&parent_id=${id}&purpose=photo&page=${page}&page_size=10`, documentsSchema);
  const items = query.value?.items.flatMap(document => {
    const clean = document.versions.find(version => version.state === "clean");
    return clean && document.purpose === "photo" && document.mime_type === "image/webp" && !document.archived
      ? [{ document, version: clean.id }] : [];
  });
  return <fieldset className="grid min-w-0 gap-3 rounded-lg border p-3">
    <legend className="px-1 text-sm font-semibold">Photos à partager</legend>
    <p className="text-sm text-muted-foreground" role="status">{selected.length} sélectionnée(s) sur {maxSharePhotos} possibles pour ce lien. Seules les photos analysées sont proposées.</p>
    {selected.length > 0 && <Button action="reset" variant="outline" type="button" className="justify-self-start" onClick={() => select([])}>Vider la sélection</Button>}
    {query.error ? <RecordError error={query.error} retry={query.refresh} /> : !items ? <p role="status">Chargement des photos…</p> : <>
      {!items.length && <p className="text-sm text-muted-foreground">Aucune photo analysée sur cette page.</p>}
      {items.map(item => <div key={item.version} className="flex flex-wrap items-center gap-2">
        <label className="flex min-h-control min-w-0 flex-1 items-center gap-3 wrap-anywhere text-sm">
          <input type="checkbox" className="size-5 shrink-0 accent-foreground" checked={selected.includes(item.version)}
            disabled={!selected.includes(item.version) && selected.length >= maxSharePhotos}
            onChange={event => select(event.target.checked ? [...selected, item.version] : selected.filter(id => id !== item.version))} />
          {item.document.filename}
        </label>
        <Button action="preview" variant="outline" type="button" aria-label={`Voir la photo ${item.document.filename}`} onClick={() => setPreview(item)}>Aperçu</Button>
      </div>)}
      {query.value && query.value.total > 10 && <nav aria-label="Pages des photos à partager" className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" action="previous" variant="outline" disabled={!query.value.has_previous} onClick={() => setPage(n => n - 1)}>Précédent</Button>
        <span className="text-sm tabular-nums">Page {page}</span>
        <Button type="button" action="next" variant="outline" disabled={!query.value.has_next} onClick={() => setPage(n => n + 1)}>Suivant</Button>
      </nav>}
    </>}
    {preview && <PrivatePreview key={preview.version} choice={preview} close={() => setPreview(undefined)} />}
  </fieldset>;
}

function PrivatePreview({ choice, close }: { choice: Choice; close: () => void }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const abort = new AbortController();
    let objectUrl: string | undefined;
    void photoPreview(new Map(), choice.document, choice.version, false, abort.signal).then(blob => {
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
