import ReviewerDetailPage from "@/features/reviewers/components/reviewer-detail-page";

export const metadata = { title: "Reviewer · Club At Ibis Admin" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReviewerDetailPage id={id} />;
}
