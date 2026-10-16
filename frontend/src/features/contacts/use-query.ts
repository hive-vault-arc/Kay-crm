"use client";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { apiGet, ApiError } from "@/lib/api/client";

export function queryPath(kind: string, values: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value !== undefined && value !== "") query.set(key, String(value));
  return `/api/v1/${kind}?${query.toString().replace(/\+/g, "%20")}` as `/api/v1/${string}`;
}
export function useQuery<T>(path: `/api/v1/${string}`, schema: z.ZodType<T>) {
  const [state, setState] = useState<{ path: string; value?: T; error?: ApiError }>();
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    apiGet(path, schema, abort.signal).then(value => { if (!abort.signal.aborted) setState({ path, value }); }).catch(reason => {
      if (!abort.signal.aborted) setState({ path, error: reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503) });
    });
    return () => abort.abort();
  }, [path, schema, retry]);
  const refresh = useCallback(() => { setState(undefined); setRetry(value => value + 1); }, []);
  const refreshQuietly = useCallback(() => setRetry(value => value + 1), []);
  return { value: state?.path === path ? state.value : undefined, error: state?.path === path ? state.error : undefined, refresh, refreshQuietly };
}
