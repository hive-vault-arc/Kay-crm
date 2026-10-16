"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiGet, ApiError } from "@/lib/api/client";
import { userSchema, type StaffUser } from "./contracts";
import { UserForm } from "./user-form";
import { UserActions } from "./user-actions";

export function UserEditor({ id, actorId }: { id: string; actorId: string }) {
  const [user, setUser] = useState<StaffUser>();
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    apiGet(`/api/v1/users/${id}`, userSchema, controller.signal).then(setUser).catch((reason) => {
      if (!controller.signal.aborted) setError(reason instanceof ApiError ? reason.message : "Le compte n’a pas pu être chargé.");
    });
    return () => controller.abort();
  }, [id, retry]);
  if (error) return <div className="grid gap-4"><p role="alert" className="text-danger">{error}</p><Button variant="outline" onClick={() => { setError(""); setRetry(retry + 1); }}>Réessayer</Button><Link className="py-3 text-link underline" href="/settings/users">Tous les utilisateurs</Link></div>;
  if (!user) return <p role="status">Chargement du compte…</p>;
  return <div className="grid gap-8"><UserForm user={user} actorId={actorId} changed={setUser} /><UserActions user={user} actorId={actorId} changed={setUser} /></div>;
}
