import AssignmentsPage from "@/features/requests/components/assignments-page";
import { PageSuspense } from "@/components/shared/page-suspense";

export const metadata = { title: "Assignments · Club At Ibis Admin" };

export default function Page() {
  return (
    <PageSuspense>
      <AssignmentsPage />
    </PageSuspense>
  );
}
