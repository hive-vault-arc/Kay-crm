"use client";

import { createContext } from "react";
import type { StaffRole } from "@/features/contacts/contracts";
import type { ApiError } from "@/lib/api/client";
import type { Property } from "./contracts";
import type { Development } from "./development-contracts";

export type InventoryRecord = Property | Development;
export type InventoryRecordScope = {
  root: "properties" | "developments"; id: string; actorId?: string; role: StaffRole; available: boolean;
  accept: (record: InventoryRecord) => void;
  denied: (failure: ApiError, acknowledged: boolean) => void;
};
export const InventoryRecordContext = createContext<InventoryRecordScope | undefined>(undefined);
