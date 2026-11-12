"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { publicListing, shareToken } from "./contracts";
import { ClientListingFacts } from "./listing-facts";
import type { z } from "zod";

const publicHeaders = (token: string) => ({ "X-Kay-Listing-Link": token });
function direct(origin: string, path: string, token: string, signal: AbortSignal) {
  return fetch(new URL(`/api/v1/client-listing${path}`, origin), {
    headers: publicHeaders(token), signal, credentials: "omit", cache: "no-store",
    redirect: "error", referrerPolicy: "no-referrer",
  });
}

export function ClientListing({ origin }: { origin?: string }) {
  const [state, setState] = useState<{ token: string; listing: z.infer<typeof publicListing> } | "gone" | "retry">();
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let request: AbortController | undefined;
    function load() {
      request?.abort();
      const token = shareToken.safeParse(window.location.hash.slice(1));
      if (!origin || !token.success) { setState("gone"); return; }
      const abort = new AbortController();
      request = abort;
      setState(undefined);
      void direct(origin, "", token.data, abort.signal).then(async response => {
        if (abort.signal.aborted) return;
        if (!response.ok) { setState(response.status === 404 || response.status === 422 ? "gone" : "retry"); return; }
        const listing = publicListing.parse(await response.json());
        if (!abort.signal.aborted) setState({ token: token.data, listing });
      }).catch(() => { if (!abort.signal.aborted) setState("retry"); });
    }
    load();
    window.addEventListener("hashchange", load);
    return () => { request?.abort(); window.removeEventListener("hashchange", load); };
  }, [origin, retry]);
  return <main className="mx-auto grid min-h-dvh max-w-5xl content-start gap-6 px-4 py-6 sm:px-8">
    <header className="border-b pb-4"><h1 className="text-xl font-bold tracking-tight">KAY Real Estate</h1></header>
    {!state ? <p role="status">Chargement de la fiche…</p> : state === "gone" ? <div>
      <h2 className="text-xl font-semibold">Cette fiche n’est plus disponible</h2>
      <p className="mt-2 text-muted-foreground">Demandez un nouveau lien à votre conseiller KAY.</p>
    </div> : state === "retry" ? <div className="grid justify-items-start gap-3">
      <p role="alert">Impossible de charger la fiche pour le moment.</p>
      <Button action="retry" onClick={() => setRetry(n => n + 1)}>Réessayer</Button>
    </div> : <>
      <ClientListingFacts facts={state.listing} />
      {origin && state.listing.photos.length > 0 && <PublicPhotos key={state.token} origin={origin} token={state.token} positions={state.listing.photos} title={state.listing.title} />}
    </>}
  </main>;
}

function PublicPhotos({ origin, token, positions, title }: {
  origin: string; token: string; positions: number[]; title: string;
}) {
  const [index, setIndex] = useState(0);
  return <section aria-label="Photos du bien" className="grid gap-3">
    <h2 className="text-lg font-semibold">Photos</h2>
    <PublicPhoto key={positions[index]} origin={origin} token={token} position={positions[index]} alt={`${title} — photo ${index + 1}`} />
    {positions.length > 1 && <div className="flex items-center justify-between gap-2">
      <Button action="back" variant="outline" disabled={!index} onClick={() => setIndex(n => n - 1)}>Précédente</Button>
      <span aria-live="polite" className="text-sm tabular-nums">{index + 1} / {positions.length}</span>
      <Button action="next" variant="outline" disabled={index + 1 === positions.length} onClick={() => setIndex(n => n + 1)}>Suivante</Button>
    </div>}
  </section>;
}

function PublicPhoto({ origin, token, position, alt }: {
  origin: string; token: string; position: number; alt: string;
}) {
  const [state, setState] = useState<string>();
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    let image: string | undefined;
    void direct(origin, `/photos/${position}`, token, abort.signal).then(async response => {
      if (!response.ok || response.headers.get("Content-Type") !== "image/webp") throw new Error("PHOTO_UNAVAILABLE");
      const blob = await response.blob();
      if (!abort.signal.aborted) { image = URL.createObjectURL(blob); setState(image); }
    }).catch(() => { if (!abort.signal.aborted) setState("failed"); });
    return () => { abort.abort(); if (image) URL.revokeObjectURL(image); };
  }, [origin, token, position, retry]);
  return <div className="relative grid aspect-[4/3] max-h-[65dvh] min-h-32 place-items-center overflow-hidden rounded-lg bg-muted">
    {state && state !== "failed" ? <Image unoptimized fill sizes="(max-width: 840px) 100vw, 960px" className="object-contain" src={state} alt={alt} /> :
      state === "failed" ? <div className="grid justify-items-center gap-2 p-3 text-center"><p role="status">Photo indisponible.</p><Button action="retry" onClick={() => { setState(undefined); setRetry(n => n + 1); }}>Réessayer</Button></div> : <p role="status">Chargement de la photo…</p>}
  </div>;
}
