import type { Metadata } from "next";
import CategoryActivityPage from "@/features/categories/components/category-activity-page";
import { PageSuspense } from "@/components/shared/page-suspense";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Category Activity ${id ? `#${id.slice(0, 8)}` : ""} · Club At Ibis Admin`,
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageSuspense>
      <CategoryActivityPage id={id} />
    </PageSuspense>
  );
}
