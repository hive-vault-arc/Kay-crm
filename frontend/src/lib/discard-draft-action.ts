// A failed navigation must not leave the still-mounted editor unprotected.
export function discardDraftAction(run: () => void | Promise<void>, dirty: HTMLElement[], cleared: () => void) {
  dirty.forEach(node => { delete node.dataset.liveDirty; });
  const restore = () => { dirty.forEach(node => { if (node.isConnected) node.dataset.liveDirty = "true"; }); };
  try {
    const result = run();
    if (result && typeof result.then === "function") void Promise.resolve(result).then(cleared).catch(restore);
    else cleared();
  } catch { restore(); }
}
