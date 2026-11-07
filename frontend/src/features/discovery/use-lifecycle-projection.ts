"use client";
import { useState } from "react";
import type { ApiError } from "@/lib/api/client";

/** Keep the selected page/dialog mounted; a current access refusal always wins. */
export function useLifecycleProjection<T>(value: T | undefined, error?: ApiError) {
  const [held, setHeld] = useState<T>();
  const denied = error && [401, 403, 404].includes(error.status);
  if (denied && held !== undefined) setHeld(undefined);
  return { value: denied ? undefined : held ?? value, error: held && error && error.status >= 500 ? undefined : error, holding: held !== undefined,
    hold: (active: boolean) => setHeld(current => active ? current ?? value : undefined) };
}
