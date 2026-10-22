type Listener = (topics?: string[]) => void;
const listeners = new Set<Listener>();

function dispatch(event: Event) {
  const topics = (event as CustomEvent<string[] | undefined>).detail;
  for (const listener of listeners) listener(topics);
}

export function subscribeLive(listener: Listener) {
  if (!listeners.size) window.addEventListener("kay:live-invalidate", dispatch);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) window.removeEventListener("kay:live-invalidate", dispatch);
  };
}
