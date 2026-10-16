"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost, ApiError } from "@/lib/api/client";
import { meSchema, safeReturnPath } from "@/lib/auth/contracts";
import { useHydrated } from "@/hooks/use-hydrated";

// A read denied after revocation must not replace an intentional logout redirect.
let logoutPending = false;

function expiredRedirect() {
  if (logoutPending) return;
  window.location.replace(`/login?return_to=${encodeURIComponent(safeReturnPath(window.location.pathname))}`);
}

export function SessionMonitor({ expiresAt, restricted = false }: { expiresAt: string; restricted?: boolean }) {
  useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    const controller = new AbortController();
    async function check() {
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        const profile = await apiGet("/api/v1/auth/me", meSchema, controller.signal);
        if (!cancelled && profile.must_change_password && !restricted) window.location.replace("/change-password");
      } catch { /* apiGet dispatches expiry; an outage must not pretend to revoke the cookie. */ }
      finally { inFlight = false; }
    }
    function visible() { if (document.visibilityState === "visible") void check(); }
    function restored(event: PageTransitionEvent) { if (event.persisted) visible(); }
    const timer = setTimeout(expiredRedirect, Math.max(0, Date.parse(expiresAt) - Date.now()));
    const interval = setInterval(visible, 60_000);
    window.addEventListener("kay:session-expired", expiredRedirect);
    window.addEventListener("focus", visible);
    window.addEventListener("pageshow", restored);
    document.addEventListener("visibilitychange", visible);
    return () => {
      cancelled = true; controller.abort(); clearTimeout(timer); clearInterval(interval);
      window.removeEventListener("kay:session-expired", expiredRedirect);
      window.removeEventListener("focus", visible);
      window.removeEventListener("pageshow", restored);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [expiresAt, restricted]);
  return null;
}

export function LogoutButton() {
  const hydrated = useHydrated();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function signOut() {
    logoutPending = true;
    setPending(true); setError("");
    try {
      const profile = await apiGet("/api/v1/auth/me", meSchema);
      await apiPost("/api/v1/auth/logout", {}, z.object({ signed_out: z.literal(true) }), profile.csrf_token);
      window.location.replace("/login?signed_out=1");
    } catch (reason) {
      logoutPending = false;
      if (reason instanceof ApiError && reason.code === "UNAUTHENTICATED") expiredRedirect();
      else setError(reason instanceof ApiError ? reason.message : "La déconnexion a échoué. Réessayez.");
      setPending(false);
    }
  }
  return <div className="grid gap-2">
    <Button variant="outline" onClick={signOut} disabled={!hydrated || pending}>{pending ? "Déconnexion en cours…" : "Se déconnecter"}</Button>
    {error ? <p role="alert" className="max-w-reading text-sm text-danger">{error}</p> : null}
  </div>;
}
