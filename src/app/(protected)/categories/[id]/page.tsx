import type { Metadata } from "next";
import CategoryViewPage from "@/features/categories/components/category-view-page";
import { PageSuspense } from "@/components/shared/page-suspense";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `View Category ${id ? `#${id.slice(0, 8)}` : ""} · Club At Ibis Admin`,
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageSuspense>
      <CategoryViewPage id={id} />
    </PageSuspense>
  );
}
