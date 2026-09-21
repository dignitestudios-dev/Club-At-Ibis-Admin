import CategoriesPage from "@/features/categories/components/categories-page";
import { PageSuspense } from "@/components/shared/page-suspense";

export const metadata = { title: "Categories & Forms · Club At Ibis Admin" };

export default function Page() {
  return (
    <PageSuspense>
      <CategoriesPage />
    </PageSuspense>
  );
}
