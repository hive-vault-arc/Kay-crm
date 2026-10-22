"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiGet } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { pushConfigSchema, pushResultSchema } from "./contracts";

export function PushControl() {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const subscriptionRef = useRef<PushSubscription | null>(null);
  const [key, setKey] = useState<string>();
  const [active, setActive] = useState(false), [busy, setBusy] = useState(false), [notice, setNotice] = useState("");
  useEffect(() => {
    let cancelled = false;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    void apiGet("/api/v1/realtime/push", pushConfigSchema).then(async config => {
      if (!config.enabled || !config.public_key || cancelled) return;
      await navigator.serviceWorker.register("/kay-push.js", { updateViaCache: "none" });
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (!cancelled) {
        registrationRef.current = registration; subscriptionRef.current = sub;
        setKey(config.public_key); setActive(config.subscribed && Boolean(sub));
      }
    }).catch(() => { if (!cancelled) setNotice("Les notifications système sont temporairement indisponibles."); });
    return () => { cancelled = true; };
  }, []);
  async function toggle() {
    const registration = registrationRef.current;
    if (!key || !registration) return;
    setBusy(true); setNotice("");
    try {
      let sub = subscriptionRef.current;
      if (active) {
        if (sub) {
          await apiCommand("/api/v1/realtime/push", { operation: "unsubscribe", endpoint: sub.endpoint }, pushResultSchema, crypto.randomUUID());
          await sub.unsubscribe();
        }
        subscriptionRef.current = null; setActive(false);
      } else {
        if (Notification.permission === "denied") { setNotice("Notifications non autorisées. Vous pouvez modifier ce choix dans les réglages du navigateur."); return; }
        const raw = atob(key.replace(/-/g, "+").replace(/_/g, "/"));
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true, applicationServerKey: Uint8Array.from(raw, char => char.charCodeAt(0)),
        });
        subscriptionRef.current = sub;
        await apiCommand("/api/v1/realtime/push", { operation: "subscribe", endpoint: sub.endpoint, ...sub.toJSON().keys }, pushResultSchema, crypto.randomUUID());
        setActive(true);
      }
    } catch { setNotice("Activation impossible. Vérifiez les autorisations du navigateur puis réessayez."); }
    finally { setBusy(false); }
  }
  if (!key) return notice ? <p role="status">{notice}</p> : null;
  return <div className="grid gap-2">
    <Button action="read" variant="outline" disabled={busy} onClick={() => void toggle()}>{active ? "Désactiver les notifications système" : "Activer les notifications système"}</Button>
    <p className="text-sm text-muted-foreground">Un message sans données client quand le CRM est fermé. Sur iPhone, ajoutez KAY à l’écran d’accueil. Les alertes s’arrêtent à la déconnexion.</p>
    {notice ? <p role="status">{notice}</p> : null}
  </div>;
}
