import Link from "next/link";
import Image from "next/image";

import {
  createCommentAction,
  createCommunityPostAction,
  updateGlobalCoverAction,
} from "@/app/actions";
import { requireAdmin } from "@/lib/auth";
import {
  DEFAULT_PROFILE_COVER_URL,
  getCommunityFeed,
  getGlobalProfileCoverUrl,
  getMediaLibrary,
} from "@/lib/data";

type AdminTab = "home" | "community";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireAdmin();
  const [feed, media, globalCoverUrl, resolvedSearchParams] = await Promise.all([
    getCommunityFeed(),
    getMediaLibrary(),
    getGlobalProfileCoverUrl(),
    searchParams,
  ]);

  const activeTab = (["home", "community"].includes(resolvedSearchParams.tab ?? "")
    ? resolvedSearchParams.tab
    : "home") as AdminTab;

  const latestMedia = media.slice(0, 4);
  const latestEvents = feed.slice(0, 5);
  const profileCoverUrl =
    globalCoverUrl ?? user.coverImageUrl ?? DEFAULT_PROFILE_COVER_URL;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-2 py-8 lg:px-8">
      <div className="pb-4 lg:pb-8 overflow-hidden rounded-[2rem] border border-stone-200 bg-gradient-to-b from-white to-stone-50/60 shadow-[0_28px_60px_-40px_rgba(0,0,0,0.45)]">
        <div className="relative overflow-hidden rounded-[1.5rem] border border-stone-200/80 shadow-sm">
          <Image
            src={profileCoverUrl}
            alt="Global cover"
            width={1600}
            height={640}
            className="h-60 w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
          <div className="absolute left-4 top-4 rounded-full border border-white/35 bg-black/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white backdrop-blur">
            Artist Cover
          </div>
        </div>

        <div className="lg:mx-2 relative lg:mt-4 flex flex-col items-center justify-between gap-4 rounded-2xl lg:border border-stone-200/80 bg-white/90 p-4 backdrop-blur lg:flex-row">
          <div className="flex w-full items-center gap-4">
            <div className="relative h-28 w-28 overflow-hidden rounded-full ring-4 ring-white shadow-lg">
              <Image
                src={user.avatarUrl ?? DEFAULT_PROFILE_COVER_URL}
                alt="profile"
                width={112}
                height={112}
                className="h-28 w-28 rounded-full object-cover"
              />
            </div>
            <div className="text-left">
              <p className="text-sm uppercase tracking-[0.35em] text-[#0091ff]">Artist Dashboard</p>
              <h2 className="text-2xl font-bold text-stone-900">Howdy {user.displayName}</h2>
              <p className="max-w-xl text-md text-stone-600">
                Overview, media visibility, and community engagement in one place.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 lg:gap-3">
            <Link
              href="/admin/profile"
              className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-stone-700"
            >
              Edit profile
            </Link>
            <Link
              href="/admin/videos"
              className="rounded-lg bg-[#0091ff] px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-[#007fe0]"
            >
              Media studio
            </Link>
            <Link
              href="/media"
              className="rounded-lg border border-stone-200 bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-700 shadow-sm transition hover:bg-stone-200"
            >
              Open media view
            </Link>
          </div>
        </div>

        <div className="mt-10 border-b border-stone-300 mx-2">
          <nav className="flex justify-between">
            <Link
              href="/admin?tab=home"
              className={`w-1/3 rounded-t-xl pb-3 pt-1 text-center text-md font-semibold transition ${
                activeTab === "home"
                  ? "border-b-2 border-[#0091ff] bg-[#0091ff]/10 text-[#0091ff]"
                  : "text-stone-600 hover:border-b-2 hover:border-stone-400 hover:text-stone-900"
              }`}
            >
              Home
            </Link>
            <Link
              href="/media"
              className="w-1/3 rounded-t-xl pb-3 pt-1 text-center text-md font-semibold text-stone-600 transition hover:border-b-2 hover:border-stone-400 hover:text-stone-900"
            >
              Music + Videos
            </Link>
            <Link
              href="/admin?tab=community"
              className={`w-1/3 rounded-t-xl pb-3 pt-1 text-center text-md font-semibold transition ${
                activeTab === "community"
                  ? "border-b-2 border-[#0091ff] bg-[#0091ff]/10 text-[#0091ff]"
                  : "text-stone-600 hover:border-b-2 hover:border-stone-400 hover:text-stone-900"
              }`}
            >
              Community
            </Link>
          </nav>
        </div>

        <div className="mx-2 lg:mx-8">
          {activeTab === "home" && (
            <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-5">
                <h3 className="text-xl font-bold text-stone-900">Latest events</h3>
                {latestEvents.map((post) => (
                  <article key={post.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-stone-500">{post.authorName}</p>
                      <p className="text-xs text-stone-500">{new Date(post.createdAt).toLocaleString()}</p>
                    </div>
                    <p className="mt-2 text-md text-stone-700">{post.body}</p>
                  </article>
                ))}
              </div>

              <div className="space-y-5">
                <article className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <h3 className="text-lg font-semibold text-stone-900">Global profile cover</h3>
                  <p className="mt-2 text-sm text-stone-600">
                    This image is shown across member and artist profile headers.
                  </p>
                  <form action={updateGlobalCoverAction} className="mt-4 space-y-3">
                    <input
                      name="globalCoverImageUrl"
                      defaultValue={globalCoverUrl ?? ""}
                      placeholder="Global cover image URL"
                      className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm"
                    />
                    <button className="rounded-full bg-[#0091ff] px-4 py-2 text-xs font-semibold text-white">
                      Save global cover
                    </button>
                  </form>
                </article>

                <h3 className="text-xl font-bold text-stone-900">Latest media</h3>
                {latestMedia.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <p className="text-xs uppercase tracking-[0.2em] text-stone-500">{item.mediaType}</p>
                    <h4 className="mt-1 text-lg font-semibold text-stone-900">{item.title}</h4>
                    <p className="mt-2 text-md text-stone-600">{item.description ?? "New release"}</p>
                    <Link href={`/media/watch/${item.id}`} className="mt-3 inline-flex rounded-full bg-[#0091ff] px-4 py-2 text-xs font-semibold text-white">
                      Play in fullscreen
                    </Link>
                  </article>
                ))}
              </div>
            </div>
          )}

          {activeTab === "community" && (
            <div className="mt-8 mx-auto max-w-4xl space-y-6">
              <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
                <h3 className="text-2xl font-semibold text-stone-950">Community Forum</h3>
                <p className="mt-2 text-md text-stone-500">
                  Read member posts, leave comments, and reply to conversations.
                </p>
                <form action={createCommunityPostAction} className="mt-5 space-y-3">
                  <textarea
                    name="body"
                    rows={4}
                    placeholder="Share an update with the community..."
                    className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 text-md outline-none transition focus:border-stone-400"
                  />
                  <button className="rounded-full bg-[#0091ff] px-5 py-2 text-md font-semibold text-white">Post</button>
                </form>
              </div>

              {feed.map((post) => (
                <article key={post.id} className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-stone-500">{post.authorName}</p>
                      <h4 className="mt-2 text-lg font-semibold text-stone-950">
                        {post.type === "media_announcement" && post.mediaTitle ? `New drop: ${post.mediaTitle}` : "Community post"}
                      </h4>
                    </div>
                    <span className="text-xs text-stone-500">{new Date(post.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-4 text-md text-stone-700">{post.body}</p>

                  <div className="mt-5 space-y-4 rounded-2xl bg-stone-50 p-4">
                    {post.comments.map((comment) => (
                      <div key={comment.id} className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-stone-500">{comment.authorName}</p>
                        <p className="text-md text-stone-700">{comment.body}</p>

                        {comment.replies.length > 0 && (
                          <div className="space-y-2 border-l-2 border-stone-200 pl-4">
                            {comment.replies.map((reply) => (
                              <div key={reply.id} className="rounded-lg bg-stone-50 p-3">
                                <p className="text-xs uppercase tracking-[0.2em] text-stone-500">{reply.authorName}</p>
                                <p className="text-md text-stone-700">{reply.body}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        <form action={createCommentAction} className="flex gap-2">
                          <input type="hidden" name="postId" value={post.id} />
                          <input type="hidden" name="parentCommentId" value={comment.id} />
                          <input
                            name="body"
                            placeholder="Reply to this comment..."
                            className="flex-1 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-stone-400"
                          />
                          <button className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white">Reply</button>
                        </form>
                      </div>
                    ))}

                    <form action={createCommentAction} className="flex gap-2">
                      <input type="hidden" name="postId" value={post.id} />
                      <input
                        name="body"
                        placeholder="Add a comment..."
                        className="flex-1 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-stone-400"
                      />
                      <button className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white">Comment</button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
