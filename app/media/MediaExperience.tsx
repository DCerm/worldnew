"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FaHeart } from "react-icons/fa";
import { RiCloseLine, RiPauseFill, RiPlayFill, RiSearchLine } from "react-icons/ri";

import type { AuthUser } from "@/lib/auth";
import type { MediaCard } from "@/lib/data";
import {
  MediaCategoryShelves,
  MediaInfoDialog,
  MediaPoster,
} from "@/app/media/media-showcases";
import { SleekAudioPlayer, SleekVideoPlayer } from "@/app/ui/media-player";
import { MEDIA_CATEGORIES, categoryHrefForSlug } from "@/lib/media-categories";

type Props = {
  user: AuthUser | null;
  media: MediaCard[];
  dashboardHref: string;
};

function TopSong({
  item,
  index,
  isActive,
  onPlay,
}: {
  item: MediaCard;
  index: number;
  isActive: boolean;
  onPlay: (item: MediaCard) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPlay(item)}
      className="grid w-full grid-cols-[24px_66px_1fr_40px] items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-[#fff0f7]"
    >
      <span className="text-sm font-black text-stone-950">{index + 1}</span>
      <MediaPoster item={item} fit="object-cover" className="h-16 w-16 rounded-xl" />
      <span className="min-w-0">
        <strong className="block truncate text-sm font-black text-stone-950">{item.title}</strong>
        <span className="block text-xs text-stone-500">franke&apos;</span>
        <span className="block text-xs text-stone-500">0:{String(item.previewSeconds || 30).padStart(2, "0")}</span>
      </span>
      <span className="grid h-10 w-10 place-items-center rounded-full border border-stone-300 text-stone-950">
        {isActive ? <RiPauseFill /> : <RiPlayFill />}
      </span>
    </button>
  );
}

function canOpenAudioPlayer(user: AuthUser | null, item: MediaCard) {
  if (item.visibility === "public") return true;
  if (!user) return false;
  if (user.roles.includes("artist_admin") || user.roles.includes("super_admin")) return true;
  if (item.communityPlaybackMode === "members_full") return true;
  if (item.visibility === "community") return true;
  if (item.visibility === "paid") return Boolean(user.activePlanCode);
  if (item.visibility === "plan_specific") {
    return Boolean(user.activePlanCode && item.planCodes.includes(user.activePlanCode));
  }
  return false;
}

