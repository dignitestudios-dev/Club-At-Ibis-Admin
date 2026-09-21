import ReviewersPage from "@/features/reviewers/components/reviewers-page";
import { PageSuspense } from "@/components/shared/page-suspense";

export const metadata = { title: "Reviewers · Club At Ibis Admin" };

export default function Page() {
  return (
    <PageSuspense>
      <ReviewersPage />
    </PageSuspense>
  );
}
