"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { contactSchema, type Contact } from "@/features/contacts/contracts";
import { useQuery } from "@/features/contacts/use-query";
import { currentRecord } from "@/features/realtime/current-record";
import type { ApiError } from "@/lib/api/client";

// Owner membership is role OR a current/former legal link. Do not replace that
// backend predicate with a strict literal-role check in this contact workspace.
export function useOwnerContact(id: string, onChanged?: () => void, onDenied?: () => void, includeIdentity = false) {
  const query = useQuery(`/api/v1/contacts/${id}${includeIdentity ? "?owner_identity=true" : ""}`, contactSchema);
  const [edited, setEdited] = useState<Contact>(), [scopeError, setScopeError] = useState<ApiError>(), [notice, setNotice] = useState("");
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const canonicalId = query.value?.id ?? id;
  useEffect(() => { if (query.error && [401, 403, 404].includes(query.error.status)) onDenied?.(); }, [query.error, onDenied]);
  const record = currentRecord(query.value, edited, canonicalId);
  const contact = includeIdentity && record?.type === "person" && record.national_id_number === undefined && query.value?.id === record.id && query.value?.type === "person"
    ? { ...record, national_id_number: query.value.national_id_number }
    : record;
  const denied = useCallback((error: ApiError) => { if (!alive.current) return; setScopeError(error); setEdited(undefined); setNotice(""); onDenied?.(); }, [onDenied]);
  const saved = (value: Contact) => {
    if (!alive.current) return;
    if (value.id !== canonicalId) { setEdited(undefined); query.refresh(); return; }
    setEdited(value); setNotice("Propriétaire enregistré."); query.refreshQuietly(); onChanged?.();
  };
  const retry = () => { setEdited(undefined); setScopeError(undefined); setNotice(""); query.refresh(); };
  const error = query.error ?? scopeError;
  return { contact: error ? undefined : contact, error, notice, saved, denied, retry, refresh: query.refreshQuietly };
}
