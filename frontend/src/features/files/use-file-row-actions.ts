"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { meSchema } from "@/lib/auth/contracts";
import { documentSchema, fileCommandSchema, type ProtectedDocument } from "./contracts";
import { downloadBytes, requestFilePermit } from "./transfers";

type Identity = ReturnType<typeof meSchema.parse>;
export type FileRowBinding = { actorId?: string; role?: Identity["user"]["role"] };
type Completed = (document: ProtectedDocument, signal: AbortSignal) => void | Promise<void>;
type Attempt = { action: "archive" | "retry-scan"; document: ProtectedDocument; body: ReturnType<typeof fileCommandSchema.parse>; key: string; uncertain: boolean; dispatched: boolean; receipt?: ProtectedDocument; completed: Completed };
type Delivery = { document: ProtectedDocument; version: string; controller: AbortController };
const lost = (error: ApiError) => [401, 403, 404].includes(error.status);
const sameMetadata = (a: ProtectedDocument, b: ProtectedDocument) => a.id === b.id && a.filename === b.filename && a.mime_type === b.mime_type && a.size_bytes === b.size_bytes && a.purpose === b.purpose;

export function useFileRowActions({ document, writable, readable, actorId, role, owned, denied }: { document: ProtectedDocument; writable: boolean; readable: boolean; owned: (active: boolean, snapshot: ProtectedDocument) => void; denied: (error: ApiError, acknowledged: boolean) => void } & FileRowBinding) {
  const hydrated = useHydrated(), key = `${document.id}:${actorId ?? ""}:${role ?? ""}`;
  const origin = useRef({ key, id: document.id, actorId, role });
  const alive = useRef(true), refused = useRef(false), locked = useRef(false), latest = useRef({ key, document, writable, readable, hydrated, owned, denied }), binding = useRef<{ id: string; role: string } | undefined>(undefined);
  const attempt = useRef<Attempt | undefined>(undefined), commandRequest = useRef<AbortController | undefined>(undefined), delivery = useRef<Delivery | undefined>(undefined), previewUrl = useRef<string | undefined>(undefined), minimum = useRef(document.version), archived = useRef(document.archived);
  const [busy, setBusy] = useState(false), [commandBusy, setCommandBusy] = useState(false), [recovering, setRecovering] = useState(false), [acknowledged, setAcknowledged] = useState(false), [operation, setOperation] = useState<Attempt["action"]>(), [error, setError] = useState<ApiError>(), [preview, setPreview] = useState<string>();
  const active = () => alive.current && !refused.current && latest.current.key === origin.current.key;
  function clearPreview(update = true) { if (previewUrl.current) URL.revokeObjectURL(previewUrl.current); previewUrl.current = undefined; if (update && alive.current) setPreview(undefined); }
  const deliveryLive = useCallback((value: Delivery) => { const now = latest.current; return alive.current && !refused.current && latest.current.key === origin.current.key && delivery.current === value && !value.controller.signal.aborted && now.readable && !now.document.archived && !archived.current && sameMetadata(now.document, value.document) && now.document.versions.some(version => version.id === value.version && version.state === "clean"); }, []);
  useLayoutEffect(() => {
    latest.current = { key, document, writable, readable, hydrated, owned, denied }; minimum.current = Math.max(minimum.current, document.version); archived.current ||= document.archived;
    if (attempt.current) owned(true, document);
    const value = delivery.current;
    if (value && !deliveryLive(value)) { value.controller.abort(); delivery.current = undefined; if (!attempt.current) { locked.current = false; setBusy(false); } }
    if (!readable || document.archived) clearPreview();
  }, [key, document, writable, readable, hydrated, owned, denied, deliveryLive]);
  useEffect(() => { alive.current = true; return () => { alive.current = false; commandRequest.current?.abort(); delivery.current?.controller.abort(); attempt.current = undefined; delivery.current = undefined; binding.current = undefined; clearPreview(false); }; }, []);
  function authorize(identity: Identity) {
    if (!active() || identity.must_change_password || origin.current.actorId && identity.user.id !== origin.current.actorId || origin.current.role && identity.user.role !== origin.current.role || binding.current && (identity.user.id !== binding.current.id || identity.user.role !== binding.current.role)) throw new ApiError("FORBIDDEN", 403);
    binding.current ??= { id: identity.user.id, role: identity.user.role };
  }
  async function prove(signal: AbortSignal) { const identity = await apiGet("/api/v1/auth/me", meSchema, signal); if (!active() || signal.aborted) return false; authorize(identity); return true; }
  function refuse(problem: ApiError, recorded: boolean) {
    if (!active()) return; refused.current = true; commandRequest.current?.abort(); delivery.current?.controller.abort(); clearPreview(); attempt.current = undefined; delivery.current = undefined;
    setError(problem); setBusy(false); setCommandBusy(false); setRecovering(false); latest.current.owned(false, document); latest.current.denied(problem, recorded);
  }
  function validate(value: unknown, source: ProtectedDocument, version: number) {
    const parsed = documentSchema.safeParse(value); if (!parsed.success) throw new ApiError("INVALID_RESPONSE", 503);
    if (parsed.data.id !== source.id) throw new ApiError("NOT_FOUND", 404);
    if (!sameMetadata(parsed.data, source) || parsed.data.version < Math.max(minimum.current, version)) throw new ApiError("INVALID_RESPONSE", 503);
    if (parsed.data.archived) { archived.current = true; clearPreview(); }
    return parsed.data;
  }
  async function run(value: Attempt) {
    if (!latest.current.hydrated || !active() || locked.current || !value.receipt && !latest.current.writable) return false;
    let current = value; const abort = new AbortController(); commandRequest.current = abort; locked.current = true; setBusy(true); setCommandBusy(true); setError(undefined);
    try {
      if (!current.receipt) {
        const result = await apiCommand(`/api/v1/documents/${current.document.id}/${current.action}`, current.body, documentSchema, current.key, "POST", undefined, abort.signal, { beforeDispatch: identity => { authorize(identity); if (!latest.current.writable) throw new ApiError("FORBIDDEN", 403); }, dispatched: () => { current = { ...current, dispatched: true }; attempt.current = current; } });
        if (!active() || abort.signal.aborted) return false;
        const receipt = validate(result, current.document, current.body.expected_version + 1); if (current.action === "archive" && !receipt.archived) throw new ApiError("INVALID_RESPONSE", 503);
        current = { ...current, receipt }; attempt.current = current; setAcknowledged(true); minimum.current = Math.max(minimum.current, receipt.version); if (receipt.archived) { archived.current = true; clearPreview(); }
      }
      if (!await prove(abort.signal)) return false;
      const result = await apiGet(`/api/v1/documents/${current.document.id}`, documentSchema, abort.signal);
      if (!active() || abort.signal.aborted) return false;
      const fresh = validate(result, current.document, current.receipt!.version); if (current.action === "archive" && !fresh.archived) throw new ApiError("INVALID_RESPONSE", 503);
      await current.completed(fresh, abort.signal); if (!active() || abort.signal.aborted) return false;
      attempt.current = undefined; setRecovering(false); latest.current.owned(false, current.document); return true;
    } catch (reason) {
      if (!active() || abort.signal.aborted) return false;
      const problem = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503); setError(problem);
      if (lost(problem)) refuse(problem, Boolean(current.receipt));
      else { current = { ...current, uncertain: Boolean(current.receipt) || current.uncertain || current.dispatched && problem.status >= 500 }; attempt.current = current.uncertain ? current : undefined; setRecovering(current.uncertain); if (!current.uncertain) latest.current.owned(false, current.document); }
      return false;
    } finally { if (commandRequest.current === abort) commandRequest.current = undefined; locked.current = false; if (active() && !abort.signal.aborted) { setBusy(false); setCommandBusy(false); } }
  }
  const canStart = () => latest.current.hydrated && active() && !locked.current && !attempt.current && latest.current.readable && !latest.current.document.archived && !archived.current && latest.current.document.version >= minimum.current;
  function start(action: Attempt["action"], snapshot: ProtectedDocument, completed: Completed) {
    if (!canStart() || !latest.current.writable || !sameMetadata(snapshot, latest.current.document) || snapshot.archived) return Promise.resolve(false);
    if (action === "retry-scan" && (snapshot.versions[0]?.state !== "pending_scan" || !snapshot.versions[0].scan_error || latest.current.document.versions[0]?.state !== "pending_scan" || !latest.current.document.versions[0].scan_error)) return Promise.resolve(false);
    const parsed = fileCommandSchema.safeParse({ expected_version: snapshot.version }); if (!parsed.success) return Promise.resolve(false);
    const value: Attempt = { action, document: structuredClone(snapshot), body: parsed.data, key: crypto.randomUUID(), uncertain: false, dispatched: false, completed };
    attempt.current = value; setOperation(action); setAcknowledged(false); latest.current.owned(true, snapshot); return run(value);
  }
  async function open(previewOnly = false) {
    if (!canStart()) return;
    const source = latest.current.document, version = source.versions.find(value => value.state === "clean"); if (!version || previewOnly && !source.mime_type.startsWith("image/")) return;
    const value: Delivery = { document: structuredClone(source), version: version.id, controller: new AbortController() }; delivery.current = value; locked.current = true; setBusy(true); setError(undefined);
    try {
      const permit = await requestFilePermit({ action: "download", document_id: source.id, expected_version: source.version, version_id: version.id }, value.controller.signal, authorize);
      if (!deliveryLive(value)) return;
      if (permit.version_id !== version.id || permit.document_version !== source.version) throw new ApiError("INVALID_RESPONSE", 503);
      const blob = await downloadBytes(permit, value.controller.signal); if (!deliveryLive(value)) return;
      if (blob.size !== source.size_bytes || blob.type.toLowerCase() !== source.mime_type.toLowerCase()) throw new ApiError("INVALID_RESPONSE", 503);
      if (!await prove(value.controller.signal)) return;
      const fresh = validate(await apiGet(`/api/v1/documents/${source.id}`, documentSchema, value.controller.signal), source, permit.document_version);
      if (!deliveryLive(value)) return;
      if (fresh.archived || !fresh.versions.some(row => row.id === version.id && row.state === "clean")) throw new ApiError("FILE_NOT_CLEAN", 409);
      const objectUrl = URL.createObjectURL(blob); if (!deliveryLive(value)) { URL.revokeObjectURL(objectUrl); return; }
      if (previewOnly) { clearPreview(); previewUrl.current = objectUrl; setPreview(objectUrl); }
      else { const link = window.document.createElement("a"); link.href = objectUrl; link.download = source.filename; setTimeout(() => URL.revokeObjectURL(objectUrl), 1000); link.click(); }
    } catch (reason) { if (active() && delivery.current === value && !value.controller.signal.aborted) { const problem = reason instanceof ApiError ? reason : new ApiError("FILE_TRANSFER_INTERRUPTED", 503); setError(problem); if (lost(problem)) refuse(problem, false); } }
    finally { if (delivery.current === value) { delivery.current = undefined; locked.current = false; if (active() && !value.controller.signal.aborted) setBusy(false); } }
  }
  const staleAnalysisError = !recovering && error?.code === "FILE_SCAN_IN_PROGRESS" && (document.versions[0]?.state !== "pending_scan" || !document.versions[0]?.scan_error);
  return { busy, commandBusy, recovering, acknowledged, operation, error: staleAnalysisError ? undefined : error, preview, clearError: () => { if (canStart()) setError(undefined); }, canStart, canRecover: () => latest.current.hydrated && active() && !locked.current && Boolean(attempt.current?.receipt || latest.current.writable), start, retry: () => attempt.current?.uncertain ? run(attempt.current) : Promise.resolve(false), open, closePreview: () => clearPreview(), protected: commandBusy || recovering };
}
