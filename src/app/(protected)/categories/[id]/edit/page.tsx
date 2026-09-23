import type { Metadata } from "next";
import CategoryBuilder from "@/features/categories/components/category-builder";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Edit Category ${id ? `#${id.slice(0, 8)}` : ""} · Club At Ibis Admin`,
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CategoryBuilder categoryId={id} />;
}
