import Link from "next/link";
import { notFound } from "next/navigation";

import { canAccessMedia, getMediaItemById } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { SleekAudioPlayer, SleekVideoPlayer } from "@/app/ui/media-player";

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
  const shouldLimitToPreview =
    media.communityPlaybackMode === "preview" ||
    (media.communityPlaybackMode === "members_full" && !user?.activePlanCode);
  const playableSource = shouldLimitToPreview
    ? media.playbackUrl
    : media.fullPlaybackUrl ?? media.playbackUrl;
  const lockedState = !canPlay
    ? user
      ? {
          message: "Upgrade your membership to access this media.",
          href: "/#memberships",
          label: "View membership plans",
        }
      : {
          message: "You must be signed in to stream this content.",
          href: "/login",
          label: "Sign in",
        }
    : null;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 md:px-6">
        <Link href="/media" className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold">
          Back to media
        </Link>
        <p className="text-sm text-stone-300">{media.title}</p>
      </div>

      <section className="flex h-[calc(100vh-64px)] w-full items-center justify-center">
        {lockedState ? (
          <div className="space-y-5 rounded-2xl border border-white/20 bg-black px-6 py-8 text-center text-stone-300">
            <p>{lockedState.message}</p>
            <Link href={lockedState.href} className="inline-flex rounded-full bg-[#F839A9] px-5 py-2 text-sm font-black text-white">
              {lockedState.label}
            </Link>
          </div>
        ) : playableSource ? (
          media.mediaType === "video" ? (
            <SleekVideoPlayer
              src={playableSource}
              poster={media.posterImageUrl ?? undefined}
              autoPlay
              previewLimitSeconds={shouldLimitToPreview ? media.previewSeconds : undefined}
              previewStartSeconds={shouldLimitToPreview ? media.previewStartSeconds ?? 0 : undefined}
              previewEndSeconds={shouldLimitToPreview ? media.previewEndSeconds ?? undefined : undefined}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="w-full max-w-3xl px-6">
              <SleekAudioPlayer
                className="w-full"
                src={playableSource}
                autoPlay
                previewLimitSeconds={shouldLimitToPreview ? media.previewSeconds : undefined}
                previewStartSeconds={shouldLimitToPreview ? media.previewStartSeconds ?? 0 : undefined}
                previewEndSeconds={shouldLimitToPreview ? media.previewEndSeconds ?? undefined : undefined}
              />
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
