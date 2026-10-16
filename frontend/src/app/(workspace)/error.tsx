"use client";
import { DataState } from "@/components/shared/data-state";
import { Button } from "@/components/ui/button";
export default function WorkspaceError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <DataState
      state="error"
      title="Impossible d’afficher cette page"
      description="La page n’a pas pu être chargée. Vous pouvez réessayer."
      action={
        <Button action="retry" variant="outline" onClick={reset}>
          Réessayer
        </Button>
      }
    />
  );
}
