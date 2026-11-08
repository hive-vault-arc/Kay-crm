"use client";

import { useState, type RefObject } from "react";
import { FileIcon, UploadIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function fileSizeLabel(bytes: number) {
  const unit = bytes >= 1024 * 1024 ? "Mo" : bytes >= 1024 ? "Ko" : "octets";
  const value = unit === "Mo" ? bytes / (1024 * 1024) : unit === "Ko" ? bytes / 1024 : bytes;
  return `${new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 1 }).format(value)} ${unit}`;
}

// Presentation only: callers retain their metadata, conversion, permit and AV checks.
export function FilePicker({ id, label, accept, description, selected, choose, selection, chooseFiles, disabled, inputRef, browseRef, automatic = false }: {
  id: string; label: string; accept: string; description: string; selected?: File; choose: (file?: File) => void; disabled: boolean;
  selection?: File[]; chooseFiles?: (files: File[]) => void;
  inputRef: RefObject<HTMLInputElement | null>; browseRef?: RefObject<HTMLButtonElement | null>; automatic?: boolean;
}) {
  const [dragging, setDragging] = useState(false), [dropError, setDropError] = useState("");
  const multiple = Boolean(chooseFiles);
  const count = selection?.length ?? 0;
  function picked(files: FileList | null) {
    setDragging(false);
    if (disabled || !files?.length) return;
    if (!multiple && files.length > 1) { setDropError("Sélectionnez un seul fichier à la fois."); return; }
    setDropError("");
    if (chooseFiles) chooseFiles(Array.from(files));
    else choose(files[0]);
  }
  return <div className="kay-file-picker" data-has-file={Boolean(selected)} data-dragging={dragging && !disabled}>
    <Label id={`${id}-label`} htmlFor={id}>{label}</Label>
    <div className="kay-file-drop" role="group" aria-label="Zone de dépôt" onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = disabled ? "none" : "copy"; if (!disabled) setDragging(true); }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }} onDrop={event => { event.preventDefault(); picked(event.dataTransfer.files); }}>
      <Input ref={inputRef} id={id} type="file" tabIndex={-1} className="kay-file-input" accept={accept} multiple={multiple} disabled={disabled} aria-describedby={`${id}-help ${id}-selection`} onChange={event => picked(event.target.files)} />
      <span className="kay-upload-symbol"><UploadIcon aria-hidden="true" size={24} /></span>
      <strong>{multiple ? selected ? "Changer la sélection" : "Choisissez vos fichiers" : selected ? "Changer le fichier" : "Choisissez votre fichier"}</strong>
      <p className="kay-file-drop-hint">Glissez {multiple ? "vos fichiers" : "le fichier"} ici ou parcourez vos fichiers.</p>
      <Button action="file" ref={browseRef} type="button" variant="outline" disabled={disabled} onClick={() => { if (inputRef.current) { inputRef.current.value = ""; inputRef.current.click(); } }}>Parcourir</Button>
    </div>
    <p id={`${id}-help`} className="kay-file-help">{description}{automatic ? " La préparation et l’envoi démarrent après la sélection." : ""}</p>
    <div id={`${id}-selection`} aria-live="polite" className={selected ? "kay-file-selection" : "sr-only"}>{selected ? <><FileIcon aria-hidden="true" size={20} /><div><strong>{count > 1 ? `${count} fichiers sélectionnés` : selected.name}</strong><small>{count > 1 ? selection?.map(file => file.name).join(", ") : `${fileSizeLabel(selected.size)}${selected.type ? ` · ${selected.type}` : ""}`}</small></div>{!automatic ? <Button action="remove" type="button" variant="ghost" size="icon" disabled={disabled} aria-label={count > 1 ? "Vider la sélection" : `Retirer ${selected.name}`} onClick={() => { if (inputRef.current) inputRef.current.value = ""; if (chooseFiles) chooseFiles([]); else choose(undefined); }}><span className="sr-only">Retirer</span></Button> : null}</> : "Aucun fichier sélectionné"}</div>
    {dropError ? <p role="alert" className="text-sm text-danger">{dropError}</p> : null}
  </div>;
}
