"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  RiFullscreenExitLine,
  RiFullscreenLine,
  RiLoader4Line,
  RiPauseFill,
  RiPlayFill,
  RiVolumeMuteLine,
  RiVolumeUpLine,
} from "react-icons/ri";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const wholeSeconds = Math.floor(seconds);
  const mins = Math.floor(wholeSeconds / 60);
  const secs = wholeSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

type SleekAudioPlayerProps = {
  src: string;
  autoPlay?: boolean;
  className?: string;
  previewLimitSeconds?: number;
};

export function SleekAudioPlayer({
  src,
  autoPlay = false,
  className = "",
  previewLimitSeconds,
}: SleekAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shouldLoadSource, setShouldLoadSource] = useState(autoPlay);
  const [requestedPlay, setRequestedPlay] = useState(autoPlay);
  const [isLoading, setIsLoading] = useState(autoPlay);

  useEffect(() => {
    setShouldLoadSource(autoPlay);
    setRequestedPlay(autoPlay);
    setIsLoading(autoPlay);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }, [src, autoPlay]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const handleLoadedMetadata = () => setDuration(audio.duration || 0);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setRequestedPlay(false);
    };
    const handleCanPlay = async () => {
      setIsLoading(false);

      if (!requestedPlay) {
        return;
      }

      await audio.play().catch(() => undefined);
    };
    const handleLoadStart = () => {
      if (shouldLoadSource) {
        setIsLoading(true);
      }
    };
    const handleWaiting = () => {
      if (shouldLoadSource) {
        setIsLoading(true);
      }
    };
    const handlePlaying = () => setIsLoading(false);
    const handleError = () => {
      setIsLoading(false);
      setRequestedPlay(false);
      setIsPlaying(false);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("loadstart", handleLoadStart);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("loadstart", handleLoadStart);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("error", handleError);
    };
  }, [requestedPlay, shouldLoadSource]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !shouldLoadSource) {
      return;
    }

    if (audio.getAttribute("src") === src) {
      return;
    }

    audio.setAttribute("src", src);
    audio.load();
  }, [src, shouldLoadSource]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !previewLimitSeconds || previewLimitSeconds <= 0) {
      return;
    }

    const handlePreviewLimit = () => {
      if (audio.currentTime < previewLimitSeconds) {
        return;
      }

      audio.pause();
      audio.currentTime = 0;
      setCurrentTime(0);
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", handlePreviewLimit);

    return () => {
      audio.removeEventListener("timeupdate", handlePreviewLimit);
    };
  }, [previewLimitSeconds, src]);

  const progressMax = useMemo(
    () =>
      previewLimitSeconds && previewLimitSeconds > 0
        ? Math.min(duration || previewLimitSeconds, previewLimitSeconds)
        : duration > 0
        ? duration
        : 0,
    [duration, previewLimitSeconds]
  );

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (!shouldLoadSource) {
      setShouldLoadSource(true);
      setRequestedPlay(true);
      setIsLoading(true);
      return;
    }

    if (audio.paused) {
      setRequestedPlay(true);
      setIsLoading(true);
      await audio.play().catch(() => undefined);
      return;
    }

    setRequestedPlay(false);
    audio.pause();
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const nextMuted = !audio.muted;
    audio.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  return (
    <div
      className={`relative rounded-xl border border-[#F839A9]/30 bg-gradient-to-b from-stone-900 to-black p-3 shadow-[0_20px_40px_-30px_rgba(248,57,169,0.9)] ${className}`}
      onContextMenu={(event) => event.preventDefault()}
    >
      <audio
        ref={audioRef}
        preload={shouldLoadSource ? "metadata" : "none"}
        controlsList="nodownload noplaybackrate noremoteplayback"
      />

      {isLoading && shouldLoadSource && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-black/45">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/70 px-3 py-2 text-xs text-white shadow-lg">
            <RiLoader4Line className="animate-spin text-base text-[#F839A9]" />
            Buffering audio...
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={togglePlay}
          className="grid h-8 w-8 place-items-center rounded-full bg-[#F839A9] text-base text-white"
          aria-label={isPlaying ? "Pause audio" : "Play audio"}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <RiPauseFill /> : <RiPlayFill />}
        </button>
        <button
          type="button"
          onClick={toggleMute}
          className="grid h-8 w-8 place-items-center rounded-full border border-[#F839A9]/60 text-base text-[#F839A9]"
          aria-label={isMuted ? "Unmute audio" : "Mute audio"}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <RiVolumeMuteLine /> : <RiVolumeUpLine />}
        </button>
        <span className="ml-auto text-xs text-stone-300">
          {formatTime(currentTime)} / {formatTime(progressMax)}
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={progressMax}
        step={0.1}
        value={Math.min(currentTime, progressMax)}
        onChange={(event) => {
          const audio = audioRef.current;
          if (!audio) {
            return;
          }
          const nextTime = Number(event.target.value) || 0;
          audio.currentTime = nextTime;
          setCurrentTime(nextTime);
        }}
        className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-stone-700 accent-[#F839A9]"
      />
    </div>
  );
}

