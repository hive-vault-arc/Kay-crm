"use client";
import { useEffect } from "react";
import { NotificationIcon } from "@/components/icons";
import { useQuery } from "@/features/contacts/use-query";
import { notificationsSchema } from "@/features/work/contracts";
import { notificationPageValid } from "@/features/work/notification-feed";

export function LiveNotificationIcon({ revision, descriptionId }: { revision: number; descriptionId: string }) {
  const { value, error, refreshQuietly } = useQuery("/api/v1/notifications?state=unread&page=1&page_size=1", notificationsSchema, revision);
  useEffect(() => {
    function refreshVisible() { if (document.visibilityState === "visible") refreshQuietly(); }
    // Also covers local installations where the live connection is disabled.
    const interval = window.setInterval(refreshVisible, 60_000);
    document.addEventListener("visibilitychange", refreshVisible);
    window.addEventListener("online", refreshVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshVisible);
      window.removeEventListener("online", refreshVisible);
    };
  }, [refreshQuietly]);
  const snapshot = value && !error && notificationPageValid(value, 1, 1, "unread") ? value : undefined;
  const count = snapshot?.unread_total ?? 0;
  const countLabel = count === 1 ? "1 notification non lue" : `${count} notifications non lues`;
  return <span className="kay-notification-bell">
    <NotificationIcon size={16} aria-hidden="true" />
    {count ? <span role="status" className="kay-notification-count" aria-label={countLabel}><span aria-hidden="true">{count > 99 ? "99+" : count}</span></span> : null}
    <span id={descriptionId} className="sr-only">{count ? countLabel : null}</span>
  </span>;
}
