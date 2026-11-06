import { requireAdmin } from "@/lib/auth";
import { getMusicSidebarHeading } from "@/lib/data";
import { getWordPressMusicProductsForAdmin } from "@/lib/wordpress";

import MusicCatalogManager from "./MusicCatalogManager";

export const dynamic = "force-dynamic";

export default async function AdminMusicPage() {
  await requireAdmin();
  const [products, musicSidebarHeading] = await Promise.all([
    getWordPressMusicProductsForAdmin(),
    getMusicSidebarHeading(),
  ]);

  return (
    <main className="mx-auto w-full max-w-7xl px-2 py-6 md:px-4">
      <MusicCatalogManager products={products} musicSidebarHeading={musicSidebarHeading} />
    </main>
  );
}
