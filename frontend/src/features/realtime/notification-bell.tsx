"use client";
import { NotificationIcon } from "@/components/icons";
import { useQuery } from "@/features/contacts/use-query";
import { notificationsSchema } from "@/features/work/contracts";

export function LiveNotificationIcon() {
  const { value } = useQuery("/api/v1/notifications?page=1&page_size=1", notificationsSchema);
  const count = value?.unread_total ?? 0;
  return <span className="relative inline-flex">
    <NotificationIcon aria-hidden="true" />
    {count ? <span role="status" className="absolute -right-2 -top-2 rounded-full bg-primary px-1 text-xs text-primary-foreground" aria-label={`${count} notifications non lues`}>{count > 99 ? "99+" : count}</span> : null}
  </span>;
}
