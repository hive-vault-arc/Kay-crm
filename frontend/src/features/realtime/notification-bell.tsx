"use client";
import { NotificationIcon } from "@/components/icons";
import { useQuery } from "@/features/contacts/use-query";
import { notificationsSchema } from "@/features/work/contracts";
import { notificationPageValid } from "@/features/work/notification-feed";

export function LiveNotificationIcon() {
  const { value, error } = useQuery("/api/v1/notifications?page=1&page_size=1", notificationsSchema);
  const count = value && !error && notificationPageValid(value, 1, 1, "all") ? value.unread_total : 0;
  return <span className="kay-notification-bell">
    <NotificationIcon aria-hidden="true" />
    {count ? <span role="status" className="kay-notification-dot" aria-label={`${count} notifications non lues`}><span className="sr-only">{count} notifications non lues</span></span> : null}
  </span>;
}
