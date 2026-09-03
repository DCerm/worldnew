"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { RiPlayFill, RiSearchLine } from "react-icons/ri";

import type { AuthUser } from "@/lib/auth";
import type { MediaCard } from "@/lib/data";
import {
  MediaCategoryShelves,
  MediaInfoDialog,
  MediaPoster,
} from "@/app/media/media-showcases";
import { SleekVideoPlayer } from "@/app/ui/media-player";
import { MEDIA_CATEGORIES, categoryHrefForSlug } from "@/lib/media-categories";

type Props = {
  user: AuthUser | null;
  media: MediaCard[];
  dashboardHref: string;
};

function TopSong({ item, index }: { item: MediaCard; index: number }) {
  return (
    <Link href={`/media/watch/${item.id}`} className="grid grid-cols-[24px_66px_1fr_40px] items-center gap-3 rounded-2xl p-2 transition hover:bg-[#fff0f7]">
      <span className="text-sm font-black text-stone-950">{index + 1}</span>
      <MediaPoster item={item} fit="object-cover" className="h-16 w-16 rounded-xl" />
      <span className="min-w-0">
        <strong className="block truncate text-sm font-black text-stone-950">{item.title}</strong>
        <span className="block text-xs text-stone-500">franke&apos;</span>
        <span className="block text-xs text-stone-500">0:{String(item.previewSeconds || 30).padStart(2, "0")}</span>
      </span>
      <span className="grid h-10 w-10 place-items-center rounded-full border border-stone-300 text-stone-950">
        <RiPlayFill />
      </span>
    </Link>
  );
}

export default function MediaExperience({ user, media, dashboardHref }: Props) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const featuredItem = useMemo(() => {
    return media.find((item) => item.isFeatured && item.mediaType === "video")
      ?? media.find((item) => item.mediaType === "video")
      ?? media[0]
      ?? null;
  }, [media]);

  const audioItems = media.filter((item) => item.mediaType === "audio");
  const selectedItem = selectedItemId ? media.find((item) => item.id === selectedItemId) ?? null : null;

  return (
    <main className="wn-media-page min-h-screen bg-white text-stone-950">
      <header className="sticky top-0 z-40 bg-[#F839A9] text-white shadow-[0_18px_45px_-32px_rgba(248,57,169,.9)]">
        <div className="mx-auto flex h-20 max-w-[1500px] items-center justify-between gap-5 px-5 lg:px-10">
          <nav className="hidden items-center gap-9 text-sm font-black lg:flex">
            <Link href="/media" className="border-b-2 border-white py-2 text-white">
              Home
            </Link>
            {MEDIA_CATEGORIES.map((category) => (
              <Link
                key={category.slug}
                href={categoryHrefForSlug(category.slug)}
                className="border-b-2 border-transparent py-2 text-white/90 transition hover:border-white hover:text-white"
              >
                {category.label}
              </Link>
            ))}
            <Link href="/community" className="border-b-2 border-transparent py-2 text-white/90 transition hover:border-white hover:text-white">
              Community
            </Link>
          </nav>

          <Link href="/media" className="text-2xl font-black uppercase tracking-[-0.06em] lg:hidden">
            World New
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 rounded-full border border-white/40 px-5 py-3 text-sm text-white/90 xl:flex">
              Search movies, music, videos, mixtapes...
              <RiSearchLine className="text-2xl" />
            </div>
            <Link href={user ? dashboardHref : "/login"} className="rounded-full border border-white/45 px-6 py-3 text-sm font-black">
              Dashboard
            </Link>
            <a href="https://worldnew.love" target="_blank" rel="noreferrer" className="hidden rounded-full border border-white/45 px-6 py-3 text-sm font-black sm:inline-flex">
              worldnew.love
            </a>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden p-0">
        {featuredItem?.mediaType === "video" && featuredItem.playbackUrl ? (
          <SleekVideoPlayer
            key={featuredItem.id}
            src={featuredItem.playbackUrl}
            poster={featuredItem.posterImageUrl ?? undefined}
            autoPlay
            muted
            loop
            videoClassName="object-cover"
            previewLimitSeconds={featuredItem.previewSeconds}
            previewStartSeconds={featuredItem.previewStartSeconds ?? 0}
            previewEndSeconds={featuredItem.previewEndSeconds ?? undefined}
            loopWithinPreview
            showControlsOverlay={false}
            showLoadingOverlay={false}
            className="h-[58vh] w-full rounded-none border-0 md:h-[68vh]"
          />
        ) : (
          <MediaPoster item={featuredItem} className="h-[58vh] w-full md:h-[68vh]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-[1500px] px-6 pb-10 text-white lg:px-10">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#F839A9]">Featured Now</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight md:text-5xl">
            {featuredItem?.title ?? "franke' - together (music video)"}
          </h1>
          <p className="mt-4 max-w-xl text-sm font-semibold text-white/90">
            {featuredItem?.description ?? "This is one of the first songs I ever wrote."}
          </p>
          <div className="mt-7 flex flex-wrap gap-4">
            <Link href={featuredItem ? `/media/watch/${featuredItem.id}` : "/media"} className="inline-flex items-center gap-2 rounded-full bg-[#F839A9] px-8 py-3 text-sm font-black text-white">
              <RiPlayFill /> Play
            </Link>
            {featuredItem ? (
              <button
                type="button"
                onClick={() => setSelectedItemId(featuredItem.id)}
                className="rounded-full border border-white px-8 py-3 text-sm font-black text-white"
              >
                View More Info
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1500px] gap-8 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-10">
        <div className="min-w-0">
          <MediaCategoryShelves media={media} user={user} onInfo={setSelectedItemId} />
        </div>

        <aside className="h-fit rounded-2xl border border-stone-100 bg-white p-6 shadow-[0_24px_65px_-44px_rgba(15,23,42,.75)] lg:sticky lg:top-28">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-black">Top Songs</h2>
            <Link href="/media/audio" className="text-sm font-black text-[#F839A9]">View all</Link>
          </div>
          <div className="space-y-3">
            {audioItems.slice(0, 6).map((item, index) => <TopSong key={item.id} item={item} index={index} />)}
            {audioItems.length === 0 ? <p className="text-sm text-stone-500">No songs published yet.</p> : null}
          </div>
          <Link href="/media/audio" className="mt-6 inline-flex items-center gap-2 text-sm font-black text-[#F839A9]">
            See full playlist <span>›</span>
          </Link>
        </aside>
      </section>

      <MediaInfoDialog item={selectedItem} onClose={() => setSelectedItemId(null)} />
    </main>
  );
}
