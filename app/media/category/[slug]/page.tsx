import Link from "next/link";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";

import {
  CategoryGrid,
} from "@/app/media/media-showcases";
import { getCurrentUser } from "@/lib/auth";
import { getMediaLibrary } from "@/lib/data";
import {
  MEDIA_CATEGORIES,
  categoryHrefForSlug,
  categoryLabelForSlug,
  mediaForCategory,
} from "@/lib/media-categories";

const PAGE_SIZE = 50;

export const dynamic = "force-dynamic";

export default async function MediaCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const normalizedSlug = slug === "mixtabes" ? "mixtapes" : slug;

  if (normalizedSlug !== slug) {
    redirect(`/media/category/${normalizedSlug}`);
  }

  if (normalizedSlug === "music") {
    redirect("/media/audio");
  }

  const isKnownCategory = MEDIA_CATEGORIES.some((category) => category.slug === normalizedSlug);

  if (!isKnownCategory) {
    notFound();
  }

  const [user, media] = await Promise.all([getCurrentUser(), getMediaLibrary()]);
  const categoryMedia = mediaForCategory(media, normalizedSlug);
  const totalPages = Math.max(1, Math.ceil(categoryMedia.length / PAGE_SIZE));
  const requestedPage = Number.parseInt(resolvedSearchParams.page ?? "1", 10);
  const currentPage = Math.min(Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1), totalPages);
  const pageItems = categoryMedia.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const categoryName = categoryMedia[0]?.categoryName ?? categoryLabelForSlug(normalizedSlug);

  return (
    <main className="min-h-screen bg-white text-stone-950">
      <header className="sticky top-0 z-40 bg-[#F839A9] text-white shadow-[0_18px_45px_-32px_rgba(248,57,169,.9)]">
        <div className="mx-auto flex h-20 max-w-[1500px] items-center justify-between gap-5 px-5 lg:px-10">
          <Link href="/media" className="text-2xl font-black uppercase tracking-[-0.06em]">
            World New
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-black lg:flex">
            <Link href="/media" className="border-b-2 border-transparent py-2 text-white/90 transition hover:border-white hover:text-white">
              Home
            </Link>
            {MEDIA_CATEGORIES.map((category) => (
              <Link
                key={category.slug}
                href={categoryHrefForSlug(category.slug)}
                className={`border-b-2 py-2 transition ${category.slug === normalizedSlug ? "border-white text-white" : "border-transparent text-white/90 hover:border-white hover:text-white"}`}
              >
                {category.label}
              </Link>
            ))}
            <Link href="/community" className="border-b-2 border-transparent py-2 text-white/90 transition hover:border-white hover:text-white">
              Community
            </Link>
          </nav>
          <Link href={user ? "/dashboard?tab=home" : "/login"} className="rounded-full border border-white/45 px-6 py-3 text-sm font-black">
            {user ? "Library" : "Sign in"}
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-[1500px] px-5 py-10 lg:px-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/media" className="text-sm font-black text-[#F839A9]">
              &larr; Back to media
            </Link>
            <p className="mt-8 text-xs font-black uppercase tracking-[0.28em] text-[#F839A9]">Media Category</p>
            <h1 className="mt-2 text-4xl font-black md:text-5xl">{categoryName}</h1>
            <p className="mt-3 text-sm font-semibold text-stone-500">
              {categoryMedia.length} {categoryMedia.length === 1 ? "item" : "items"} published in this category.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/media/category/${normalizedSlug}?page=${Math.max(1, currentPage - 1)}`}
              aria-disabled={currentPage <= 1}
              className={`rounded-full border px-5 py-2 text-sm font-black ${currentPage <= 1 ? "pointer-events-none border-stone-200 text-stone-300" : "border-[#ffd1e9] text-[#F839A9]"}`}
            >
              Previous
            </Link>
            <Link
              href={`/media/category/${normalizedSlug}?page=${Math.min(totalPages, currentPage + 1)}`}
              aria-disabled={currentPage >= totalPages}
              className={`rounded-full border px-5 py-2 text-sm font-black ${currentPage >= totalPages ? "pointer-events-none border-stone-200 text-stone-300" : "border-[#ffd1e9] text-[#F839A9]"}`}
            >
              Next
            </Link>
          </div>
        </div>

        {pageItems.length > 0 ? (
          <CategoryGrid items={pageItems} user={user} />
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-[#ffd1e9] bg-[#fff8fc] p-8 text-sm font-semibold text-stone-500">
            No media has been published in this category yet.
          </div>
        )}

        {totalPages > 1 ? (
          <div className="mt-8 flex items-center justify-center gap-2">
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <Link
                key={pageNumber}
                href={`/media/category/${normalizedSlug}?page=${pageNumber}`}
                className={`grid h-10 w-10 place-items-center rounded-full text-sm font-black ${pageNumber === currentPage ? "bg-[#F839A9] text-white" : "bg-[#fff0f7] text-[#F839A9]"}`}
              >
                {pageNumber}
              </Link>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
