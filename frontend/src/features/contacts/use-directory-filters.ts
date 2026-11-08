"use client";
import { useEffect, useState } from "react";

export function useDirectoryFilters<T extends Record<string, string | number>>(defaults: T, fromKey?: keyof T, toKey?: keyof T, validate?: (value: T) => string, initial: T = defaults) {
  const [draft, setDraft] = useState(initial);
  const [filters, setFilters] = useState(initial);
  const [page, setPage] = useState(1);
  const [invalid, setInvalid] = useState("");
  const datesInvalid = Boolean(fromKey && toKey && draft[fromKey] && draft[toKey] && draft[fromKey] > draft[toKey]);
  const problem = datesInvalid ? "La date de début doit précéder la date de fin." : validate?.(draft) ?? "";
  const pending = draft !== filters;
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => {
      if (typeof draft.country === "string" && draft.country.length === 1) return;
      if (problem) { setInvalid(problem); return; }
      setInvalid(""); setFilters(draft); setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [draft, problem, pending]);
  function apply(close: () => void) {
    if (problem) { setInvalid(problem); return; }
    setInvalid(""); setFilters(draft); setPage(1); close();
  }
  function reset() { setDraft(defaults); setFilters(defaults); setPage(1); setInvalid(""); }
  const activeCount = Object.entries(filters).filter(([key, value]) => !["sort", "page_size"].includes(key) && value !== defaults[key]).length;
  return { draft, setDraft, filters, page, setPage, invalid, apply, reset, activeCount };
}
