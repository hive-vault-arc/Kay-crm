"use client";
import { useEffect, useState } from "react";

export function useDirectoryFilters<T extends Record<string, string | number>>(defaults: T, fromKey: keyof T, toKey: keyof T) {
  const [draft, setDraft] = useState(defaults);
  const [filters, setFilters] = useState(defaults);
  const [page, setPage] = useState(1);
  const [invalid, setInvalid] = useState("");
  const datesInvalid = Boolean(draft[fromKey] && draft[toKey] && draft[fromKey] > draft[toKey]);
  const pending = draft !== filters;
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => {
      if (typeof draft.country === "string" && draft.country.length === 1) return;
      if (datesInvalid) { setInvalid("La date de début doit précéder la date de fin."); return; }
      setInvalid(""); setFilters(draft); setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [draft, datesInvalid, pending]);
  function apply(close: () => void) {
    if (datesInvalid) { setInvalid("La date de début doit précéder la date de fin."); return; }
    setInvalid(""); setFilters(draft); setPage(1); close();
  }
  function reset() { setDraft(defaults); setFilters(defaults); setPage(1); setInvalid(""); }
  const activeCount = Object.entries(filters).filter(([key, value]) => !["sort", "page_size"].includes(key) && value !== defaults[key]).length;
  return { draft, setDraft, filters, page, setPage, invalid, apply, reset, activeCount };
}
