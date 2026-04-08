import { requireAdmin } from "@/lib/auth";
import { getCategories } from "@/lib/data";
import CategoriesManager from "./categories-manager";

export default async function CategoriesPage() {
  await requireAdmin();
  const categories = await getCategories();

  return (
    <main className="space-y-6 px-2 py-4 md:px-4 max-w-4xl mx-auto">
      <CategoriesManager categories={categories} />
    </main>
  );
}
