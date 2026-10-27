"use client";

import { useEffect, useRef, useState } from "react";
import { useDossierDraft } from "@/components/shared/dossier-form";
import { useQuery } from "@/features/contacts/use-query";
import { ApiError } from "@/lib/api/client";
import { approvalReview, sameApprovalReview, type ApprovalReview } from "./approval-review";
import { batchPageSchema, batchSchema, countsSchema } from "./contracts";
import { importCommand } from "./client";

export function useImportReview(id: string, uploadBusy: boolean, blockedChanged: (blocked: boolean) => void, authorityDenied: (error: ApiError) => void) {
  const [page, setPage] = useState(1), [fallback, setFallback] = useState<string>();
  const [overrides, setOverrides] = useState<Record<number, string | null>>({});
  const [busy, setBusy] = useState(false), [uncertain, setUncertain] = useState(false);
  const [operation, setOperation] = useState<"approval" | "preview">("preview");
  const [error, setError] = useState<ApiError>(), [review, setReview] = useState<ApprovalReview>();
  const lock = useRef(false), abort = useRef<AbortController | null>(null);
  const attempt = useRef<{ key: string; review: ApprovalReview } | null>(null);
  const query = useQuery(`/api/v1/imports/${id}?page=${page}&page_size=25`, batchPageSchema), data = query.value;
  if (data && fallback === undefined) setFallback(data.fallback_agent_id ?? "");
  const committed = data?.state === "committed";
  if (committed && uncertain) setUncertain(false);
  const counts = countsSchema.safeParse(data?.counts);
  const dirty = !committed && (Object.keys(overrides).length > 0 || Boolean(data && (fallback ?? "") !== (data.fallback_agent_id ?? "")));
  const blocked = busy || uncertain, disabled = blocked || uploadBusy;
  const canPreview = Boolean(data && ["uploaded", "previewed", "repreview_required"].includes(data.state));
  const canApprove = Boolean(data && approvalReview(data) && !dirty && !disabled);
  const staleReview = Boolean(review && (!sameApprovalReview(review, data) || dirty));
  useDossierDraft(dirty, disabled);
  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => { blockedChanged(blocked); }, [blocked, blockedChanged]);
  useEffect(() => { if (committed) attempt.current = null; }, [committed]);
  useEffect(() => { if (query.error && [401, 403, 404].includes(query.error.status)) authorityDenied(query.error); }, [query.error, authorityDenied]);

  function refresh() { if (!lock.current && !uploadBusy) { setError(undefined); query.refresh(); } }
  function openReview() { if (canApprove && !lock.current && data) setReview(approvalReview(data)); }
  function closeReview() { if (!lock.current) setReview(undefined); }
  function changeFallback(value: string) { if (!disabled) setFallback(value); }
  function changeRow(number: number, agent: string | null) { if (!disabled) setOverrides(previous => ({ ...previous, [number]: agent })); }
  function changePage(value: number) { if (!disabled && !dirty) setPage(value); }

  async function run(approve: boolean) {
    if (lock.current || uploadBusy || committed) return;
    // A retry uses the original request even if a later read has another/no hash.
    const retry = approve && uncertain && attempt.current;
    if (approve ? !retry && (!review || staleReview || !canApprove) : !canPreview || uncertain) return;
    if (approve && !attempt.current && review) attempt.current = { key: crypto.randomUUID(), review };
    lock.current = true; blockedChanged(true); setBusy(true); setOperation(approve ? "approval" : "preview"); setError(undefined);
    const controller = new AbortController(); abort.current = controller;
    let remainsUnknown = uncertain;
    try {
      if (approve) {
        const current = attempt.current!;
        const result = await importCommand(`/api/v1/imports/${id}/approve`, current.review.body, batchSchema, current.key, controller.signal);
        if (result.id !== id || result.state !== "committed" || result.result?.batch_id !== id) throw new ApiError("INVALID_RESPONSE", 502);
        attempt.current = null; remainsUnknown = false; setUncertain(false);
      } else {
        const result = await importCommand(`/api/v1/imports/${id}/preview`, { fallback_agent_id: fallback || null, row_agents: Object.entries(overrides).map(([number, agent_id]) => ({ row_number: Number(number), agent_id })) }, batchSchema, undefined, controller.signal);
        if (result.id !== id || result.state !== "previewed") throw new ApiError("INVALID_RESPONSE", 502);
        if (controller.signal.aborted) return;
        setFallback(result.fallback_agent_id ?? ""); setOverrides({});
      }
      if (!controller.signal.aborted) query.refresh();
    } catch (reason) {
      if (controller.signal.aborted) return;
      const failure = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503);
      if ([401, 403, 404].includes(failure.status)) { attempt.current = null; remainsUnknown = false; authorityDenied(failure); }
      else {
        setError(failure);
        if (approve && failure.status >= 500) { remainsUnknown = true; setUncertain(true); }
        else if (approve) { attempt.current = null; remainsUnknown = false; setUncertain(false); query.refresh(); }
      }
    } finally {
      lock.current = false; abort.current = null;
      if (!controller.signal.aborted) { setBusy(false); setReview(undefined); blockedChanged(remainsUnknown); }
    }
  }
  return { data, counts, error: error ?? query.error, readError: query.error, dirty, disabled, busy, uncertain, operation, committed, canPreview, canApprove, review, staleReview, page, fallback: fallback ?? "", overrides, refresh, openReview, closeReview, changeFallback, changeRow, changePage, preview: () => run(false), approve: () => run(true) };
}
