"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import { useHydrated } from "@/hooks/use-hydrated";
import type { ApiError } from "@/lib/api/client";
import { documentsSchema, type ProtectedDocument } from "./contracts";
import { PhotoCard, PhotoViewer } from "./photo-gallery-media";
import { PhotoUploadForm } from "./photo-upload-form";
import { photoCanResume, photoDenied, photoLimit, type sendPhoto } from "./photo-upload-model";

export { convertPropertyPhoto } from "./photo-upload-model";
type Props = { propertyId: string; parentKind?: "property" | "development"; writable: boolean; uploadable?: boolean; onChanged: () => void };

export function PropertyPhotos(props: Props) {
  return <PhotoWorkspace key={`${props.parentKind ?? "property"}:${props.propertyId}`} {...props} />;
}

function PhotoWorkspace({ propertyId, parentKind = "property", writable, uploadable = writable, onChanged }: Props) {
  const hydrated = useHydrated(), [page, setPage] = useState(1), [editing, setEditing] = useState<ProtectedDocument | "new">();
  const [notice, setNotice] = useState(""), [denial, setDenial] = useState<ApiError>(), [busy, setBusy] = useState(false), [selectedPhotoId, setSelectedPhotoId] = useState<string>();
  const query = useQuery(`/api/v1/documents?parent_kind=${parentKind}&parent_id=${propertyId}&purpose=photo&page=${page}&page_size=10`, documentsSchema);
  const heading = useRef<HTMLHeadingElement>(null), uploadTrigger = useRef<HTMLButtonElement | null>(null), previewTrigger = useRef<HTMLButtonElement>(null), operation = useRef(false);
  const observed = useRef<Record<string, string>>({}), thumbnailPending = useRef<string | null>(null);
  const pending = Boolean(query.value?.items.some(item => item.versions[0]?.state === "pending_scan")), refresh = query.refreshQuietly;
  useEffect(() => { if (!pending) return; const timer = setInterval(refresh, 2000); return () => clearInterval(timer); }, [pending, refresh]);
  useEffect(() => {
    if (!query.value) return;
    const next = Object.fromEntries(query.value.items.map(item => [item.id, item.versions[0]?.state ?? "awaiting_upload"]));
    if (query.value.items.some(item => item.versions[0]?.state === "clean" && (observed.current[item.id] === "pending_scan" || thumbnailPending.current === item.id))) { thumbnailPending.current = null; onChanged(); }
    observed.current = next;
  }, [query.value, onChanged]);
  const reset = query.refresh;
  const denied = useCallback((error: ApiError) => { setDenial(error); setEditing(undefined); setSelectedPhotoId(undefined); reset(); }, [reset]);
  const begin = useCallback(() => { if (operation.current) return false; operation.current = true; setBusy(true); return true; }, []);
  const end = useCallback(() => { operation.current = false; setBusy(false); }, []);
  function show(value: ProtectedDocument | "new", trigger: HTMLButtonElement) { if (operation.current) return; uploadTrigger.current = trigger; setNotice(""); setEditing(value); }
  function back() {
    setEditing(undefined); refresh();
    requestAnimationFrame(() => { const target = uploadTrigger.current; if (target?.isConnected && !target.disabled) target.focus(); else heading.current?.focus(); });
  }
  function saved(result: Awaited<ReturnType<typeof sendPhoto>>) {
    setNotice(result.recovered ? "Le transfert de cette photo est déjà enregistré. Consultez son état dans la galerie." : "Photo envoyée. Elle sera visible après l’analyse antivirus.");
    thumbnailPending.current = result.state === "pending_scan" ? result.documentId : null;
    if (result.state === "clean") onChanged();
    setEditing(undefined); setPage(1); refresh(); requestAnimationFrame(() => heading.current?.focus());
  }
  const failure = denial ?? (query.error && photoDenied(query.error) ? query.error : undefined);
  if (failure) return <RecordError error={failure} retry={() => { setEditing(undefined); setSelectedPhotoId(undefined); setNotice(""); observed.current = {}; thumbnailPending.current = null; setDenial(undefined); reset(); }} />;
  if (editing) return <div className="grid min-w-0 gap-5">{query.error ? <RecordError error={query.error} retry={query.refresh} /> : null}<PhotoUploadForm parentKind={parentKind} parentId={propertyId} resume={editing === "new" ? undefined : editing} writable={writable} uploadable={uploadable && Boolean(query.value) && !query.error} total={query.value?.total ?? 0} saved={saved} cancel={back} denied={denied} /></div>;
  const cleanPhotos = query.value?.items.filter(item => item.versions.some(version => version.state === "clean")) ?? [], selectedIndex = cleanPhotos.findIndex(item => item.id === selectedPhotoId);
  return <form className="kay-photo-gallery" aria-label="Galerie du dossier" aria-busy={busy} data-draft-managed onSubmit={event => event.preventDefault()}>
    <header className="kay-section-head"><div><h2 ref={heading} tabIndex={-1}>Galerie</h2><p className="text-sm text-muted-foreground">JPG, PNG ou WebP · 20 Mo maximum</p></div><span className="text-sm text-muted-foreground" aria-live="polite">{query.value ? `${query.value.total} / ${photoLimit} photos` : "Chargement…"}</span></header>
    <p className="text-sm text-muted-foreground">Conversion WebP à l’envoi. Chaque photo reste protégée jusqu’à la fin de son analyse antivirus.</p>
    {notice ? <p role="status" className="text-info">{notice}</p> : null}
    {query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <p role="status">Chargement des photos…</p> : <>
      {uploadable && query.value.total < photoLimit ? <Button action="photos" type="button" className="justify-self-start" disabled={!hydrated || busy} onClick={event => show("new", event.currentTarget)}>Ajouter une photo</Button> : null}
      {query.value.total >= photoLimit ? <p className="text-sm text-muted-foreground">Les dix places sont occupées. Une photo interrompue peut toujours être reprise.{writable ? " Archivez une photo pour libérer une place." : " Un responsable peut libérer une place."}</p> : null}
      {query.value.items.length ? <ul className="kay-photo-list">{query.value.items.map(photo => <PhotoCard key={`${photo.id}:${photo.version}`} photo={photo} writable={writable} disabled={!hydrated || busy} begin={begin} end={end} denied={denied} restoreFocus={() => heading.current?.focus()} refresh={() => { setPage(1); refresh(); }} onChanged={onChanged} openPreview={trigger => { previewTrigger.current = trigger; setSelectedPhotoId(photo.id); }} resume={uploadable && photoCanResume(photo, writable) ? trigger => show(photo, trigger) : undefined} />)}</ul> : <p className="text-sm text-muted-foreground">Aucune photo ajoutée à ce dossier.</p>}
      {query.value.total > 10 || page > 1 ? <NumberedPages label="Pages des photos" page={page} total={query.value.total} size={10} change={setPage} /> : null}
      {selectedIndex >= 0 ? <PhotoViewer photos={cleanPhotos} index={selectedIndex} change={index => setSelectedPhotoId(cleanPhotos[index]?.id)} close={() => setSelectedPhotoId(undefined)} returnFocus={previewTrigger} fallbackFocus={heading} denied={denied} /> : null}
    </>}
  </form>;
}
