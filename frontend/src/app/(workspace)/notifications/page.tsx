import { NotificationPanel } from "@/features/work/notification-panel";
import { PageHeader } from "@/components/shared/page-header";

export default function NotificationsPage() {
  return <><PageHeader title="Notifications" description="Vos rappels et les mises à jour de vos dossiers." route="/notifications" /><div className="kay-surface kay-notification-workspace"><NotificationPanel /></div></>;
}
