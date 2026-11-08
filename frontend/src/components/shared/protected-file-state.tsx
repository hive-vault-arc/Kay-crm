import type { FileVersion } from "@/features/files/contracts";
import { ClockIcon, CompletedIcon, FailureIcon, UploadIcon } from "@/components/icons";
import { CrmStatusBadge } from "./crm-presentation";

const labels = { awaiting_upload: "Transfert à reprendre", pending_scan: "En quarantaine, analyse en attente", clean: "Analyse réussie", rejected: "Fichier rejeté par l’antivirus" };
export function ProtectedFileState({ version }: { version?: FileVersion }) {
  const state = version?.state;
  const Icon = state === "clean" ? CompletedIcon : state === "rejected" ? FailureIcon : state === "pending_scan" ? ClockIcon : UploadIcon;
  const tone = state === "clean" ? "completed" : state === "rejected" ? "lost" : state === "pending_scan" ? "follow_up" : "draft";
  return <div className="kay-protected-file-state" aria-live="polite" aria-atomic="true"><CrmStatusBadge state={tone} dot={false}><Icon size={12} aria-hidden="true" />{state ? labels[state] : "Aucun transfert terminé"}</CrmStatusBadge>{version?.scan_error ? <p className="text-warning">{state === "awaiting_upload" ? "Le transfert est incomplet. Envoyez à nouveau le fichier." : "L’analyse est indisponible. Le fichier reste protégé et ne peut pas être ouvert. Réessayez l’analyse après rétablissement du service."}</p> : null}</div>;
}
