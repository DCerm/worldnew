"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { AuthUser } from "@/lib/auth";
import type { MediaCard } from "@/lib/data";

type Props = {
  user: AuthUser | null;
  media: MediaCard[];
};

function canAccessMediaClient(user: AuthUser | null, media: MediaCard) {
  if (media.visibility === "public") {
    return true;
  }

  if (!user) {
    return false;
  }

  if (user.roles.includes("artist_admin") || user.roles.includes("super_admin")) {
    return true;
  }

  if (media.visibility === "community") {
    return true;
  }

  if (media.visibility === "paid") {
    return Boolean(user.activePlanCode);
  }

  if (media.visibility === "plan_specific") {
    return Boolean(user.activePlanCode && media.planCodes.includes(user.activePlanCode));
  }

  return false;
}

function getVisibilityLabelClient(visibility: MediaCard["visibility"]) {
  switch (visibility) {
    case "public":
      return "Public";
    case "community":
      return "Community";
    case "paid":
      return "Paid members";
    case "plan_specific":
      return "Specific plans";
    default:
      return "Restricted";
  }
}

function VideoFramePoster({
  playbackUrl,
  className,
}: {
  playbackUrl: string;
  className?: string;
}) {
  const [frameUrl, setFrameUrl] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    const video = document.createElement("video");
    video.src = playbackUrl;
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";

    const cleanup = () => {
      video.pause();
      video.removeAttribute("src");
      video.load();
    };

    const captureFrame = () => {
      if (isCancelled || !video.videoWidth || !video.videoHeight) {
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        return;
      }

      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setFrameUrl(canvas.toDataURL("image/jpeg", 0.8));
      } catch {
        // Cross-origin and codec issues can block canvas extraction.
      }
    };

    const onLoadedData = () => {
      try {
        const target =
          Number.isFinite(video.duration) && video.duration > 0
            ? Math.min(1.2, video.duration / 3)
            : 0.1;
        video.currentTime = target;
      } catch {
        captureFrame();
      }
    };

    video.addEventListener("loadeddata", onLoadedData);
    video.addEventListener("seeked", captureFrame);
    video.load();

    return () => {
      isCancelled = true;
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("seeked", captureFrame);
      cleanup();
    };
  }, [playbackUrl]);

  if (frameUrl) {
    return <img src={frameUrl} alt="" className={`${className ?? ""} object-cover`} />;
  }

  return <div className={`${className ?? ""} bg-gradient-to-br from-[#0091ff]/25 via-stone-900 to-black`} />;
}

function MediaPoster({
  item,
  className,
}: {
  item: MediaCard;
  className?: string;
}) {
  if (item.posterImageUrl) {
    return <img src={item.posterImageUrl} alt={`${item.title} poster`} className={`${className ?? ""} object-cover`} />;
  }

  if (item.mediaType === "video" && item.playbackUrl) {
    return <VideoFramePoster playbackUrl={item.playbackUrl} className={className} />;
  }

  return (
    <div className={`${className ?? ""} bg-gradient-to-br from-[#0091ff]/25 via-stone-900 to-black`} />
  );
}

