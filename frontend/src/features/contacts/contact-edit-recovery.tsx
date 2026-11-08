"use client";
import { Button } from "@/components/ui/button";
import { CommandError } from "./record-states";
import type { useContactEditCommand } from "./use-contact-edit-command";

export function ContactEditRecovery({ command, unavailable = false }: { command: ReturnType<typeof useContactEditCommand>; unavailable?: boolean }) {
  if (!command.error) return null;
  return <div className="grid min-w-0 gap-3" aria-label="Reprise des coordonnées"><CommandError error={command.error} dismiss={command.clear} />
    {command.uncertain ? <p className="text-sm text-muted-foreground">{command.acknowledged ? "La modification est enregistrée. Actualisez son résultat sans enregistrer une seconde fois." : "La réponse a été interrompue. Réessayez exactement la modification confirmée pour retrouver son résultat."}</p> : command.needsReview ? <><p className="text-sm text-muted-foreground">Votre saisie est conservée. Comparez les coordonnées actuelles avant de reprendre.</p><Button action="compare" type="button" variant="outline" disabled={command.pending || unavailable} onClick={() => void command.compare()}>Comparer les coordonnées actuelles</Button></> : null}
  </div>;
}