export default function MediaExperience({ user, media, dashboardHref }: Props) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [activeAudio, setActiveAudio] = useState<MediaCard | null>(null);
  const [audioPlayerOpen, setAudioPlayerOpen] = useState(false);

  const featuredItem = useMemo(() => {
    return media.find((item) => item.isFeatured && item.mediaType === "video")
      ?? media.find((item) => item.mediaType === "video")
      ?? media[0]
      ?? null;
  }, [media]);

  const audioItems = media.filter((item) => item.mediaType === "audio");
  const selectedItem = selectedItemId ? media.find((item) => item.id === selectedItemId) ?? null : null;
  const audioIsLocked = activeAudio ? !canOpenAudioPlayer(user, activeAudio) : false;
  const shouldLimitAudioToPreview = Boolean(
    activeAudio &&
      (activeAudio.communityPlaybackMode === "preview" ||
        (activeAudio.communityPlaybackMode === "members_full" && !user?.activePlanCode))
  );
  const activeAudioSource = activeAudio
    ? shouldLimitAudioToPreview
      ? activeAudio.playbackUrl
      : activeAudio.fullPlaybackUrl ?? activeAudio.playbackUrl
    : null;
  const activeAudioIndex = activeAudio ? audioItems.findIndex((item) => item.id === activeAudio.id) : -1;

  const selectAudioAt = (index: number) => {
    const item = audioItems[index];
    if (!item) return;
    setActiveAudio(item);
    setAudioPlayerOpen(true);
  };

  const handleTopSongPlay = (item: MediaCard) => {
    setActiveAudio(item);
    setAudioPlayerOpen(true);
  };

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
            {audioItems.slice(0, 6).map((item, index) => (
              <TopSong
                key={item.id}
                item={item}
                index={index}
                isActive={audioPlayerOpen && activeAudio?.id === item.id}
                onPlay={handleTopSongPlay}
              />
            ))}
            {audioItems.length === 0 ? <p className="text-sm text-stone-500">No songs published yet.</p> : null}
          </div>
          <Link href="/media/audio" className="mt-6 inline-flex items-center gap-2 text-sm font-black text-[#F839A9]">
            See full playlist <span>›</span>
          </Link>
        </aside>
      </section>

      <MediaInfoDialog item={selectedItem} onClose={() => setSelectedItemId(null)} />

      {activeAudio && audioPlayerOpen ? (
        <section className="fixed inset-x-3 bottom-3 z-50 sm:inset-x-5 sm:bottom-5">
          <div className="mx-auto grid max-w-[1500px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-[1.35rem] border border-[#f8d2e7] bg-[#fff5fb]/95 p-3 shadow-[0_22px_70px_-26px_rgba(83,18,55,.5)] backdrop-blur-xl lg:grid-cols-[minmax(210px,280px)_minmax(360px,1fr)_48px] lg:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <MediaPoster item={activeAudio} className="h-14 w-14 shrink-0 rounded-xl shadow-sm lg:h-16 lg:w-16" />
              <div className="min-w-0 flex-1">
                <strong className="block truncate text-sm font-black">{activeAudio.title}</strong>
                <span className="block truncate text-xs font-semibold text-stone-500">
                  {activeAudio.featuredArtists || "franke'"}
                </span>
              </div>
              <FaHeart className="hidden shrink-0 text-base text-[#F839A9] sm:block" aria-hidden="true" />
            </div>

            {audioIsLocked ? (
              <div className="col-span-2 flex min-w-0 items-center justify-center gap-3 text-center lg:col-span-1">
                <p className="text-sm font-semibold text-stone-600">
                  {user
                    ? "Upgrade your membership to access this media."
                    : "You must be signed in to stream this content."}
                </p>
                <Link
                  href={user ? "/#memberships" : "/login"}
                  className="shrink-0 rounded-full bg-[#F839A9] px-4 py-2 text-xs font-black text-white"
                >
                  {user ? "View plans" : "Sign in"}
                </Link>
              </div>
            ) : activeAudioSource ? (
              <SleekAudioPlayer
                key={activeAudio.id}
                src={activeAudioSource}
                autoPlay
                previewLimitSeconds={shouldLimitAudioToPreview ? activeAudio.previewSeconds : undefined}
                previewStartSeconds={shouldLimitAudioToPreview ? activeAudio.previewStartSeconds ?? 0 : undefined}
                previewEndSeconds={shouldLimitAudioToPreview ? activeAudio.previewEndSeconds ?? undefined : undefined}
                variant="playerBar"
                onPrevious={activeAudioIndex > 0 ? () => selectAudioAt(activeAudioIndex - 1) : undefined}
                onNext={activeAudioIndex >= 0 && activeAudioIndex < audioItems.length - 1 ? () => selectAudioAt(activeAudioIndex + 1) : undefined}
                onShuffle={audioItems.length > 1 ? () => {
                  const candidates = audioItems.filter((item) => item.id !== activeAudio.id);
                  const nextItem = candidates[Math.floor(Math.random() * candidates.length)];
                  if (nextItem) setActiveAudio(nextItem);
                } : undefined}
                onEnded={activeAudioIndex >= 0 && activeAudioIndex < audioItems.length - 1 ? () => selectAudioAt(activeAudioIndex + 1) : undefined}
                className="col-span-2 min-w-0 lg:col-span-1"
              />
            ) : (
              <p className="col-span-2 min-w-0 text-center text-sm font-semibold text-stone-500 lg:col-span-1">
                No playable source has been added for this track yet.
              </p>
            )}

            <button
              type="button"
              onClick={() => setAudioPlayerOpen(false)}
              className="col-start-2 row-start-1 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#f4c4de] bg-white text-xl text-stone-700 transition hover:text-[#F839A9] lg:col-start-3 lg:row-start-1"
              aria-label="Close player"
            >
              <RiCloseLine />
            </button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
