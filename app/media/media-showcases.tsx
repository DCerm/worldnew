"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { RiArrowLeftSLine, RiArrowRightSLine, RiInformationLine, RiPlayFill } from "react-icons/ri";

import { SleekAudioPlayer, SleekVideoPlayer } from "@/app/ui/media-player";
import type { AuthUser } from "@/lib/auth";
import type { MediaCard } from "@/lib/data";
import { MEDIA_CATEGORIES, categoryHrefForSlug, mediaForCategory } from "@/lib/media-categories";

function canAccessMediaClient(user: AuthUser | null, media: MediaCard) {
  if (media.visibility === "public") return true;
  if (!user) return false;
  if (user.roles.includes("artist_admin") || user.roles.includes("super_admin")) return true;
  if (media.visibility === "community") return true;
  if (media.visibility === "paid") return Boolean(user.activePlanCode);
  if (media.visibility === "plan_specific") {
    return Boolean(user.activePlanCode && media.planCodes.includes(user.activePlanCode));
  }
  return false;
}

function getVisibilityLabelClient(visibility: MediaCard["visibility"]) {
  if (visibility === "public") return "Community";
  if (visibility === "community") return "Community";
  if (visibility === "paid") return "Paid members";
  if (visibility === "plan_specific") return "Paid members";
  return "Members";
}

function getLockedMediaCta(user: AuthUser | null) {
  if (!user) {
    return {
      message: "You must be signed in to stream this content.",
      href: "/login",
      label: "Sign in",
    };
  }

  return {
    message: "Upgrade your membership to access this media.",
    href: "/#memberships",
    label: "View membership plans",
  };
}

