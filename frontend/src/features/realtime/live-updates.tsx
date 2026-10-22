"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { requestTicket } from "./ticket-request";

export function LiveUpdates() {
  const [status, setStatus] = useState("disabled");
  const pathname = usePathname();
  const route = useMemo(() => ({ pathname }), [pathname]);
  const [pendingRoute, setPendingRoute] = useState<typeof route>();
  const pending = pendingRoute === route;
  useEffect(() => {
    let stopped = false, socket: WebSocket | undefined, reconnect: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0, lastMessage = Date.now(), enabled = false;
    function invalidate(topics?: string[]) {
      if (!enabled) return;
      if (topics?.length && document.querySelector("[data-live-dirty]")) window.dispatchEvent(new Event("kay:live-deferred"));
      window.dispatchEvent(new CustomEvent("kay:live-invalidate", { detail: topics }));
    }
    async function connect() {
      if (stopped) return;
      try {
        const result = await requestTicket(crypto.randomUUID());
        if (stopped) return;
        if (!result.enabled) {
          enabled = false; setStatus("disabled");
          delete document.documentElement.dataset.liveRefresh;
          return;
        }
        enabled = true;
        setStatus("connecting");
        socket = new WebSocket(result.ws_url);
        socket.onopen = () => socket?.send(JSON.stringify({ ticket: result.ticket }));
        socket.onmessage = event => {
          lastMessage = Date.now();
          if (typeof event.data !== "string" || event.data.length > 2048) { socket?.close(); return; }
          try {
            const message = JSON.parse(event.data);
            if (message.type === "ready") {
              attempt = 0; setStatus("connected");
              if (process.env.NEXT_PUBLIC_KAY_REALTIME_RELEASED === "1") document.documentElement.dataset.liveRefresh = "automatic";
              invalidate();
            }
            if (message.type === "invalidate" && Array.isArray(message.topics)) invalidate(message.topics);
            if (message.type === "ping") socket?.send(JSON.stringify({ type: "pong", visible: document.visibilityState === "visible" }));
          } catch { socket?.close(); }
        };
        socket.onclose = () => retry();
        socket.onerror = () => socket?.close();
      } catch { retry(); }
    }
    function retry() {
      if (stopped) return;
      delete document.documentElement.dataset.liveRefresh;
      setStatus("offline");
      clearTimeout(reconnect);
      reconnect = setTimeout(() => void connect(), Math.min(30_000, 1000 * 2 ** Math.min(attempt++, 5)) + Math.random() * 1000);
    }
    function focused() { if (document.visibilityState === "visible") invalidate(); }
    function dirty(event: Event) {
      const form = event.target instanceof Element ? event.target.closest<HTMLElement>("form, [role=dialog], [role=alertdialog]") : null;
      if (form?.querySelector('[data-action="filter"], [data-action="search"]')) return;
      if (form) form.dataset.liveDirty = "true";
    }
    function saved() { invalidate(); }
    void connect();
    const safety = setInterval(focused, 120_000 + Math.random() * 30_000);
    const watchdog = setInterval(() => {
      if (socket?.readyState === WebSocket.OPEN && Date.now() - lastMessage > 60_000) socket.close();
    }, 20_000);
    window.addEventListener("focus", focused);
    window.addEventListener("online", focused);
    document.addEventListener("visibilitychange", focused);
    document.addEventListener("input", dirty);
    document.addEventListener("change", dirty);
    window.addEventListener("kay:command-saved", saved);
    return () => {
      stopped = true; clearTimeout(reconnect); clearInterval(safety); clearInterval(watchdog); socket?.close();
      delete document.documentElement.dataset.liveRefresh;
      window.removeEventListener("focus", focused); window.removeEventListener("online", focused);
      document.removeEventListener("visibilitychange", focused);
      document.removeEventListener("input", dirty); document.removeEventListener("change", dirty);
      window.removeEventListener("kay:command-saved", saved);
    };
  }, []);
  useEffect(() => {
    const deferred = () => setPendingRoute(route);
    const saved = () => setPendingRoute(document.querySelector("[data-live-dirty]") ? route : undefined);
    window.addEventListener("kay:live-deferred", deferred); window.addEventListener("kay:command-saved", saved);
    return () => {
      window.removeEventListener("kay:live-deferred", deferred); window.removeEventListener("kay:command-saved", saved);
    };
  }, [route]);
  if (status === "disabled") return null;
  const quiet = !pending && status !== "offline";
  return <div data-realtime-status={status} className={quiet ? "sr-only" : "text-sm text-muted-foreground"} role="status">
    {quiet ? status === "connected" ? "Synchronisation active." : "Connexion de la synchronisation…" : null}
    {status === "offline" ? "Connexion interrompue. Reconnexion automatique…" : null}
    {pending ? "Des données ont changé. Votre saisie est conservée pendant la modification." : null}
  </div>;
}
