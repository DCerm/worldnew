import Link from "next/link";
import { notFound } from "next/navigation";

import { canAccessMedia, getMediaLibrary, getVisibilityLabel } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";

export default async function MediaCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [user, media] = await Promise.all([getCurrentUser(), getMediaLibrary()]);

  const categoryMedia = media.filter((item) => {
    if (item.mediaType !== "video") {
      return false;
    }

    if (slug === "uncategorized") {
      return !item.categorySlug;
    }

    return item.categorySlug === slug;
  });

  if (categoryMedia.length === 0) {
    notFound();
  }

  const categoryName = categoryMedia[0].categoryName ?? "Category";
  const dashboardHref =
    user && (user.roles.includes("artist_admin") || user.roles.includes("super_admin"))
      ? "/admin"
      : "/dashboard";

  return (
    <main className="min-h-screen bg-black text-white flex flex-col justify-between">
        <div>
      <header className="sticky top-0 z-40 border-b border-stone-800 bg-stone-950/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 lg:px-0 py-4">
          <Link href="/" className="text-md font-semibold uppercase tracking-[0.28em] text-[#0091ff]">
            World. New.
          </Link>
          <nav className="flex items-center gap-4 text-md text-stone-300">
            <Link href="/about" className="hidden lg:block hover:text-white">
              About
            </Link>
            <Link href="/privacy-policy" className="hidden lg:block hover:text-white">
              Privacy
            </Link>
            <Link href="/terms-and-conditions" className="hidden lg:block hover:text-white">
              Terms
            </Link>
            <Link
              href={user ? dashboardHref : "/login"}
              className="rounded-full border border-stone-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] hover:border-[#0091ff]"
            >
              {user ? "Dashboard" : "Sign in"}
            </Link>
          </nav>
        </div>
      </header>

      <section className="px-4 py-8 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Video Category</p>
              <h1 className="mt-2 text-4xl font-semibold">{categoryName}</h1>
            </div>
            <Link href="/media" className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold">
              Back to media
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {categoryMedia.map((item) => {
              const allowed = canAccessMedia(user, item);
              return (
                <article key={item.id} className="overflow-hidden rounded-2xl border border-white/10 bg-stone-950">
                  <div className="h-52 bg-gradient-to-br from-[#0091ff]/20 via-stone-900 to-black p-4">
                    <div className="flex h-full flex-col justify-between rounded-xl border border-white/10 bg-black/30 p-4">
                      <span className="text-xs uppercase tracking-[0.2em] text-stone-300">{item.mediaType}</span>
                      <h2 className="text-2xl font-semibold">{item.title}</h2>
                    </div>
                  </div>
                  <div className="space-y-3 p-4">
                    <p className="text-sm text-stone-300">{item.description ?? "No description yet."}</p>
                    <div className="flex items-center justify-between">
                      <span className="rounded-full border border-white/20 px-3 py-1 text-xs text-stone-300">
                        {getVisibilityLabel(item.visibility)}
                      </span>
                      <Link href={`/media/watch/${item.id}`} className="rounded-full bg-[#0091ff] px-4 py-2 text-xs font-semibold">
                        Play
                      </Link>
                    </div>
                    {!allowed && (
                      <p className="text-xs text-stone-400">Locked until your membership has access.</p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
      </div>

      <footer className="border-t border-stone-800 bg-stone-950">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-4 px-6 py-8 text-sm text-stone-400 lg:flex-row lg:items-center">
          <p>© {new Date().getFullYear()} World New Community</p>
          <div className="flex items-center gap-4">
            <Link href="/about" className="hover:text-white">
              About
            </Link>
            <Link href="/privacy-policy" className="hover:text-white">
              Privacy Policy
            </Link>
            <Link href="/terms-and-conditions" className="hover:text-white">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
