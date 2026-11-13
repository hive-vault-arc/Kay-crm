import { NotificationPanel } from "@/features/work/notification-panel";
import { PageHeader } from "@/components/shared/page-header";

export default function NotificationsPage() {
  return <><PageHeader title="Notifications" description="Vos rappels de tâches et de visites." route="/notifications" /><div className="kay-surface kay-notification-workspace"><NotificationPanel /></div></>;
}
