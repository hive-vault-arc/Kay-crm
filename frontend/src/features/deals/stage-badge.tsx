import { CrmStatusBadge } from "@/components/shared/crm-presentation";
import { stageLabels, type Deal } from "./contracts";

export const stageTones = { new: "info", visit: "purple", negotiation: "warning", reserved: "teal", documents: "purple", won: "success", lost: "danger", cancelled: "neutral" } as const;
export function StageBadge({ stage }: { stage: Deal["stage"] }) {
  return <CrmStatusBadge kind="deal" state={stage}>{stageLabels[stage]}</CrmStatusBadge>;
}
