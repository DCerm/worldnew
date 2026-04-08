import { requireUser } from "@/lib/auth";
import { canAccessMedia, getMediaLibrary } from "@/lib/data";

export default async function AllMusicPage() {
  const user = await requireUser();
  const media = (await getMediaLibrary()).filter((item) => item.mediaType === "audio");

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold text-stone-950">Audio Library</h1>
        <p className="mt-2 text-sm text-stone-500">Every published audio drop appears here with membership-aware playback.</p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {media.map((item) => (
          <article key={item.id} className="rounded-[2rem] border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{item.categoryName ?? "General"}</p>
            <h2 className="mt-2 text-xl font-semibold text-stone-950">{item.title}</h2>
            <p className="mt-3 text-sm text-stone-500">{item.description ?? "Premium artist content."}</p>
            <div className="mt-4">
              {canAccessMedia(user, item) && item.playbackUrl ? (
                <audio controls className="w-full" src={item.playbackUrl} />
              ) : (
                <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-sm text-stone-500">
                  This track is locked for your current access level.
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