function formatPreviewSeconds(seconds?: number | null) {
  const value = Math.max(1, seconds || 30);
  const mins = Math.floor(value / 60);
  const secs = value % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function MediaPoster({
  item,
  className,
  fit = "object-cover",
}: {
  item: MediaCard | null;
  className?: string;
  fit?: "object-cover" | "object-contain";
}) {
  if (item?.posterImageUrl) {
    return (
      <img
        src={item.posterImageUrl}
        alt={`${item.title} poster`}
        loading="lazy"
        decoding="async"
        className={`${className ?? ""} ${fit}`}
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
    );
  }

  return (
    <div className={`${className ?? ""} grid place-items-center bg-gradient-to-br from-[#F839A9] via-[#a20f66] to-stone-950 p-6 text-center text-xl font-black text-white`}>
      WORLD NEW
    </div>
  );
}

export function HoverPreviewCard({
  item,
  user,
  onInfo,
  posterAspect = "aspect-[16/9]",
  expandable = true,
}: {
  item: MediaCard;
  user: AuthUser | null;
  onInfo?: (id: string) => void;
  posterAspect?: string;
  expandable?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [showLockedCta, setShowLockedCta] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const allowed = canAccessMediaClient(user, item);
  const canPreview = allowed && item.mediaType === "video" && Boolean(item.playbackUrl);
  const lockedCta = !allowed ? getLockedMediaCta(user) : null;
  const expansionClass = expandable
    ? "md:hover:-translate-y-3 md:hover:scale-[1.45] lg:hover:scale-[1.58] 2xl:hover:scale-[1.7] md:hover:origin-top-left"
    : "md:hover:-translate-y-1";

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (!canPreview || !isHovered) {
      video.pause();
      video.currentTime = 0;
      return;
    }

    const previewStart = Math.max(0, item.previewStartSeconds || 0);

    const playTimer = window.setTimeout(() => {
      video.currentTime = previewStart;
      void video.play().catch(() => undefined);
    }, 80);

    return () => {
      window.clearTimeout(playTimer);
      video.pause();
      video.currentTime = previewStart;
    };
  }, [canPreview, isHovered, item.playbackUrl, item.previewEndSeconds, item.previewSeconds, item.previewStartSeconds]);

  return (
    <article
      className={`group/card relative z-0 w-full rounded-xl border border-stone-100 bg-white shadow-[0_18px_45px_-34px_rgba(15,23,42,.55)] transition-[transform,box-shadow] duration-300 ease-out hover:z-30 md:hover:shadow-[0_30px_70px_-36px_rgba(248,57,169,.75)] ${expansionClass}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link
        href={`/media/watch/${item.id}`}
        className="block overflow-hidden rounded-t-xl"
        onClick={(event) => {
          if (!allowed) {
            event.preventDefault();
            setShowLockedCta(true);
          }
        }}
      >
        <div className={`relative ${posterAspect} overflow-hidden bg-stone-200`}>
          {canPreview && isHovered ? (
            <video
              ref={videoRef}
              src={item.playbackUrl ?? undefined}
              poster={item.posterImageUrl ?? undefined}
              muted
              playsInline
              loop
              preload="auto"
              onTimeUpdate={(event) => {
                const previewStart = Math.max(0, item.previewStartSeconds || 0);
                const previewEndInput = Math.max(0, item.previewEndSeconds || 0);
                const previewEnd = previewEndInput > previewStart ? previewEndInput : previewStart + Math.max(5, item.previewSeconds || 30);
                if (event.currentTarget.currentTime >= previewEnd) {
                  event.currentTarget.currentTime = previewStart;
                  void event.currentTarget.play().catch(() => undefined);
                }
              }}
              className="hidden h-full w-full object-cover md:block"
            />
          ) : null}
          <MediaPoster
            item={item}
            className={`h-full w-full transition duration-500 group-hover:scale-105 ${canPreview && isHovered ? "md:hidden" : ""}`}
          />
          <span className="absolute left-3 top-3 rounded-full bg-stone-950/85 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">
            {item.mediaType}
          </span>
          <span className="absolute right-3 top-3 rounded-md bg-stone-950/85 px-2 py-1 text-xs font-black text-white">
            {formatPreviewSeconds(item.previewSeconds)}
          </span>
          {canPreview && !isHovered ? (
            <span className="absolute inset-0 hidden place-items-center bg-black/0 text-white transition group-hover:bg-black/20 md:grid">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-[#F839A9] text-2xl shadow-lg">
                <RiPlayFill />
              </span>
            </span>
          ) : null}
        </div>
      </Link>
      <div className="space-y-2 p-4">
        <h3 className="line-clamp-2 text-sm font-black text-stone-950">{item.title}</h3>
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex rounded-full bg-[#ffe4f4] px-3 py-1 text-[11px] font-black text-[#F839A9]">
            {getVisibilityLabelClient(item.visibility)}
          </span>
          {onInfo ? (
            <button
              type="button"
              onClick={() => onInfo(item.id)}
              className="inline-flex items-center gap-1 text-xs font-black text-[#F839A9]"
            >
              <RiInformationLine /> More info
            </button>
          ) : null}
        </div>
        {lockedCta && showLockedCta ? (
          <div className="space-y-2 rounded-2xl border border-[#ffd1e9] bg-[#fff8fc] p-3">
            <p className="text-[11px] font-semibold text-stone-600">{lockedCta.message}</p>
            <Link href={lockedCta.href} className="inline-flex rounded-full bg-[#F839A9] px-3 py-1.5 text-[11px] font-black text-white">
              {lockedCta.label}
            </Link>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function CategoryShelf({
  label,
  slug,
  items,
  user,
  onInfo,
  posterAspect = "aspect-[16/9]",
}: {
  label: string;
  slug: string;
  items: MediaCard[];
  user: AuthUser | null;
  onInfo?: (id: string) => void;
  posterAspect?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  if (items.length === 0) {
    return null;
  }

  const scrollBy = (direction: "left" | "right") => {
    scrollerRef.current?.scrollBy({
      left: direction === "right" ? 560 : -560,
      behavior: "smooth",
    });
  };

  return (
    <section className="space-y-5 p-0">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-black">{label}</h2>
        <Link href={categoryHrefForSlug(slug)} className="text-sm font-black text-[#F839A9]">
          View all
        </Link>
      </div>
      <div className="group/shelf relative">
        <button
          type="button"
          onClick={() => scrollBy("left")}
          className="absolute -left-4 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white text-2xl text-[#F839A9] shadow-[0_18px_45px_-28px_rgba(15,23,42,.65)] transition hover:bg-[#F839A9] hover:text-white md:grid"
          aria-label={`Scroll ${label} left`}
        >
          <RiArrowLeftSLine />
        </button>
        <div
          ref={scrollerRef}
          className="flex snap-x gap-4 overflow-x-auto overflow-y-visible py-5 pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => (
            <div key={item.id} className="w-[200px] shrink-0 snap-start sm:w-[210px] lg:w-[220px] 2xl:w-[235px]">
              <HoverPreviewCard item={item} user={user} onInfo={onInfo} posterAspect={posterAspect} expandable />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => scrollBy("right")}
          className="absolute -right-4 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white text-2xl text-[#F839A9] shadow-[0_18px_45px_-28px_rgba(15,23,42,.65)] transition hover:bg-[#F839A9] hover:text-white md:grid"
          aria-label={`Scroll ${label} right`}
        >
          <RiArrowRightSLine />
        </button>
      </div>
    </section>
  );
}

export function MediaCategoryShelves({
  media,
  user,
  onInfo,
}: {
  media: MediaCard[];
  user: AuthUser | null;
  onInfo?: (id: string) => void;
}) {
  const shelves = useMemo(
    () =>
      MEDIA_CATEGORIES.filter((category) => category.slug !== "music").map((category) => ({
        ...category,
        items: mediaForCategory(media, category.slug).slice(0, category.slug === "mixtapes" ? 10 : 12),
      })).filter((category) => category.items.length > 0),
    [media]
  );

  return (
    <div className="space-y-9">
      {shelves.map((category) => (
        <CategoryShelf
          key={category.slug}
          label={category.label}
          slug={category.slug}
          items={category.items}
          user={user}
          onInfo={onInfo}
          posterAspect={category.slug === "mixtapes" ? "aspect-square" : "aspect-[16/9]"}
        />
      ))}
    </div>
  );
}

export function MediaInfoDialog({
  item,
  onClose,
}: {
  item: MediaCard | null;
  onClose: () => void;
}) {
  if (!item) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
      <div className="w-[92vw] max-w-4xl rounded-2xl bg-white p-5 text-stone-950 shadow-2xl lg:w-[56vw]">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-black">{item.title}</h3>
            <p className="mt-1 text-xs font-black uppercase tracking-[0.2em] text-[#F839A9]">
              {item.mediaType} • {item.categoryName ?? "General"}
            </p>
          </div>
          <button onClick={onClose} type="button" className="rounded-full border border-stone-300 px-3 py-1 text-sm font-black">
            Close
          </button>
        </div>

        <div className="space-y-4">
          {item.playbackUrl && item.mediaType === "video" ? (
            <SleekVideoPlayer
              className="w-full rounded-xl"
              poster={item.posterImageUrl ?? undefined}
              src={item.playbackUrl}
              autoPlay
              muted
              previewLimitSeconds={item.previewSeconds ?? 30}
              previewStartSeconds={item.previewStartSeconds ?? 0}
              previewEndSeconds={item.previewEndSeconds ?? undefined}
            />
          ) : item.playbackUrl ? (
            <SleekAudioPlayer
              src={item.playbackUrl}
              autoPlay
              previewLimitSeconds={item.previewSeconds}
              previewStartSeconds={item.previewStartSeconds ?? 0}
              previewEndSeconds={item.previewEndSeconds ?? undefined}
            />
          ) : null}

          <p className="text-sm text-stone-600">{item.description ?? "No description provided yet."}</p>
          <Link href={`/media/watch/${item.id}`} className="inline-flex rounded-full bg-[#F839A9] px-5 py-2 text-sm font-black text-white">
            Open full page
          </Link>
        </div>
      </div>
    </div>
  );
}

export function CategoryGrid({
  items,
  user,
}: {
  items: MediaCard[];
  user: AuthUser | null;
}) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const selectedItem = selectedItemId ? items.find((item) => item.id === selectedItemId) ?? null : null;

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <HoverPreviewCard
            key={item.id}
            item={item}
            user={user}
            onInfo={setSelectedItemId}
            posterAspect={item.categorySlug === "mixtapes" ? "aspect-square" : "aspect-[16/9]"}
            expandable={false}
          />
        ))}
      </div>
      <MediaInfoDialog item={selectedItem} onClose={() => setSelectedItemId(null)} />
    </>
  );
}
