import Link from "next/link";
import Image from "next/image";

import {
  createCommunityGroupAction,
  createCommunityTopicAction,
  updateCommunityGroupSortOrderAction,
  updateCommunityTopicSortOrderAction,
  updateGlobalCoverAction,
} from "@/app/actions";
import { requireAdmin } from "@/lib/auth";
import {
  DEFAULT_PROFILE_COVER_URL,
  getCommunityGroups,
  getCommunityTopicsByGroupSlug,
  getCommunityFeed,
  getGlobalProfileCoverUrl,
  getMediaLibrary,
} from "@/lib/data";
import { resolveAvatarUrl } from "@/lib/avatar";
import { normalizeOptionalUrl } from "@/lib/avatar";

type AdminTab = "home" | "community";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireAdmin();
  const resolvedSearchParams = await searchParams;

  const activeTab = (["home", "community"].includes(resolvedSearchParams.tab ?? "")
    ? resolvedSearchParams.tab
    : "home") as AdminTab;

  const [feed, media, globalCoverUrl, groups] = await Promise.all([
    getCommunityFeed(),
    activeTab === "home" ? getMediaLibrary({ limit: 12 }) : Promise.resolve([]),
    getGlobalProfileCoverUrl(),
    activeTab === "community" ? getCommunityGroups() : Promise.resolve([]),
  ]);
  const firstGroup = groups[0] ?? null;
  const firstGroupTopics =
    activeTab === "community" && firstGroup
      ? await getCommunityTopicsByGroupSlug(firstGroup.slug)
      : { topics: [] };

  const latestMedia = media.slice(0, 4);
  const latestEvents = feed.slice(0, 5);
  const profileCoverUrl =
    normalizeOptionalUrl(globalCoverUrl) ??
    normalizeOptionalUrl(user.coverImageUrl) ??
    DEFAULT_PROFILE_COVER_URL;
  const profileAvatarUrl = resolveAvatarUrl({
    avatarUrl: user.avatarUrl,
    userId: user.id,
    email: user.email,
  });

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
                src={profileAvatarUrl}
                alt="profile"
                width={112}
                height={112}
                className="h-28 w-28 rounded-full object-cover"
              />
            </div>
            <div className="text-left">
              <p className="text-sm uppercase tracking-[0.35em] text-[#F839A9]">Artist Dashboard</p>
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
              className="rounded-lg bg-[#F839A9] px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-[#F839A9]"
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
                  ? "border-b-2 border-[#F839A9] bg-[#F839A9]/10 text-[#F839A9]"
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
                  ? "border-b-2 border-[#F839A9] bg-[#F839A9]/10 text-[#F839A9]"
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
                      className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-gray-600 placeholder:text-gray-400"
                    />
                    <button className="rounded-full bg-[#F839A9] px-4 py-2 text-xs font-semibold text-white">
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
                    <Link href={`/media/watch/${item.id}`} className="mt-3 inline-flex rounded-full bg-[#F839A9] px-4 py-2 text-xs font-semibold text-white">
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
                <h3 className="text-2xl font-semibold text-stone-950">Community Groups</h3>
                <p className="mt-2 text-md text-stone-500">
                  Build Discord-style structure: groups → topics → threads.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    href="/community"
                    className="rounded-full bg-[#F839A9] px-5 py-2 text-sm font-semibold text-white"
                  >
                    Open Community
                  </Link>
                  <Link
                    href={firstGroup ? `/community/${firstGroup.slug}` : "/community"}
                    className="rounded-full border border-stone-300 px-5 py-2 text-sm font-semibold text-stone-700"
                  >
                    Manage Topics
                  </Link>
                </div>
              </div>

              <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
                <h4 className="text-lg font-semibold text-stone-900">Create Group</h4>
                <form action={createCommunityGroupAction} className="mt-4 grid gap-3 md:grid-cols-2">
                  <input
                    name="name"
                    placeholder="Group name"
                    className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-gray-600 placeholder:text-gray-400"
                  />
                  <input
                    name="description"
                    placeholder="Description"
                    className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-gray-600 placeholder:text-gray-400"
                  />
                  <select
                    name="visibility"
                    defaultValue="public"
                    className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-gray-600"
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                    <option value="secret">Secret</option>
                  </select>
                  <input
                    name="sortOrder"
                    defaultValue="0"
                    placeholder="Display order"
                    inputMode="numeric"
                    className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-gray-600 placeholder:text-gray-400"
                  />
                  <button className="rounded-full bg-[#F839A9] px-5 py-2 text-sm font-semibold text-white md:justify-self-start">
                    Save Group
                  </button>
                </form>
              </div>

              {firstGroup && (
                <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
                  <h4 className="text-lg font-semibold text-stone-900">Create Topic in {firstGroup.name}</h4>
                  <form action={createCommunityTopicAction} className="mt-4 grid gap-3 md:grid-cols-2">
                    <input type="hidden" name="groupId" value={firstGroup.id} />
                    <input
                      name="title"
                      placeholder="Topic title"
                      className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-gray-600 placeholder:text-gray-400"
                    />
                    <input
                      name="description"
                      placeholder="Description"
                      className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-gray-600 placeholder:text-gray-400"
                    />
                    <input
                      name="sortOrder"
                      placeholder="Sort order"
                      inputMode="numeric"
                      className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-gray-600 placeholder:text-gray-400"
                    />
                    <button className="rounded-full bg-[#F839A9] px-5 py-2 text-sm font-semibold text-white md:justify-self-start">
                      Save Topic
                    </button>
                  </form>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                {groups.map((group) => (
                  <article
                    key={group.id}
                    className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-stone-500">{group.visibility}</p>
                        <h4 className="mt-2 text-lg font-semibold text-stone-900">{group.name}</h4>
                        <p className="mt-2 text-sm text-stone-600">{group.description || "No description yet."}</p>
                        <p className="mt-3 text-xs text-stone-500">{group.topicCount} topics</p>
                      </div>
                      <form action={updateCommunityGroupSortOrderAction} className="flex items-center gap-2">
                        <input type="hidden" name="groupId" value={group.id} />
                        <input
                          name="sortOrder"
                          defaultValue={group.sortOrder}
                          aria-label={`Display order for ${group.name}`}
                          inputMode="numeric"
                          className="w-20 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-gray-600"
                        />
                        <button className="rounded-full border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-700">
                          Save order
                        </button>
                      </form>
                    </div>
                    <Link
                      href={`/community/${group.slug}`}
                      className="mt-4 inline-flex rounded-full bg-[#F839A9]/10 px-4 py-2 text-xs font-semibold text-[#F839A9]"
                    >
                      Open group
                    </Link>
                  </article>
                ))}
              </div>

              {firstGroupTopics.topics.length > 0 && (
                <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
                  <h4 className="text-lg font-semibold text-stone-900">Topics in {firstGroup?.name}</h4>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {firstGroupTopics.topics.map((topic) => (
                      <div
                        key={topic.id}
                        className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <Link
                            href={`/community/${topic.groupSlug}/${topic.slug}`}
                            className="font-medium transition hover:text-[#F839A9]"
                          >
                            {topic.title}
                          </Link>
                          <form action={updateCommunityTopicSortOrderAction} className="flex items-center gap-2">
                            <input type="hidden" name="topicId" value={topic.id} />
                            <input
                              name="sortOrder"
                              defaultValue={topic.sortOrder}
                              aria-label={`Display order for ${topic.title}`}
                              inputMode="numeric"
                              className="w-20 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-gray-600"
                            />
                            <button className="rounded-full border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-700">
                              Save order
                            </button>
                          </form>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
