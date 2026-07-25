import { requireAdmin } from "@/lib/auth";
import { getWordPressMusicProductsForAdmin } from "@/lib/wordpress";

import MusicCatalogManager from "./MusicCatalogManager";

export const dynamic = "force-dynamic";

export default async function AdminMusicPage() {
  await requireAdmin();
  const products = await getWordPressMusicProductsForAdmin();

  return (
    <main className="mx-auto w-full max-w-7xl px-2 py-6 md:px-4">
      <MusicCatalogManager products={products} />
    </main>
  );
}
