// Combine caller cancellation with a bounded operation without requiring the
// newer AbortSignal.any API. Release listeners/timers after the body is consumed.
export function boundedRequestSignal(parent: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const fromParent = () => controller.abort(parent?.reason);
  if (parent?.aborted) fromParent(); else parent?.addEventListener("abort", fromParent, { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, release: () => { clearTimeout(timer); parent?.removeEventListener("abort", fromParent); } };
}