type SleekVideoPlayerProps = {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  className?: string;
  videoClassName?: string;
  previewLimitSeconds?: number;
  loopWithinPreview?: boolean;
  showControlsOverlay?: boolean;
  showLoadingOverlay?: boolean;
};

export function SleekVideoPlayer({
  src,
  poster,
  autoPlay = false,
  loop = false,
  muted = false,
  className = "",
  videoClassName = "object-contain",
  previewLimitSeconds,
  loopWithinPreview = false,
  showControlsOverlay = true,
  showLoadingOverlay = true,
}: SleekVideoPlayerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [shouldLoadSource, setShouldLoadSource] = useState(autoPlay);
  const [requestedPlay, setRequestedPlay] = useState(autoPlay);
  const [isLoading, setIsLoading] = useState(autoPlay);

  useEffect(() => {
    setShouldLoadSource(autoPlay);
    setRequestedPlay(autoPlay);
    setIsLoading(autoPlay);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.pause();
    video.removeAttribute("src");
    video.load();
  }, [src, autoPlay]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.muted = muted;
    setIsMuted(muted);

    const handleLoadedMetadata = () => setDuration(video.duration || 0);
    const handleTimeUpdate = () => setCurrentTime(video.currentTime || 0);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setRequestedPlay(false);
    };
    const handleCanPlay = async () => {
      setIsLoading(false);

      if (!requestedPlay) {
        return;
      }

      await video.play().catch(() => undefined);
    };
    const handleLoadStart = () => {
      if (shouldLoadSource) {
        setIsLoading(true);
      }
    };
    const handleWaiting = () => {
      if (shouldLoadSource) {
        setIsLoading(true);
      }
    };
    const handlePlaying = () => setIsLoading(false);
    const handleError = () => {
      setIsLoading(false);
      setRequestedPlay(false);
      setIsPlaying(false);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("loadstart", handleLoadStart);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("error", handleError);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("loadstart", handleLoadStart);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("error", handleError);
    };
  }, [muted, requestedPlay, shouldLoadSource]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !shouldLoadSource) {
      return;
    }

    if (video.getAttribute("src") === src) {
      return;
    }

    video.setAttribute("src", src);
    video.load();
  }, [src, shouldLoadSource]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !previewLimitSeconds || previewLimitSeconds <= 0) {
      return;
    }

    const handlePreviewLimit = () => {
      if (video.currentTime < previewLimitSeconds) {
        return;
      }

      if (loopWithinPreview) {
        video.currentTime = 0;
        void video.play().catch(() => undefined);
        return;
      }

      video.pause();
      video.currentTime = 0;
      setCurrentTime(0);
      setIsPlaying(false);
    };

    video.addEventListener("timeupdate", handlePreviewLimit);

    return () => {
      video.removeEventListener("timeupdate", handlePreviewLimit);
    };
  }, [loopWithinPreview, previewLimitSeconds, src]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (video.paused) {
      if (!shouldLoadSource) {
        setShouldLoadSource(true);
        setRequestedPlay(true);
        setIsLoading(true);
        return;
      }

      setRequestedPlay(true);
      setIsLoading(true);
      await video.play().catch(() => undefined);
      return;
    }

    setRequestedPlay(false);
    video.pause();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const toggleFullscreen = async () => {
    const wrapper = wrapperRef.current;
    if (!wrapper) {
      return;
    }

    if (!document.fullscreenElement) {
      await wrapper.requestFullscreen().catch(() => undefined);
      return;
    }

    await document.exitFullscreen().catch(() => undefined);
  };

  const progressMax =
    previewLimitSeconds && previewLimitSeconds > 0
      ? Math.min(duration || previewLimitSeconds, previewLimitSeconds)
      : duration > 0
      ? duration
      : 0;

  return (
    <div
      ref={wrapperRef}
      className={`relative overflow-hidden rounded-xl border border-white/20 bg-black ${className}`}
      onContextMenu={(event) => event.preventDefault()}
    >
      <video
        ref={videoRef}
        poster={poster}
        preload={shouldLoadSource ? "metadata" : "none"}
        loop={loop}
        playsInline
        className={`h-full w-full ${videoClassName}`}
        controlsList="nodownload noplaybackrate noremoteplayback"
        disablePictureInPicture
      />

      {showLoadingOverlay && (!shouldLoadSource || isLoading) && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/35">
          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/70 px-4 py-3 text-sm text-white shadow-lg">
            <RiLoader4Line className={`text-lg text-[#F839A9] ${isLoading ? "animate-spin" : ""}`} />
            {shouldLoadSource ? "Loading video..." : "Ready to load video"}
          </div>
        </div>
      )}

      {showControlsOverlay && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={togglePlay}
            className="grid h-8 w-8 place-items-center rounded-full bg-[#F839A9] text-base text-white sm:h-auto sm:w-auto sm:px-3 sm:py-1.5 sm:text-xs"
            aria-label={isPlaying ? "Pause video" : "Play video"}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <RiPauseFill /> : <RiPlayFill />}
            <span className="hidden sm:inline sm:ml-1">
              {isPlaying ? "Pause" : "Play"}
            </span>
          </button>
          <button
            type="button"
            onClick={toggleMute}
            className="grid h-8 w-8 place-items-center rounded-full border border-[#F839A9]/60 text-base text-[#F839A9] sm:h-auto sm:w-auto sm:px-3 sm:py-1.5 sm:text-xs"
            aria-label={isMuted ? "Unmute video" : "Mute video"}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <RiVolumeMuteLine /> : <RiVolumeUpLine />}
            <span className="hidden sm:inline sm:ml-1">
              {isMuted ? "Unmute" : "Mute"}
            </span>
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="grid h-8 w-8 place-items-center rounded-full border border-stone-300/60 text-base text-white sm:h-auto sm:w-auto sm:px-3 sm:py-1.5 sm:text-xs"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <RiFullscreenExitLine /> : <RiFullscreenLine />}
            <span className="hidden sm:inline sm:ml-1">
              {isFullscreen ? "Exit full" : "Full"}
            </span>
          </button>
          <span className="ml-auto text-[11px] text-stone-200 sm:text-xs">
            {formatTime(currentTime)} / {formatTime(progressMax)}
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={progressMax}
          step={0.1}
          value={Math.min(currentTime, progressMax)}
          onChange={(event) => {
            const video = videoRef.current;
            if (!video) {
              return;
            }
            const nextTime = Number(event.target.value) || 0;
            video.currentTime = nextTime;
            setCurrentTime(nextTime);
          }}
          className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-stone-600 accent-[#F839A9]"
        />
        </div>
      )}
    </div>
  );
}
