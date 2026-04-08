import Link from "next/link";
import { notFound } from "next/navigation";

import { canAccessMedia, getMediaItemById } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";

export default async function WatchMediaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, media] = await Promise.all([getCurrentUser(), getMediaItemById(id)]);

  if (!media) {
    notFound();
  }

  const canPlay = canAccessMedia(user, media);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 md:px-6">
        <Link href="/media" className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold">
          Back to media
        </Link>
        <p className="text-sm text-stone-300">{media.title}</p>
      </div>

      <section className="flex h-[calc(100vh-64px)] w-full items-center justify-center">
        {!canPlay ? (
          <div className="rounded-2xl border border-white/20 bg-black px-6 py-8 text-center text-stone-300">
            This media is locked for your current membership.
          </div>
        ) : media.playbackUrl ? (
          media.mediaType === "video" ? (
            <video
              src={media.playbackUrl}
              poster={media.posterImageUrl ?? undefined}
              controls
              autoPlay
              playsInline
              
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="w-full max-w-3xl px-6">
              <audio className="w-full" src={media.playbackUrl} controls autoPlay  />
            </div>
          )
        ) : (
          <div className="rounded-2xl border border-white/20 bg-black px-6 py-8 text-center text-stone-300">
            No playable source URL is configured for this media yet.
          </div>
        )}
      </section>
    </main>
  );
}
