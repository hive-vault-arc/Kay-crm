import { ordinaryStages, stageLabels, type Deal } from "./contracts";

export function dealStageGroups(deal: Deal) {
  return ["won", "lost", "cancelled"].includes(deal.stage) ? [{ label: "Clôture", items: [{ id: "reopen", label: "Rouvrir l’affaire" }] }] : [
    { label: "Suivi commercial", items: ordinaryStages.map(id => ({ id, label: stageLabels[id] })) },
    { label: "Réservation", items: [{ id: "reserved", label: deal.active_reservation ? "Libérer la réservation" : "Réserver une offre", disabled: !deal.offering }] },
    { label: "Clôture", items: [{ id: "won", label: "Clôturer · gagnée", disabled: !deal.offering }, { id: "lost", label: "Clôturer · perdue" }, { id: "cancelled", label: "Clôturer · annulée" }] },
  ];
}

export type DealStageSelection = { id: string; reviewed: Deal; nextStage?: string };
export function dealStageSelection(deal: Deal, id: string): DealStageSelection | undefined {
  const ordinary = ordinaryStages.some(stage => stage === id), terminal = ["won", "lost", "cancelled"].includes(deal.stage);
  if (deal.archived_at || deal.contact.archived_at || (!ordinary && !["reserved", "won", "lost", "cancelled", "reopen"].includes(id))) return;
  if (terminal) return id === "reopen" ? { id, reviewed: deal } : ordinary ? { id: "reopen", reviewed: deal, nextStage: id } : undefined;
  if (id === "reopen") return;
  if ((id === "won" || id === "reserved") && !deal.offering) return;
  if (ordinary && deal.active_reservation) return { id: "reserved", reviewed: deal, nextStage: id };
  return { id, reviewed: deal };
}
