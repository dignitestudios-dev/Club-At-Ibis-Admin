import ResidentsPage from "@/features/residents/components/residents-page";
import { PageSuspense } from "@/components/shared/page-suspense";

export const metadata = { title: "Residents · Club At Ibis Admin" };

export default function Page() {
  return (
    <PageSuspense>
      <ResidentsPage />
    </PageSuspense>
  );
}
