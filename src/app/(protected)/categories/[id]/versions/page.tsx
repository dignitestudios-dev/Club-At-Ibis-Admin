import CategoryVersionsPage from "@/features/categories/components/category-versions-page";
import { PageSuspense } from "@/components/shared/page-suspense";

export const metadata = { title: "Form Versions · Club At Ibis Admin" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageSuspense>
      <CategoryVersionsPage id={id} />
    </PageSuspense>
  );
}
