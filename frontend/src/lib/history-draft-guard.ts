export type GuardedHistoryEntry = { key: string; url: string };
type Navigate = Event & { navigationType: string; cancelable: boolean; destination: GuardedHistoryEntry & { sameDocument: boolean } };
export type HistoryNavigation = EventTarget & {
  currentEntry: GuardedHistoryEntry | null;
  traverseTo: (key: string) => { finished: Promise<unknown> };
};
export type DraftProtection = { dirty: boolean; busy: boolean };

function hashOnly(previous: GuardedHistoryEntry, next: GuardedHistoryEntry) {
  try {
    const from = new URL(previous.url), to = new URL(next.url);
    return from.origin === to.origin && from.pathname === to.pathname && from.search === to.search && from.hash !== to.hash;
  } catch { return false; }
}

// No history writes, router-state copies, form values or persistent storage.
// The classic-history bootstrap supplies this same interface where Navigation
// API entry keys are unavailable. Native verification remains a separate gate.
export function protectHistoryDrafts({ navigation, target, protection, confirm, restoreFailed, settled = () => {} }: {
  navigation: HistoryNavigation; target: Pick<Window, "addEventListener" | "removeEventListener">;
  protection: () => DraftProtection; confirm: (resume: () => Promise<void>) => void; restoreFailed: (retry: () => void) => void;
  settled?: () => void;
}) {
  let accepted = navigation.currentEntry, disposed = false, replay: string | undefined;
  let decisionVersion = 0;
  let restoring: { home: GuardedHistoryEntry; destination: GuardedHistoryEntry; attempts: number; pending: boolean } | undefined;
  const guarded = () => { const state = protection(); return state.dirty || state.busy; };
  const traverse = async (key: string) => { await navigation.traverseTo(key).finished; };
  function ask(destination: GuardedHistoryEntry) {
    if (disposed || protection().busy) return;
    const version = ++decisionVersion;
    confirm(async () => {
      if (disposed || version !== decisionVersion || protection().busy) throw new Error("NAVIGATION_UNAVAILABLE");
      replay = destination.key;
      try { await traverse(destination.key); }
      finally { if (replay === destination.key) replay = undefined; }
    });
  }
  async function restore() {
    const transaction = restoring;
    if (!transaction || transaction.pending || disposed) return;
    transaction.pending = true; transaction.attempts++;
    try { await traverse(transaction.home.key); }
    catch { /* A second browser action can interrupt the return traversal. */ }
    if (disposed || restoring !== transaction) return;
    transaction.pending = false;
    if (navigation.currentEntry?.key === transaction.home.key) {
      accepted = transaction.home; restoring = undefined; settled(); ask(transaction.destination);
    } else if (transaction.attempts < 3) void restore();
    else restoreFailed(() => { if (!disposed && restoring === transaction) { transaction.attempts = 0; void restore(); } });
  }
  const navigate = (raw: Event) => {
    const event = raw as Navigate, destination = event.destination;
    if (event.navigationType !== "traverse" || !destination?.sameDocument || !accepted) return;
    if (restoring && !guarded()) { restoring = undefined; accepted = navigation.currentEntry; return; }
    if (restoring && destination.key === restoring.home.key) return;
    if (replay === destination.key && !protection().busy) return;
    if (!guarded() || hashOnly(accepted, destination)) return;
    if (!event.cancelable) return; // popstate capture returns to the live editor.
    event.preventDefault();
    if (restoring) { decisionVersion++; restoring.destination = destination; }
    else ask(destination);
  };
  const changed = (raw: Event) => {
    // Traversal commits precede popstate; don't replace the editor's entry yet.
    const type = (raw as Event & { navigationType?: string }).navigationType;
    if (type === "push" || type === "replace") {
      if (!guarded()) restoring = undefined;
      if (!restoring) {
        const next = navigation.currentEntry, moved = next?.key !== accepted?.key || next?.url !== accepted?.url;
        accepted = next;
        if (moved) { decisionVersion++; settled(); }
      }
    }
  };
  const popped = (event: PopStateEvent) => {
    const entry = navigation.currentEntry;
    if (!entry || !accepted) return;
    if (restoring && !guarded()) { restoring = undefined; accepted = entry; settled(); return; }
    if (restoring) {
      event.stopImmediatePropagation();
      if (entry.key !== restoring.home.key) restoring.destination = entry;
      if (!restoring.pending) void restore();
      return;
    }
    if (replay === entry.key && !protection().busy) { accepted = entry; settled(); return; }
    if (entry.key === accepted.key) return;
    if (!guarded() || hashOnly(accepted, entry)) { accepted = entry; settled(); return; }
    event.stopImmediatePropagation();
    decisionVersion++;
    restoring = { home: accepted, destination: entry, attempts: 0, pending: false };
    void restore();
  };
  navigation.addEventListener("navigate", navigate);
  navigation.addEventListener("currententrychange", changed);
  target.addEventListener("popstate", popped, true);
  return () => {
    disposed = true; restoring = undefined; replay = undefined;
    navigation.removeEventListener("navigate", navigate);
    navigation.removeEventListener("currententrychange", changed);
    target.removeEventListener("popstate", popped, true);
  };
}