export default function MediaExperience({ user, media }: Props) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const featuredItem = useMemo(() => {
    const explicit = media.find((item) => item.isFeatured && item.mediaType === "video");
    if (explicit) {
      return explicit;
    }

    const firstVideo = media.find((item) => item.mediaType === "video");
    return firstVideo ?? media[0] ?? null;
  }, [media]);

  const grouped = useMemo(() => {
    const groups = new Map<string, MediaCard[]>();
    for (const item of media) {
      const key = item.categoryName ?? "Featured Releases";
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    }
    return Array.from(groups.entries());
  }, [media]);

  const videoGroups = grouped
    .map(([category, items]) => [category, items.filter((item) => item.mediaType === "video")] as const)
    .filter(([, items]) => items.length > 0);

  const audioItems = media.filter((item) => item.mediaType === "audio");

  const selectedItem = selectedItemId ? media.find((item) => item.id === selectedItemId) ?? null : null;
  const isAdminUser = Boolean(
    user &&
      (user.roles.includes("artist_admin") || user.roles.includes("super_admin"))
  );
  const communityHref = isAdminUser ? "/admin?tab=community" : "/dashboard?tab=community";
  const libraryHref = isAdminUser ? "/admin?tab=home" : "/dashboard?tab=home";

  return (
    <main className="min-h-screen bg-black text-white overflow-hidden">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur w-full">
        <div className="mx-auto flex  items-center justify-between px-4 py-4 lg:px-8">
          <Link href={user ? (isAdminUser ? "/admin" : "/dashboard") : "/login"} className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold">
            { user ? "Back to dashboard" : "Sign In" }
          </Link>
          <nav className="flex flex-wrap items-center gap-3 text-sm">
            <Link href={communityHref} className="hidden lg:block rounded-full border border-white/20 px-4 py-2 hover:border-[#0091ff]">
              Community
            </Link>
            <Link href={libraryHref} className="hidden lg:block rounded-full border border-white/20 px-4 py-2 hover:border-[#0091ff]">
              Library
            </Link>
            <a href="https://worldnew.love" target="_blank" rel="noreferrer" className="rounded-full border border-white/20 px-4 py-2 hover:border-[#0091ff]">
              worldnew.love
            </a>
          </nav>
        </div>
      </header>

      <div className="relative overflow-hidden border-b border-white/10">
        {featuredItem?.playbackUrl && featuredItem.mediaType === "video" ? (
          <video
            className="h-[55vh] w-full object-cover md:h-[70vh]"
            src={featuredItem.playbackUrl}
            poster={featuredItem.posterImageUrl ?? undefined}
            controls
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <div className="h-[55vh] w-full bg-gradient-to-b from-[#0091ff]/20 to-black md:h-[70vh]" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 mx-auto max-w-7xl px-4 pb-10 lg:px-0">
          <p className="text-sm uppercase tracking-[0.3em] text-[#0091ff]">Featured Now</p>
          <h1 className="mt-0 max-w-4xl text-4xl font-bold lg:text-5xl">{featuredItem?.title ?? "Featured Piece"}</h1>
          <p className="mt-4 max-w-2xl text-lg text-stone-300">{featuredItem?.description ?? "This is a featured video piece, published on xxx in the last Europe tour."}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {featuredItem && (
              <Link
                href={`/media/watch/${featuredItem.id}`}
                className="pointer-events-auto rounded-full bg-[#0091ff] px-6 py-3 text-sm font-semibold text-white"
              >
                Play
              </Link>
            )}
            {featuredItem && (
              <button
                onClick={() => setSelectedItemId(featuredItem.id)}
                className="pointer-events-auto rounded-full border border-white/50 bg-black/50 px-6 py-3 text-sm font-semibold"
                type="button"
              >
                View More Info
              </button>
            )}
          </div>
        </div>
      </div>

      <section className="mx-auto grid max-w-7xl gap-8 overflow-x-hidden px-4 py-8 lg:grid-cols-3 lg:px-0">
        <div className="min-w-0 space-y-8 lg:col-span-2">
          {videoGroups.map(([category, items]) => (
            <div key={category} className="min-w-0 space-y-4">
              <div className="flex w-full items-center justify-between gap-3">
                <h2 className="min-w-0 flex-1 truncate text-xl font-semibold sm:text-2xl">{category}</h2>
                <Link
                  href={`/media/category/${items[0].categorySlug ?? "uncategorized"}`}
                  className="flex-none whitespace-nowrap text-sm font-semibold text-[#0091ff]"
                >
                  View all
                </Link>
              </div>
              <div className="flex gap-4 overflow-x-auto overscroll-x-contain pb-2 pr-1 snap-x snap-mandatory">
                {items.map((item) => {
                  const allowed = canAccessMediaClient(user, item);
                  return (
                    <article
                      key={item.id}
                      className="w-[78vw] max-w-[340px] shrink-0 snap-start overflow-hidden rounded-2xl border border-white/10 bg-stone-950/70 sm:w-[320px]"
                    >
                      <div className="relative h-44 overflow-hidden rounded-t-xl">
                        <MediaPoster item={item} className="h-full w-full" />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                        <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
                          <p className="text-xs uppercase tracking-[0.2em] text-stone-200">{item.mediaType}</p>
                          {item.isFeatured && <span className="text-xs font-semibold text-[#7ec4ff]">FEATURED</span>}
                        </div>
                      </div>
                      <div className="space-y-3 p-4">
                        <h3 className="text-xl font-semibold">{item.title}</h3>
                        <div className="flex items-center justify-between">
                          <span className="rounded-full border border-white/20 px-2 py-1 text-xs text-stone-300">
                            {getVisibilityLabelClient(item.visibility)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link href={`/media/watch/${item.id}`} className="rounded-full bg-[#0091ff] px-4 py-2 text-xs font-semibold">
                            Play
                          </Link>
                          <button
                            onClick={() => setSelectedItemId(item.id)}
                            type="button"
                            className="rounded-full border border-[#0091ff] px-3 py-2 text-xs font-semibold text-[#0091ff]"
                          >
                            View More Info
                          </button>
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
          ))}
        </div>

        <aside className="space-y-5 rounded-2xl border border-white/10 bg-stone-950/70 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Music</h2>
            <Link href="/dashboard/music" className="text-sm font-semibold text-[#0091ff]">
              View all music
            </Link>
          </div>
          <div className="space-y-4">
            {audioItems.length > 0 ? (
              audioItems.slice(0, 8).map((item) => {
                const allowed = canAccessMediaClient(user, item);
                return (
                  <article key={item.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                    <div className="mb-3 h-36 overflow-hidden rounded-lg border border-white/10">
                      <MediaPoster item={item} className="h-full w-full" />
                    </div>
                    <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{item.categoryName ?? "General"}</p>
                    <h3 className="mt-1 text-lg font-semibold">{item.title}</h3>
                    {allowed && item.playbackUrl ? (
                      <audio className="mt-3 w-full" src={item.playbackUrl} controls />
                    ) : (
                      <p className="mt-2 text-xs text-stone-400">Locked for your membership level.</p>
                    )}
                  </article>
                );
              })
            ) : (
              <p className="text-sm text-stone-400">No audio titles published yet.</p>
            )}
          </div>
        </aside>
      </section>

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="w-[92vw] max-w-4xl rounded-2xl border border-white/10 bg-stone-950 p-5 lg:w-[56vw]">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold">{selectedItem.title}</h3>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-stone-400">
                  {selectedItem.mediaType} • {selectedItem.categoryName ?? "General"}
                </p>
              </div>
              <button onClick={() => setSelectedItemId(null)} type="button" className="rounded-full border border-white/30 px-3 py-1 text-sm">
                Close
              </button>
            </div>

            <div className="space-y-4">
              {selectedItem.playbackUrl && selectedItem.mediaType === "video" ? (
                <video
                  className="w-full rounded-xl"
                  src={selectedItem.playbackUrl}
                  poster={selectedItem.posterImageUrl ?? undefined}
                  controls
                  autoPlay
                />
              ) : selectedItem.playbackUrl ? (
                <audio className="w-full" controls src={selectedItem.playbackUrl} />
              ) : null}

              <p className="text-sm text-stone-300">{selectedItem.description ?? "No description provided yet."}</p>

              {selectedItem.featuredArtists && (
                <p className="text-sm text-stone-300">
                  <span className="font-semibold text-white">Featured artists:</span> {selectedItem.featuredArtists}
                </p>
              )}

              {selectedItem.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedItem.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-white/20 px-3 py-1 text-xs text-stone-300">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
