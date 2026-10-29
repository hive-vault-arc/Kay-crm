"use client";
import { createContext } from "react";

export const InventoryBusyContext = createContext<(busy: boolean) => void>(() => {});
