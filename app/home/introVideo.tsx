// components/IntroVideo.tsx
import React from "react";

interface IntroVideoProps {
  videoUrl?: string; // YouTube ID or full embed URL
}

function getEmbedUrl(url?: string): string {
  if (!url) return "dQw4w9WgXcQ";
  // If only a YouTube video ID is provided
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return `https://www.youtube.com/embed/${url}`;
  }
  // Assume it's already a valid embed URL
  return url;
}

export default function IntroVideo({ videoUrl }: IntroVideoProps) {
  return (
    <section className="p-2 w-full md:w-4/5 mx-auto rounded-xl relative">
      {/* Title */}
      <h2 className="text-2xl font-bold text-center mb-6 hidden">Intro Video</h2>

      {/* Video */}
      <div className="relative w-full h-[200px] md:h-[500px] aspect-video rounded-xl overflow-hidden shadow-lg">
        {videoUrl ? (
          <iframe
            className="w-full h-full"
            src={getEmbedUrl(videoUrl)}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          ></iframe>
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-gray-200 text-gray-600 rounded-xl">
            No intro video available
          </div>
        )}
      </div>
    </section>
  );
}