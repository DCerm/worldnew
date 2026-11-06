"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RiPauseFill, RiPlayFill, RiShoppingCart2Line } from "react-icons/ri";

import type { WordPressMusicTrack } from "@/lib/wordpress";
import { formatDescription } from "@/lib/description";

type WordNewMusicTracklistProps = {
  tracks: WordPressMusicTrack[];
  hasPaidCommunityAccess?: boolean;
  forceFullPlayback?: boolean;
  showCartButton?: boolean;
  title?: string;
  artworkUrl?: string | null;
};

function formatTime(seconds: number) {
  const safe = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

function parseDurationSeconds(duration: string | null | undefined) {
  if (!duration) {
    return null;
  }

  const parts = duration
    .split(":")
    .map((part) => Number(part.trim()))
    .filter((part) => Number.isFinite(part));

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  return null;
}

export function WordNewMusicTracklist({
  tracks,
  hasPaidCommunityAccess = false,
  forceFullPlayback = false,
  showCartButton = false,
  title = "Tracks",
  artworkUrl,
}: WordNewMusicTracklistProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const [activeTrackId, setActiveTrackId] = useState<number | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [timeById, setTimeById] = useState<Record<number, number>>({});

  const sortedTracks = useMemo(
    () =>
      [...tracks].sort((a, b) => {
        if (a.is_featured === b.is_featured) {
          return a.title.localeCompare(b.title);
        }

        return a.is_featured ? -1 : 1;
      }),
    [tracks]
  );
  const hasUpgradeLockedTracks = sortedTracks.some(
    (track) =>
      !forceFullPlayback &&
      (track.community_playback_mode ?? "preview") === "members_full" &&
      !hasPaidCommunityAccess
  );

  const stopPlayback = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.oncanplay = null;
    }

    setActiveTrackId(null);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const handleError = () => {
      stopPlayback();
      setPlaybackError(
        "This track could not be played from the community app. Please check that the WordPress stream URL is public and directly streamable."
      );
    };

    audio.addEventListener("error", handleError);
    audio.addEventListener("ended", stopPlayback);

    return () => {
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("ended", stopPlayback);
    };
  }, []);

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-[#ffd1e9] bg-white p-4 text-stone-950 shadow-[0_24px_60px_-42px_rgba(248,57,169,0.75)]">
      <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-[#F839A9]/10 blur-3xl" />
      <audio
        ref={audioRef}
        preload="none"
        playsInline
        controlsList="nodownload noplaybackrate"
        className="hidden"
      />

      <div className="relative mb-4 flex items-center gap-4 border-b border-[#ffd1e9] pb-3">
        <h2 className="text-base font-black text-stone-950">{title}</h2>
        <div className="h-px flex-1 bg-[#ffd1e9]" />
      </div>

      {playbackError && (
        <div className="relative mb-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {playbackError}
        </div>
      )}

      {hasUpgradeLockedTracks ? (
        <div className="relative mb-4 rounded-2xl border border-[#ffd1e9] bg-[#fff0f7] px-4 py-3 text-xs font-semibold text-stone-700">
          You are hearing the preview length on selected tracks. Upgrade your membership to stream the full track.
        </div>
      ) : null}

      {sortedTracks.length === 0 ? (
        <p className="relative rounded-xl bg-[#fff8fc] px-4 py-5 text-sm font-medium text-stone-500">
          No standalone tracks are available yet.
        </p>
      ) : (
      <ol className="relative divide-y divide-[#f4e4ec]">
        {sortedTracks.map((track, index) => {
          const previewLimit = Math.max(5, Number(track.preview_seconds) || 30);
          const previewStart = Math.max(0, Number(track.preview_start_seconds) || 0);
          const previewEndInput = Math.max(0, Number(track.preview_end_seconds) || 0);
          const previewEnd = previewEndInput > previewStart ? previewEndInput : previewStart + previewLimit;
          const previewWindowLength = Math.max(5, previewEnd - previewStart);
          const playbackMode = track.community_playback_mode ?? "preview";
          const shouldLimitPlayback = forceFullPlayback
            ? false
            : playbackMode === "preview" ||
              (playbackMode === "members_full" && !hasPaidCommunityAccess);
          const displayDuration = parseDurationSeconds(track.duration);
          const isActive = activeTrackId === track.id;
          const availableTime = shouldLimitPlayback ? previewWindowLength : displayDuration ?? previewWindowLength;
          const visibleTime = isActive && shouldLimitPlayback ? timeById[track.id] ?? availableTime : availableTime;
          const timeLabel = formatTime(visibleTime);

          return (
            <li key={track.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-1 py-3 transition-colors hover:bg-[#fff8fc] sm:gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-4 shrink-0 text-center text-xs font-bold text-stone-400">{index + 1}</span>
                  {artworkUrl || track.cover_image_url ? (
                    <img src={artworkUrl || track.cover_image_url || ""} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-lg object-cover shadow-sm sm:h-14 sm:w-14" />
                  ) : (
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-[#fff0f7] text-[#F839A9] sm:h-14 sm:w-14">♪</span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black text-stone-950">{track.title}</span>
                    <span className="block truncate text-xs font-medium text-stone-500">{track.artist || "Franke'"}</span>
                    {track.description ? (
                      <span className="mt-1 hidden text-xs font-normal leading-4 text-stone-500 sm:line-clamp-2">
                        {formatDescription(track.description).join(" ")}
                      </span>
                    ) : null}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                  <span className="w-9 text-right text-xs font-semibold tabular-nums text-stone-500 sm:w-10">{timeLabel}</span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();

                      const audio = audioRef.current;
                      if (!audio || !track.stream_url) {
                        setPlaybackError("No playable stream is available for this track.");
                        return;
                      }

                      if (activeTrackId === track.id && !audio.paused) {
                        stopPlayback();
                        setTimeById((prev) => ({ ...prev, [track.id]: availableTime }));
                        return;
                      }

                      setPlaybackError(null);
                      stopPlayback();
                      setActiveTrackId(track.id);
                      setTimeById((prev) => ({ ...prev, [track.id]: availableTime }));
                      audio.src = track.stream_url;
                      audio.load();
                      audio.currentTime = shouldLimitPlayback ? previewStart : 0;
                      audio.oncanplay = () => {
                        audio.currentTime = shouldLimitPlayback ? previewStart : 0;
                        audio.play().catch(() => {
                          stopPlayback();
                          setPlaybackError("This track could not start. Please verify the stream URL.");
                        });
                        audio.oncanplay = null;
                      };

                      if (timerRef.current !== null) window.clearInterval(timerRef.current);
                      timerRef.current = window.setInterval(() => {
                        const currentTime = audio.currentTime;
                        if (shouldLimitPlayback && currentTime >= previewEnd) {
                          stopPlayback();
                          setTimeById((prev) => ({ ...prev, [track.id]: previewWindowLength }));
                          return;
                        }
                        setTimeById((prev) => ({
                          ...prev,
                          [track.id]: shouldLimitPlayback ? Math.max(0, Math.ceil(previewEnd - currentTime)) : availableTime,
                        }));
                      }, 250);
                    }}
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border border-stone-200 text-lg transition sm:h-10 sm:w-10 ${isActive ? "bg-[#F839A9] text-white" : "bg-white text-stone-900 hover:border-[#F839A9] hover:text-[#F839A9]"}`}
                    aria-label={isActive ? "Pause stream" : "Play stream"}
                  >
                    {isActive ? <RiPauseFill /> : <RiPlayFill />}
                  </button>
                  {showCartButton ? (
                  <a
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-stone-950 text-base text-white transition hover:bg-[#F839A9] sm:h-10 sm:w-10"
                    href={track.community_checkout_url || track.checkout_url || track.product_url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Buy track"
                  >
                    <RiShoppingCart2Line />
                  </a>
                  ) : null}
                </div>
            </li>
          );
        })}
      </ol>
      )}
    </section>
  );
}
