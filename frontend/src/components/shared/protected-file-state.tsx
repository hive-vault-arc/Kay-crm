import type { FileVersion } from "@/features/files/contracts";

const labels = { awaiting_upload: "Transfert à reprendre", pending_scan: "En quarantaine, analyse en attente", clean: "Analyse réussie", rejected: "Fichier rejeté par l’antivirus" };
export function ProtectedFileState({ version }: { version?: FileVersion }) {
  const state = version?.state;
  return <div className="grid gap-2" aria-live="polite" aria-atomic="true"><p className={state === "clean" ? "text-success" : state === "rejected" ? "text-danger" : "text-muted-foreground"}>{state ? labels[state] : "Aucun transfert terminé"}</p>{version?.scan_error ? <p className="text-warning">{state === "awaiting_upload" ? "Le transfert est incomplet. Envoyez à nouveau le fichier." : "L’analyse est indisponible. Le fichier reste protégé et ne peut pas être ouvert. Réessayez l’analyse après rétablissement du service."}</p> : null}</div>;
}
