import NotificationsPage from "@/features/notifications/components/notifications-page";
import { PageSuspense } from "@/components/shared/page-suspense";

export const metadata = { title: "Notifications · Club At Ibis Admin" };

export default function Page() {
  return (
    <PageSuspense>
      <NotificationsPage />
    </PageSuspense>
  );
}
