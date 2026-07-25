"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { WordPressMusicTrack } from "@/lib/wordpress";

type WordNewMusicTracklistProps = {
  tracks: WordPressMusicTrack[];
};

function formatTime(seconds: number) {
  const safe = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

export function WordNewMusicTracklist({ tracks }: WordNewMusicTracklistProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const [activeTrackId, setActiveTrackId] = useState<number | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [elapsedById, setElapsedById] = useState<Record<number, number>>({});

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
        "This preview could not be played from the community app. Please check that the WordPress preview URL is public and directly streamable."
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
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-r from-[#F839A9]/35 via-[#F839A9]/20 to-transparent p-5 text-white shadow-[0_25px_55px_-35px_rgba(248,57,169,0.75)]">
      <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-[#F839A9]/25 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(10,19,36,0.54)_0%,rgba(5,7,11,0.9)_78%)]" />
      <audio
        ref={audioRef}
        preload="none"
        playsInline
        controlsList="nodownload noplaybackrate"
        className="hidden"
      />

      <div className="relative mb-5 flex items-start justify-between gap-5 border-b border-white/10 pb-5">
        <div className="flex items-end gap-4">
          <img
            src="/music-player-assets/franke.png"
            alt="Franke artwork"
            className="h-28 w-28 rounded-[20px] object-cover shadow-lg sm:h-40 sm:w-40"
          />
          <div>
            <span className="text-3xl font-extrabold leading-none text-white sm:text-4xl">
              franke.
            </span>
            <p className="pb-2 pt-2 text-sm text-[#b6c2d2]">Top tracks</p>
            <button
              type="button"
              disabled
              className="rounded-[5px] bg-white/10 px-4 py-2 text-sm text-white backdrop-blur transition hover:bg-[#F839A9]"
            >
              Follow
            </button>
          </div>
        </div>

        <img
          src="/music-player-assets/world.new.png"
          alt="World New"
          className="hidden h-10 w-auto rounded-full "
        />
      </div>

      <div className="relative mb-4 flex items-start gap-5">
        <button
          type="button"
          disabled
          className="rounded-[5px] bg-white/10 px-3 py-1 text-xs text-white"
        >
          Preview
        </button>
        <div className="mt-3 h-0.5 w-full bg-white/15" />
      </div>

      {playbackError && (
        <div className="relative mb-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          {playbackError}
        </div>
      )}

      <ol className="relative space-y-2">
        {sortedTracks.map((track, index) => {
          const previewLimit = Math.max(5, Number(track.preview_seconds) || 30);
          const isActive = activeTrackId === track.id;
          const elapsed = elapsedById[track.id] ?? previewLimit;

          return (
            <li
              key={track.id}
              className="lg:flex flex-wrap items-center justify-between gap-3 border-b border-white/20 py-3 last:border-b-0"
            >
                <span className="flex items-center justify-center">
                    <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 640 640"
                    width="10"
                    height="10"
                    className="text-[#F839A9] mr-2"
                    aria-hidden="true"
                    >
                    <path
                        fill="currentColor"
                        d="M320 576C214 576 128 490 128 384C128 292.8 258.2 109.9 294.6 60.5C300.5 52.5 309.8 48 319.8 48L320.2 48C330.2 48 339.5 52.5 345.4 60.5C381.8 109.9 512 292.8 512 384C512 490 426 576 320 576zM240 376C240 362.7 229.3 352 216 352C202.7 352 192 362.7 192 376C192 451.1 252.9 512 328 512C341.3 512 352 501.3 352 488C352 474.7 341.3 464 328 464C279.4 464 240 424.6 240 376z"
                    />
                    </svg>
                    <span className="mr-4 inline-block text-sm font-medium text-white">
                        {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                        
                        <span className="inline-block min-w-0 align-middle text-sm sm:text-base font-normal text-white">
                            <span className="block truncat">{track.title}</span>
                            <p className="text-xs text-[#8b9ab0]">{track.artist || "franke."}</p>
                        </span>
                    </span>
                </span>

                

                <div className=" flex mt-2 sm:mt-0 items-center ">
                  <a
                    className="inline-flex"
                    href={track.can_download && track.download_url ? track.download_url : (track.product_url || track.checkout_url)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <button
                      type="button"
                      className="rounded-[20px] bg-white/10 px-3 py-1 text-xs text-white transition hover:bg-white/20"
                    >
                      {track.can_download ? "Download" : (track.price ? `£${track.price.toFixed(2)}` : "Buy")}
                    </button>
                  </a>

                  <div className="flex items-center ">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();

                        const audio = audioRef.current;
                        if (!audio || !track.stream_url) {
                          setPlaybackError("No playable preview is available for this track.");
                          return;
                        }

                        if (activeTrackId === track.id && !audio.paused) {
                          stopPlayback();
                          setElapsedById((prev) => ({ ...prev, [track.id]: previewLimit }));
                          return;
                        }

                        setPlaybackError(null);
                        stopPlayback();
                        setActiveTrackId(track.id);
                        setElapsedById((prev) => ({ ...prev, [track.id]: previewLimit }));

                        audio.src = track.stream_url;
                        audio.load();
                        audio.currentTime = 0;

                        audio.oncanplay = () => {
                          audio.play().catch(() => {
                            stopPlayback();
                            setPlaybackError(
                              "This preview could not start. Please verify the preview URL."
                            );
                          });
                          audio.oncanplay = null;
                        };

                        if (timerRef.current !== null) {
                          window.clearInterval(timerRef.current);
                        }

                        timerRef.current = window.setInterval(() => {
                          const currentTime = audio.currentTime;
                          if (currentTime >= previewLimit) {
                            stopPlayback();
                            setElapsedById((prev) => ({ ...prev, [track.id]: previewLimit }));
                            return;
                          }

                          setElapsedById((prev) => ({
                            ...prev,
                            [track.id]: currentTime,
                          }));
                        }, 250);
                      }}
                      className={`rounded-full border-none px-3 py-2 text-sm transition mx-2 ${
                        isActive
                          ? "bg-[#F839A9] text-white"
                          : "bg-white/10 text-[#F839A9] hover:bg-[#F839A9] hover:text-white"
                      }`}
                      aria-label={isActive ? "Pause preview" : "Play preview"}
                    >
                      {isActive ? "II" : "▶"}
                    </button>
                    <p className=" text-right text-sm text-[#b6c2d2]">{formatTime(elapsed)}</p>
                  </div>
                </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
