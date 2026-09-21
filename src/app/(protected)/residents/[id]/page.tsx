import ResidentDetailPage from "@/features/residents/components/resident-detail-page";
import { PageSuspense } from "@/components/shared/page-suspense";

export const metadata = { title: "Resident · Club At Ibis Admin" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageSuspense>
      <ResidentDetailPage id={id} />
    </PageSuspense>
  );
}
