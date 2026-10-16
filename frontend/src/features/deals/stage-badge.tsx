import { Badge } from "@/components/ui/badge";
import { stageLabels, type Deal } from "./contracts";

export const stageTones = { new: "info", visit: "purple", negotiation: "warning", reserved: "teal", documents: "purple", won: "success", lost: "danger", cancelled: "neutral" } as const;
export function StageBadge({ stage }: { stage: Deal["stage"] }) {
  return <Badge variant={stageTones[stage]}>{stageLabels[stage]}</Badge>;
}
