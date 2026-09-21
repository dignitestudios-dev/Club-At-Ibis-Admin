import RequestDetailPage from "@/features/requests/components/request-detail-page";

export const metadata = { title: "Request · Club At Ibis Admin" };

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RequestDetailPage id={id} />;
}
