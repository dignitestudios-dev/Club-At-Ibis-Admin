import RequestsListPage from "@/features/requests/components/requests-list-page";
import { PageSuspense } from "@/components/shared/page-suspense";

export const metadata = { title: "All Requests · Club At Ibis Admin" };

export default function RequestsPage() {
  return (
    <PageSuspense>
      <RequestsListPage />
    </PageSuspense>
  );
}
