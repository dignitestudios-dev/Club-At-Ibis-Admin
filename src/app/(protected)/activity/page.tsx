import ActivityPage from "@/features/activity/components/activity-page";
import { PageSuspense } from "@/components/shared/page-suspense";

export const metadata = { title: "Activity Log · Club At Ibis Admin" };

export default function Page() {
  return (
    <PageSuspense>
      <ActivityPage />
    </PageSuspense>
  );
}
