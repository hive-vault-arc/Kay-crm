"use client";
import { useId } from "react";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
export function ArchiveFilter({ value, change }: { value: string; change: (value: string) => void }) {
  const id = useId();
  return <div className="grid gap-2"><Label htmlFor={id}>État du dossier</Label><NativeSelect id={id} value={value} onChange={event => change(event.target.value)}><option value="active">Actifs</option><option value="archived">Archivés</option><option value="all">Actifs et archivés</option></NativeSelect></div>;
}
