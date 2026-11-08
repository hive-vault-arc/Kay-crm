"use client";
import { useEffect, useRef, useState } from "react";
import { useDossierDraft } from "@/components/shared/dossier-form";
import { apiCommand } from "@/lib/api/command";
import { ApiError } from "@/lib/api/client";
import { useHydrated } from "@/hooks/use-hydrated";
import { generatedItemSchema, type GenerateBody } from "./contracts";
import type { usePreparedDocuments } from "./prepared-documents";
import { pendingPreparations, preparationBody, preparationSignature, preparationValues, visiblePreparations, type PreparationAttempts, type PreparationDrafts } from "./preparation-model";

export function usePreparation({ parentKind, id, documents }: { parentKind: GenerateBody["parent_kind"]; id: string; documents: ReturnType<typeof usePreparedDocuments> }) {
  const hydrated = useHydrated();
  const [selectedCode, setSelectedCode] = useState("01"), [tab, setTab] = useState("prepare"), [historyVisited, setHistoryVisited] = useState(false);
  const [drafts, setDrafts] = useState<PreparationDrafts>({}), [attempts, setAttempts] = useState<PreparationAttempts>({}), [busy, setBusy] = useState(false), [notice, setNotice] = useState("");
  const [scopeError, setScopeError] = useState<ApiError>(), [validation, setValidation] = useState<{ fields: string[]; message: string }>();
  const lock = useRef(false), alive = useRef(true), request = useRef<AbortController | null>(null), attemptStore = useRef<PreparationAttempts>({});
  const { context } = documents;
  const authorityError = [context.error, documents.history.error].find(error => error && [401, 403, 404].includes(error.status));
  const contextError = scopeError ?? authorityError ?? context.error;
  const allowed = !contextError ? context.value : undefined;
  const template = allowed?.templates.find(item => item.code === selectedCode) ?? allowed?.templates[0];
  const values = template ? preparationValues(template, allowed!.defaults, drafts[template.code]?.values) : {};
  const activeAttempt = template ? attempts[template.code] : undefined;
  const uncertain = Boolean(activeAttempt?.uncertain), changedTemplate = Boolean(template && uncertain && activeAttempt?.templateSignature !== preparationSignature(template));
  const draft = useDossierDraft(pendingPreparations(drafts, attempts), busy);
  function clearPrivate(error: ApiError) {
    request.current?.abort(); setScopeError(error); setDrafts({}); attemptStore.current = {}; setAttempts({}); setNotice(""); setValidation(undefined);
  }
  useEffect(() => { alive.current = true; return () => { alive.current = false; request.current?.abort(); }; }, []);
  useEffect(() => {
    if (authorityError) request.current?.abort();
    // Visibility is already removed during render. Reconcile retained memory after
    // this scoped read settles; cancel if a newer read or unmount supersedes it.
    let current = true;
    queueMicrotask(() => {
      if (!current || !alive.current) return;
      if (authorityError) { setScopeError(authorityError); setDrafts({}); attemptStore.current = {}; setAttempts({}); setNotice(""); setValidation(undefined); }
      else if (context.value && !context.error) {
        setDrafts(drafts => Object.keys(drafts).some(code => !context.value!.templates.some(template => template.code === code)) ? visiblePreparations(drafts, context.value!) : drafts);
        const next = visiblePreparations(attemptStore.current, context.value);
        if (Object.keys(next).length !== Object.keys(attemptStore.current).length) { attemptStore.current = next; setAttempts(next); }
      }
    });
    return () => { current = false; };
  }, [authorityError, context.error, context.value]);
  function change(key: string, value: string) {
    if (!template || lock.current || uncertain || !allowed?.can_generate || !template.fields.some(field => field.key === key)) return;
    const baseline = preparationValues(template, allowed.defaults);
    setDrafts(current => ({ ...current, [template.code]: { baseline: current[template.code]?.baseline ?? baseline, values: { ...(current[template.code]?.values ?? baseline), [key]: value } } }));
    setValidation(undefined); setNotice("");
  }
  function choose(code: string) { if (!lock.current && allowed?.templates.some(item => item.code === code)) { setSelectedCode(code); setValidation(undefined); setNotice(""); } }
  function selectTab(next: string) { if (lock.current) return; const value = next === "history" ? "history" : "prepare"; if (value === "history") setHistoryVisited(true); setTab(value); }
  function restart() {
    if (lock.current || !template) return;
    const next = { ...attemptStore.current }; delete next[template.code]; attemptStore.current = next; setAttempts(next); setValidation(undefined); setNotice("");
  }
  function retryContext() { setScopeError(undefined); documents.context.refresh(); documents.history.refresh(); }
  async function generate() {
    if (!hydrated || lock.current || !alive.current || !template || !allowed?.can_generate || changedTemplate) return;
    const parsed = preparationBody(parentKind, id, template, values);
    if (!parsed.success && !activeAttempt?.uncertain) { setValidation(parsed); return; }
    const previous = attemptStore.current[template.code];
    const attempt = previous?.uncertain ? previous : parsed.success && previous?.fingerprint === parsed.fingerprint ? previous : parsed.success ? { body: parsed.body, fingerprint: parsed.fingerprint, key: crypto.randomUUID(), templateSignature: preparationSignature(template), uncertain: false } : undefined;
    if (!attempt) return;
    lock.current = true; setBusy(true); setValidation(undefined); setNotice("");
    attemptStore.current = { ...attemptStore.current, [template.code]: { ...attempt, error: undefined } }; setAttempts(attemptStore.current);
    const abort = new AbortController(); request.current = abort;
    try {
      const item = await apiCommand("/api/v1/generated-documents", attempt.body, generatedItemSchema, attempt.key, "POST", 40_000, abort.signal);
      if (!alive.current || abort.signal.aborted) return;
      if (item.template_code !== template.code) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503);
      const next = { ...attemptStore.current }; delete next[template.code]; attemptStore.current = next; setAttempts(next);
      setDrafts(current => ({ ...current, [template.code]: { values: { ...attempt.body.values }, baseline: { ...attempt.body.values } } }));
      setNotice("PDF préparé et conservé dans l’historique privé."); setHistoryVisited(true); setTab("history"); documents.refresh();
    } catch (reason) {
      if (!alive.current || abort.signal.aborted) return;
      const error = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503);
      if ([401, 403, 404].includes(error.status)) { clearPrivate(error); documents.context.refresh(); documents.history.refresh(); }
      else { attemptStore.current = { ...attemptStore.current, [template.code]: { ...attempt, uncertain: error.status >= 500, error } }; setAttempts(attemptStore.current); }
    } finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  return { selectedCode: template?.code, template, values, hydrated, busy, dirty: draft.dirty, tab, historyVisited, notice, validation, context: allowed, contextError, attempt: activeAttempt, uncertain, changedTemplate, choose, change, selectTab, restart, retryContext, generate };
}
