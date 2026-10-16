"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, apiGet } from "@/lib/api/client";
import { useHydrated } from "@/hooks/use-hydrated";

const readiness = z.object({ status: z.literal("ready") }).strict();
type State = { kind: "loading" } | { kind: "ready" } | { kind: "error"; message: string };

export function ServiceStatus() {
  const hydrated = useHydrated();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({ kind: "loading" });
  useEffect(() => {
    const controller = new AbortController();
    apiGet("/api/v1/health/ready", readiness, controller.signal).then(
      () => { if (!controller.signal.aborted) setState({ kind: "ready" }); },
      (error: unknown) => {
        if (!controller.signal.aborted) setState({
          kind: "error",
          message: error instanceof ApiError ? error.message : "La vérification a échoué. Réessayez.",
        });
      },
    );
    return () => controller.abort();
  }, [attempt]);

  return (
    <section aria-labelledby="service-heading" className="flex min-w-0 max-w-reading flex-wrap items-center gap-3">
      <h2 id="service-heading" className="sr-only">Connexion au service</h2>
      <div aria-live={hydrated ? "polite" : undefined} aria-atomic="true" aria-busy={state.kind === "loading"}>
        {state.kind === "loading" ? (
          <div className="grid gap-2">
            <p>Vérification du service local…</p>
            <Skeleton className="h-6 w-48" />
          </div>
        ) : state.kind === "ready" ? (
          <Alert className="border-0 bg-transparent p-0 text-xs text-success">
            <AlertTitle>Service local disponible</AlertTitle>
            <AlertDescription className="sr-only text-success">
              La connexion à la base locale est vérifiée.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive" className="bg-danger-background text-danger">
            <AlertTitle>Service local indisponible</AlertTitle>
            <AlertDescription className="text-danger">{state.message}</AlertDescription>
          </Alert>
        )}
      </div>
      <Button
        variant="outline"
        className="justify-self-start"
        disabled={state.kind === "loading"}
        onClick={() => { setState({ kind: "loading" }); setAttempt((value) => value + 1); }}
      >
        Vérifier à nouveau
      </Button>
    </section>
  );
}
