"use client";

import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";

type Scope = {
  active: boolean;
  claim: (owner: symbol) => boolean;
  release: (owner: symbol) => void;
  otherOwner: (owner: symbol) => boolean;
};
const StaffScope = createContext<Scope | null>(null);

/** A profile save and its security dialog must never own concurrent writes. */
export function StaffOperationScope({ children }: { children: ReactNode }) {
  const owner = useRef<symbol | null>(null), [active, setActive] = useState(false);
  const operations = useMemo(() => ({
    claim(candidate: symbol) {
      if (owner.current !== null && owner.current !== candidate) return false;
      owner.current = candidate; setActive(true); return true;
    },
    release(candidate: symbol) {
      if (owner.current === candidate) { owner.current = null; setActive(false); }
    },
    otherOwner: (candidate: symbol) => owner.current !== null && owner.current !== candidate,
  }), []);
  return <StaffScope.Provider value={{ ...operations, active }}>{children}</StaffScope.Provider>;
}

export function useStaffOperationScope() {
  const scope = useContext(StaffScope);
  if (!scope) throw new Error("STAFF_OPERATION_SCOPE_REQUIRED");
  return scope;
}
