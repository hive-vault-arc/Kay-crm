import { DataState } from "@/components/shared/data-state";
export default function Loading() {
  return (
    <DataState state="loading" title="Chargement de l’espace de travail…" />
  );
}
