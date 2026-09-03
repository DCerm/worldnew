"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RiPauseFill, RiPlayFill, RiShoppingCart2Line } from "react-icons/ri";

import type { WordPressMusicTrack } from "@/lib/wordpress";

type WordNewMusicTracklistProps = {
  tracks: WordPressMusicTrack[];
  hasPaidCommunityAccess?: boolean;
  forceFullPlayback?: boolean;
  showCartButton?: boolean;
  title?: string;
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

      <ol className="relative space-y-2">
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
            <li
              key={track.id}
              className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-[#ffd1e9] py-3 last:border-b-0"
            >
                <span className="flex items-center justify-center">
                    <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 640 640"
                    width="10"
                    height="10"
                    className="mr-2 text-[#F839A9]"
                    aria-hidden="true"
                    >
                    <path
                        fill="currentColor"
                        d="M320 576C214 576 128 490 128 384C128 292.8 258.2 109.9 294.6 60.5C300.5 52.5 309.8 48 319.8 48L320.2 48C330.2 48 339.5 52.5 345.4 60.5C381.8 109.9 512 292.8 512 384C512 490 426 576 320 576zM240 376C240 362.7 229.3 352 216 352C202.7 352 192 362.7 192 376C192 451.1 252.9 512 328 512C341.3 512 352 501.3 352 488C352 474.7 341.3 464 328 464C279.4 464 240 424.6 240 376z"
                    />
                    </svg>
                    <span className="mr-4 inline-block text-sm font-black text-[#F839A9]">
                        {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                        
                        <span className="inline-block min-w-0 align-middle text-sm font-black text-stone-950 sm:text-base">
                            <span className="block truncate">{track.title}</span>
                            <p className="text-xs font-medium text-stone-500">{track.artist || "franke."}</p>
                        </span>
                    </span>
                </span>

                

                <div className="flex items-center justify-end gap-2">
                  <a
                    className="inline-flex"
                    href={track.can_download && track.download_url ? track.download_url : (track.product_url || track.checkout_url)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <button
                      type="button"
                      className="grid h-10 w-10 place-items-center rounded-full bg-stone-950 text-lg text-white transition hover:bg-[#F839A9]"
                      aria-label={track.can_download ? "Download track" : "Buy track"}
                    >
                      {showCartButton ? <RiShoppingCart2Line /> : track.can_download ? "Download" : (track.price ? `£${track.price.toFixed(2)}` : "Buy")}
                    </button>
                  </a>

                  <div className="flex items-center gap-2">
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
                          setTimeById((prev) => ({
                            ...prev,
                            [track.id]: availableTime,
                          }));
                          return;
                        }

                        setPlaybackError(null);
                        stopPlayback();
                        setActiveTrackId(track.id);
                        setTimeById((prev) => ({
                          ...prev,
                          [track.id]: availableTime,
                        }));

                        audio.src = track.stream_url;
                        audio.load();
                        audio.currentTime = shouldLimitPlayback ? previewStart : 0;

                        audio.oncanplay = () => {
                          audio.currentTime = shouldLimitPlayback ? previewStart : 0;
                          audio.play().catch(() => {
                            stopPlayback();
                            setPlaybackError(
                              "This track could not start. Please verify the stream URL."
                            );
                          });
                          audio.oncanplay = null;
                        };

                        if (timerRef.current !== null) {
                          window.clearInterval(timerRef.current);
                        }

                        timerRef.current = window.setInterval(() => {
                          const currentTime = audio.currentTime;
                          if (shouldLimitPlayback && currentTime >= previewEnd) {
                            stopPlayback();
                            setTimeById((prev) => ({ ...prev, [track.id]: previewWindowLength }));
                            return;
                          }

                          setTimeById((prev) => ({
                            ...prev,
                            [track.id]: shouldLimitPlayback
                              ? Math.max(0, Math.ceil(previewEnd - currentTime))
                              : availableTime,
                          }));
                        }, 250);
                      }}
                      className={`grid h-10 w-10 place-items-center rounded-full border-none text-xl transition ${
                        isActive
                          ? "bg-[#F839A9] text-white"
                          : "bg-[#fff0f7] text-[#F839A9] hover:bg-[#F839A9] hover:text-white"
                      }`}
                      aria-label={isActive ? "Pause stream" : "Play stream"}
                    >
                      {isActive ? <RiPauseFill /> : <RiPlayFill />}
                    </button>
                    <p className="w-12 text-right text-sm font-black text-stone-950">{timeLabel}</p>
                  </div>
                </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
