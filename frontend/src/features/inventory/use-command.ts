"use client";
import { createContext, useContext, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { resultSchema } from "./contracts";

export const InventoryBusyContext = createContext<(busy: boolean) => void>(() => {});

export function useInventoryCommand() {
  const [error, setError] = useState<ApiError>();
  const [pending, setPending] = useState(false);
  const attempt = useRef({ key: "", body: "" });
  const locked = useRef(false);
  const recordBusy = useContext(InventoryBusyContext);
  async function submit(path: `/api/v1/${string}`, body: unknown, method: "POST" | "PATCH" | "PUT", saved: (id: string) => void) {
    if (locked.current) return;
    locked.current = true; setPending(true); recordBusy(true); setError(undefined);
    const fingerprint = JSON.stringify({ path, method, body });
    if (attempt.current.body !== fingerprint) attempt.current = { key: crypto.randomUUID(), body: fingerprint };
    try { const result = await apiCommand(path, body, resultSchema, attempt.current.key, method); saved("property_id" in result ? result.property_id : result.development_id); }
    catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); }
    finally { locked.current = false; setPending(false); recordBusy(false); }
  }
  return { error, pending, submit, clear: () => setError(undefined) };
}
