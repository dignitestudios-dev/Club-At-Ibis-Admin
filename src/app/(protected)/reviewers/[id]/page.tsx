import type { Metadata } from "next";
import ReviewerDetailPage from "@/features/reviewers/components/reviewer-detail-page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Reviewer ${id ? `#${id.slice(0, 8)}` : ""} · Club At Ibis Admin`,
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReviewerDetailPage id={id} />;
}
