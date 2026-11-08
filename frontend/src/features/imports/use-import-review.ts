"use client";

import { useEffect, useRef, useState } from "react";
import { useDossierDraft } from "@/components/shared/dossier-form";
import { useQuery } from "@/features/contacts/use-query";
import { ApiError } from "@/lib/api/client";
import { approvalReview, sameApprovalReview, type ApprovalReview } from "./approval-review";
import { batchPageSchema, batchSchema, countsSchema } from "./contracts";
import { importCommand, type ImportActorBinding } from "./client";

export function useImportReview(id: string, uploadBusy: boolean, blockedChanged: (blocked: boolean) => void, authorityDenied: (error: ApiError) => void, uploadLocked: () => boolean = () => false) {
  const [page, setPage] = useState(1), [fallback, setFallback] = useState<string>();
  const [overrides, setOverrides] = useState<Record<number, string | null>>({});
  const [busy, setBusy] = useState(false), [uncertain, setUncertain] = useState(false);
  const [operation, setOperation] = useState<"approval" | "preview">("preview");
  const [error, setError] = useState<ApiError>(), [review, setReview] = useState<ApprovalReview>();
  const lock = useRef(false), abort = useRef<AbortController | null>(null), alive = useRef(true), refused = useRef(false), finished = useRef(false), binding = useRef<ImportActorBinding>({});
  const attempt = useRef<{ key: string; review: ApprovalReview } | null>(null);
  const query = useQuery(`/api/v1/imports/${id}?page=${page}&page_size=25`, batchPageSchema);
  const foreign = Boolean(query.value && query.value.id !== id), deniedRead = Boolean(query.error && [401, 403, 404].includes(query.error.status));
  const readError = deniedRead ? query.error : foreign ? new ApiError("INVALID_RESPONSE", 502) : query.error, data = foreign || deniedRead ? undefined : query.value;
  if (data && fallback === undefined) setFallback(data.fallback_agent_id ?? "");
  const committed = data?.state === "committed";
  if (committed && uncertain) setUncertain(false);
  const counts = countsSchema.safeParse(data?.counts);
  const dirty = !committed && (Object.keys(overrides).length > 0 || Boolean(data && (fallback ?? "") !== (data.fallback_agent_id ?? "")));
  const blocked = busy || uncertain, disabled = blocked || uploadBusy || deniedRead;
  const canPreview = Boolean(data && ["uploaded", "previewed", "repreview_required"].includes(data.state));
  const canApprove = Boolean(data && approvalReview(data) && !dirty && !disabled);
  const staleReview = Boolean(review && (!sameApprovalReview(review, data) || dirty));
  useDossierDraft(dirty, disabled);
  useEffect(() => { alive.current = true; return () => { alive.current = false; abort.current?.abort(); attempt.current = null; blockedChanged(false); }; }, [blockedChanged]);
  useEffect(() => { blockedChanged(blocked); }, [blocked, blockedChanged]);
  useEffect(() => { if (committed) { attempt.current = null; finished.current = true; } }, [committed]);
  useEffect(() => {
    const failure = query.error;
    if (failure && [401, 403, 404].includes(failure.status)) { refused.current = true; abort.current?.abort(); attempt.current = null; authorityDenied(failure); }
  }, [query.error, authorityDenied]);

  const unavailable = () => !alive.current || refused.current || finished.current || uploadLocked();
  function refresh() { if (alive.current && !refused.current && !uploadLocked() && !lock.current && !uploadBusy) { setError(undefined); query.refresh(); } }
  function openReview() { if (!unavailable() && canApprove && !lock.current && data) setReview(approvalReview(data)); }
  function closeReview() { if (!unavailable() && !lock.current) setReview(undefined); }
  function changeFallback(value: string) { if (!unavailable() && !lock.current && !attempt.current && !disabled) setFallback(value); }
  function changeRow(number: number, agent: string | null) { if (!unavailable() && !lock.current && !attempt.current && !disabled) setOverrides(previous => ({ ...previous, [number]: agent })); }
  function changePage(value: number) { if (!unavailable() && !lock.current && !attempt.current && !disabled && !dirty) setPage(value); }

  async function run(approve: boolean) {
    if (unavailable() || lock.current || uploadBusy || committed) return;
    // A retry uses the original request even if a later read has another/no hash.
    const retry = approve && uncertain && attempt.current;
    if (approve ? !retry && (!review || staleReview || !canApprove) : !canPreview || uncertain) return;
    if (approve && !attempt.current && review) attempt.current = { key: crypto.randomUUID(), review };
    lock.current = true; blockedChanged(true); setBusy(true); setOperation(approve ? "approval" : "preview"); setError(undefined);
    const controller = new AbortController(); abort.current = controller;
    let remainsUnknown = uncertain;
    let dispatched = false;
    try {
      if (approve) {
        const current = attempt.current!;
        const result = await importCommand(`/api/v1/imports/${id}/approve`, current.review.body, batchSchema, current.key, controller.signal, { binding: binding.current, dispatched: () => { dispatched = true; } });
        if (!alive.current || controller.signal.aborted) return;
        if (result.id !== id || result.state !== "committed" || result.result?.batch_id !== id) throw new ApiError("INVALID_RESPONSE", 502);
        finished.current = true;
        attempt.current = null; remainsUnknown = false; setUncertain(false);
      } else {
        const result = await importCommand(`/api/v1/imports/${id}/preview`, { fallback_agent_id: fallback || null, row_agents: Object.entries(overrides).map(([number, agent_id]) => ({ row_number: Number(number), agent_id })) }, batchSchema, undefined, controller.signal, { binding: binding.current });
        if (result.id !== id || result.state !== "previewed") throw new ApiError("INVALID_RESPONSE", 502);
        if (!alive.current || controller.signal.aborted) return;
        setFallback(result.fallback_agent_id ?? ""); setOverrides({});
      }
      if (alive.current && !controller.signal.aborted) query.refresh();
    } catch (reason) {
      if (!alive.current || controller.signal.aborted) return;
      const failure = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503);
      if ([401, 403, 404].includes(failure.status)) { refused.current = true; attempt.current = null; remainsUnknown = false; authorityDenied(failure); }
      else {
        setError(failure);
        if (approve && (remainsUnknown || dispatched && (failure.status >= 500 || failure.code === "INVALID_RESPONSE"))) { remainsUnknown = true; setUncertain(true); }
        else if (approve) { attempt.current = null; remainsUnknown = false; setUncertain(false); query.refresh(); }
      }
    } finally {
      lock.current = false; abort.current = null;
      if (alive.current && !controller.signal.aborted) { setBusy(false); setReview(undefined); blockedChanged(remainsUnknown); }
    }
  }
  return { data, counts, error: deniedRead ? readError : error ?? readError, readError, dirty, disabled, busy, uncertain, operation, committed, canPreview, canApprove, review: deniedRead ? undefined : review, staleReview, page, fallback: deniedRead ? "" : fallback ?? "", overrides: deniedRead ? {} : overrides, refresh, openReview, closeReview, changeFallback, changeRow, changePage, preview: () => run(false), approve: () => run(true) };
}
