import type { Metadata } from "next";
import ResidentDetailPage from "@/features/residents/components/resident-detail-page";
import { PageSuspense } from "@/components/shared/page-suspense";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Resident ${id ? `#${id.slice(0, 8)}` : ""} · Club At Ibis Admin`,
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageSuspense>
      <ResidentDetailPage id={id} />
    </PageSuspense>
  );
}
