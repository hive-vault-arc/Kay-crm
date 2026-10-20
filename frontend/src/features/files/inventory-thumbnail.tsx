"use client";
import Image from "next/image";
import { DevelopmentIcon } from "@/components/icons";
import { useEffect, useRef, useState } from "react";
import { apiGet } from "@/lib/api/client";
import { documentsSchema } from "./contracts";
import { downloadBytes, requestFilePermit } from "./transfers";

export function InventoryThumbnail({ kind, id, compact = false }: { kind: "property" | "development"; id: string; compact?: boolean }) {
  const anchor = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(compact), [preview, setPreview] = useState<string>(), [state, setState] = useState("Chargement de l’aperçu photographique…");
  useEffect(() => {
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); } }, { rootMargin: "100px" });
    if (anchor.current) observer.observe(anchor.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible) return;
    let active = true, objectUrl: string | undefined;
    const controller = new AbortController();
    async function load() {
      try {
        const result = await apiGet(`/api/v1/documents?parent_kind=${kind}&parent_id=${id}${kind === "property" ? "&purpose=photo" : ""}&page=1&page_size=20`, documentsSchema, controller.signal);
        const document = result.items.find(item => !item.archived && item.mime_type.startsWith("image/") && item.versions[0]?.state === "clean");
        if (!active) return;
        if (!document) { setState("Aperçu photographique non disponible"); return; }
        const permit = await requestFilePermit({ action: "download", document_id: document.id, expected_version: document.version, version_id: document.versions[0].id });
        if (!active) return;
        const blob = await downloadBytes(permit);
        if (!active) return;
        objectUrl = URL.createObjectURL(blob); setPreview(objectUrl);
      } catch { if (active) setState("Aperçu indisponible. Consultez les pièces jointes de la fiche."); }
    }
    void load();
    return () => { active = false; controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [visible, kind, id]);
  return <div ref={anchor} className={`relative flex shrink-0 items-center justify-center gap-3 overflow-hidden bg-muted text-muted-foreground ${compact ? "size-20 rounded-sm" : "h-40 border-b px-4"}`}>
    {preview ? <Image src={preview} fill unoptimized alt="" sizes="(min-width: 1536px) 30vw, (min-width: 640px) 45vw, 100vw" className="object-cover" onError={() => { setPreview(undefined); setState("Aperçu indisponible. Consultez les pièces jointes de la fiche."); }} /> : <><DevelopmentIcon aria-hidden="true" className="size-8 shrink-0 stroke-1" /><span className={compact ? "sr-only" : "text-xs"}>{state}</span></>}
  </div>;
}
