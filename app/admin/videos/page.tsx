import { requireAdmin } from "@/lib/auth";
import { getCategories, getMediaLibrary, getMembershipPlans } from "@/lib/data";
import MediaColumns from "./media-columns";

export default async function VideosPage() {
  await requireAdmin();
  const [categories, mediaItems, plans] = await Promise.all([
    getCategories(),
    getMediaLibrary(),
    getMembershipPlans(),
  ]);

  return (
    <main className="space-y-6 px-2 py-4 md:px-4 max-w-4xl mx-auto">
      <MediaColumns mediaItems={mediaItems} categories={categories} plans={plans} />
    </main>
  );
}
