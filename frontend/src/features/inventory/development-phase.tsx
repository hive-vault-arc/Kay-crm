import { Badge } from "@/components/ui/badge";
import { programmePhaseLabel, type Development } from "./development-contracts";

export function DevelopmentPhaseBadge({ phase }: { phase: Development["phase"] }) {
  const label = programmePhaseLabel(phase ?? null);
  return <Badge variant={phase === "marketing" ? "info" : "neutral"} aria-label={`État du programme : ${label}`}>{label}</Badge>;
}
