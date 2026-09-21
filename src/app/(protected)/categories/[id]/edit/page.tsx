import CategoryBuilder from "@/features/categories/components/category-builder";

export const metadata = { title: "Edit Category · Club At Ibis Admin" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CategoryBuilder categoryId={id} />;
}
