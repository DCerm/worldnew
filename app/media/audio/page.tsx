import Link from "next/link";

import { getCurrentUser } from "@/lib/auth";
import { canAccessMedia, getMediaLibrary } from "@/lib/data";
import { SleekAudioPlayer } from "@/app/ui/media-player";
import { getWordPressMusicCatalog } from "@/lib/wordpress";
import { WordNewMusicTracklist } from "@/app/media/audio/WordNewMusicTracklist";

export const dynamic = "force-dynamic";

export default async function AudioExperiencePage() {
  const [user, media, wpTracks] = await Promise.all([
    getCurrentUser(),
    getMediaLibrary(),
    getWordPressMusicCatalog({ limit: 250 }),
  ]);
  const audioItems = media.filter((item) => item.mediaType === "audio");
  const dashboardHref =
    user && (user.roles.includes("artist_admin") || user.roles.includes("super_admin"))
      ? "/admin"
      : "/dashboard";

  const groupedByCategory = audioItems.reduce<Record<string, typeof audioItems>>((acc, item) => {
    const key = item.categoryName ?? "Featured Audio";
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0a1324] via-[#0f1d37] to-[#05070b] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#05070b]/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-2 py-2 lg:px-8">
          <Link href="/media" className="rounded-full border border-white/30 px-2 py-1 lg:px-4 lg:py-2 text-sm font-semibold">
            <span className="hidden lg:inline
            ">Back to </span>Media
          </Link>
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-[0.3em] text-[#F839A9]">World New Music</p>
            <h1 className="text-lg font-semibold sm:text-xl hidden lg:block">Listen Now</h1>
          </div>
          <Link
            href={user ? dashboardHref : "/login"}
            className="rounded-full border border-white/30 px-2 py-1 lg:px-4 lg:py-2 text-sm font-semibold"
          >
            {user ? "Dashboard" : "Sign in"}
          </Link>
        </div>
      </header>

      <section className="mx-auto w-full max-w-7xl px-4 py-8 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-r from-[#F839A9]/35 via-[#F839A9]/20 to-transparent p-4 lg:p-6 shadow-[0_25px_55px_-35px_rgba(248,57,169,0.75)]">
          <div className="absolute -right-12 -top-16 h-52 w-52 rounded-full bg-[#F839A9]/25 blur-3xl" />
          <div className="relative z-10 max-w-2xl space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-[#F839A9]">World New Music</p>
            <h2 className="text-2xl font-semibold sm:text-4xl">Every World New audio drop in one clean listening experience.</h2>
            <p className="text-sm text-stone-200 sm:text-base">
              Browse by category, play exclusive content, and keep the focus on sound.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl space-y-8 px-4 pb-12 lg:px-8">
        {Object.entries(groupedByCategory).map(([categoryName, items]) => (
          <div key={categoryName} className="space-y-4">
            <div className="flex items-end justify-between gap-3">
              <h3 className="text-lg font-semibold md:text-xl sm:text-2xl">{categoryName}</h3>
              <span className="text-xs uppercase tracking-[0.2em] text-stone-300">{items.length} tracks</span>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <article key={item.id} className="overflow-hidden rounded-2xl border border-white/10 bg-black/35 p-3 shadow-sm">
                  <div className="mb-3 flex h-44 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black">
                    {item.posterImageUrl ? (
                      <img
                        src={item.posterImageUrl}
                        alt={`${item.title} poster`}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-[#F839A9]/30 via-[#1e293b] to-black" />
                    )}
                  </div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-stone-300">
                    {item.categoryName ?? "General"}
                  </p>
                  <h4 className="mt-1 text-base font-semibold">{item.title}</h4>
                  <p className="mt-2 text-sm text-stone-300">
                    {item.description ?? "Exclusive World New audio release."}
                  </p>
                  <div className="mt-4">
                    {canAccessMedia(user, item) && item.playbackUrl ? (
                      <SleekAudioPlayer
                        src={item.playbackUrl}
                        previewLimitSeconds={item.previewSeconds}
                      />
                    ) : (
                      <div className="rounded-xl border border-dashed border-white/25 bg-black/40 px-4 py-4 text-sm text-stone-300">
                        This track is locked for your current membership.
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}

        {audioItems.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/25 bg-black/30 p-6 text-sm text-stone-300">
            No audio files have been published yet.
          </div>
        )}

        <div className="space-y-4 pt-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#F839A9]">Shop Tracks</p>
              <h3 className="mt-1 text-lg lg:text-2xl font-semibold">Shop and preview the full catalog</h3>
            </div>
            <a
              href="https://worldnew.love"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:border-[#F839A9] w-fit"
            >
              Go to store
            </a>
          </div>

          {wpTracks.length > 0 ? (
            <WordNewMusicTracklist tracks={wpTracks} />
          ) : (
            <div className="rounded-[1.6rem] border border-white/10 bg-black/35 p-5 text-sm text-stone-300">
              No WordPress music catalog is available right now.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
