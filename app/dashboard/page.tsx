import Link from "next/link";
import { redirect } from "next/navigation";
import {
  RiArrowRightLine,
  RiChat3Line,
  RiMusic2Line,
  RiTeamLine,
} from "react-icons/ri";

import { requireUser } from "@/lib/auth";
import {
  DEFAULT_PROFILE_COVER_URL,
  getCommunityFeed,
  getCommunityGroups,
  getGlobalProfileCoverUrl,
} from "@/lib/data";
import { normalizeOptionalUrl, resolveAvatarUrl } from "@/lib/avatar";

type DashboardTab = "home" | "community";

function formatActivityTime(value: string) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return "Recently";
  }

  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  if (user.roles.includes("artist_admin") || user.roles.includes("super_admin")) {
    redirect("/admin");
  }

  const resolvedSearchParams = await searchParams;
  const activeTab = (["home", "community"].includes(resolvedSearchParams.tab ?? "")
    ? resolvedSearchParams.tab
    : "home") as DashboardTab;

  const [feed, groups, globalCoverUrl] = await Promise.all([
    getCommunityFeed(),
    getCommunityGroups(),
    getGlobalProfileCoverUrl(),
  ]);
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
    <main className="wn-dashboard-page min-h-screen bg-white px-4 py-8 text-stone-950 lg:px-8">
      <div className="mx-auto w-full max-w-[1320px]">
        <section className="overflow-hidden rounded-[2rem] border border-stone-100 bg-white shadow-[0_26px_70px_-52px_rgba(15,23,42,.65)]">
          <div className="relative min-h-44 overflow-hidden bg-[#F839A9]">
            <img
              src={profileCoverUrl}
              alt="World New artist cover"
              className="h-48 w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
            <span className="absolute left-5 top-5 rounded-full bg-white/25 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-white backdrop-blur">
              Global cover
            </span>
          </div>
          <div className="flex flex-col gap-5 px-5 py-5 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <img
                src={profileAvatarUrl}
                alt={user.displayName || "World New member"}
                className="h-20 w-20 rounded-full object-cover ring-4 ring-white"
              />
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-[#F839A9]">Community Dashboard</p>
                <h1 className="mt-1 truncate text-2xl font-black">World New Community</h1>
                <p className="mt-1 text-sm font-semibold text-stone-500">Connect, listen, watch, and grow together.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/community" className="rounded-full bg-stone-950 px-5 py-2.5 text-sm font-black text-white">View community page</Link>
              <Link href="/dashboard/profile" className="rounded-full bg-[#F839A9] px-5 py-2.5 text-sm font-black text-white">Profile settings</Link>
            </div>
          </div>
        </section>

        <nav className="mb-7 mt-5 grid grid-cols-3 border-b border-[#ffd1e9] text-sm font-black md:text-base">
          <Link href="/dashboard?tab=home" className={`border-b-2 px-3 py-4 text-center ${activeTab === "home" ? "border-[#F839A9] bg-[#fff0f7] text-[#F839A9]" : "border-transparent text-stone-500 hover:text-stone-950"}`}>
            Home
          </Link>
          <Link href="/media" className="border-b-2 border-transparent px-3 py-4 text-center text-stone-500 hover:text-stone-950">
            Music + Videos
          </Link>
          <Link href="/dashboard?tab=community" className={`border-b-2 px-3 py-4 text-center ${activeTab === "community" ? "border-[#F839A9] bg-[#fff0f7] text-[#F839A9]" : "border-transparent text-stone-500 hover:text-stone-950"}`}>
            Community
          </Link>
        </nav>

        {activeTab === "home" ? (
          <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_330px]">
            <section className="min-w-0 space-y-5">
              <div className="rounded-[2rem] bg-gradient-to-br from-[#F839A9] via-[#f75aa9] to-[#ffb6dc] p-7 text-white shadow-[0_26px_64px_-42px_rgba(248,57,169,.95)]">
                <p className="text-xs font-black uppercase tracking-[0.26em] text-white/75">Your community home</p>
                <h1 className="mt-3 text-3xl font-black md:text-4xl">Welcome back, {user.displayName || "member"}.</h1>
                <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/90">Catch up on new releases, artist announcements, and the conversations happening across your groups.</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href="/media" className="inline-flex items-center gap-2 rounded-full bg-stone-950 px-5 py-2.5 text-sm font-black text-white"><RiMusic2Line /> Explore media</Link>
                  <Link href="/community" className="inline-flex items-center gap-2 rounded-full border border-white/60 px-5 py-2.5 text-sm font-black text-white"><RiTeamLine /> Open community</Link>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#F839A9]">Personal feed</p>
                  <h2 className="mt-1 text-2xl font-black">What&apos;s happening</h2>
                </div>
                <Link href="/community" className="text-sm font-black text-[#F839A9]">View community <RiArrowRightLine className="inline" /></Link>
              </div>

              {feed.length > 0 ? feed.map((post) => (
                <article key={post.id} className="rounded-[1.5rem] border border-stone-100 bg-white p-5 shadow-[0_18px_48px_-38px_rgba(15,23,42,.65)]">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#fff0f7] font-black text-[#F839A9]">{post.authorName.slice(0, 1).toUpperCase()}</span>
                      <div className="min-w-0"><strong className="block truncate text-sm font-black">{post.authorName}</strong><span className="text-xs text-stone-500">{formatActivityTime(post.createdAt)}</span></div>
                    </div>
                    {post.mediaTitle ? <span className="hidden rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-600 sm:inline">{post.mediaTitle}</span> : null}
                  </div>
                  <p className="mt-4 whitespace-pre-line text-sm leading-6 text-stone-700">{post.body || "Shared an update with the community."}</p>
                  <div className="mt-4 flex items-center gap-2 text-xs font-bold text-stone-500"><RiChat3Line className="text-[#F839A9]" /> {post.comments.length} {post.comments.length === 1 ? "reply" : "replies"}</div>
                </article>
              )) : (
                <div className="rounded-[1.5rem] border border-dashed border-[#ffc5e4] bg-[#fff8fc] p-6 text-sm text-stone-600">Your feed is ready for the first community update.</div>
              )}
            </section>

            <aside className="h-fit rounded-[1.5rem] border border-[#ffd1e9] bg-[#fff8fc] p-5 xl:sticky xl:top-28">
              <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-black">Quick links</h2><RiMusic2Line className="text-[#F839A9]" /></div>
              <div className="mt-4 space-y-2">
                <Link href="/media/audio" className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm font-bold text-stone-800 transition hover:text-[#F839A9]">Albums and tracks <RiArrowRightLine /></Link>
                <Link href="/community" className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm font-bold text-stone-800 transition hover:text-[#F839A9]">Group chats <RiArrowRightLine /></Link>
              </div>
            </aside>
          </div>
        ) : (
          <section className="rounded-[1.75rem] border border-[#ffd1e9] bg-white p-5 shadow-[0_22px_54px_-42px_rgba(248,57,169,.8)] md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#ffd1e9] pb-5">
              <div><p className="text-xs font-black uppercase tracking-[0.24em] text-[#F839A9]">Community chat</p><h1 className="mt-2 text-3xl font-black">Find your conversations</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">Open a group to join its existing topics and threaded discussions.</p></div>
              <Link href="/community" className="inline-flex items-center gap-2 rounded-full bg-[#F839A9] px-5 py-3 text-sm font-black text-white">Open full community <RiArrowRightLine /></Link>
            </div>
            <div className="mt-5 divide-y divide-[#ffd1e9] rounded-2xl border border-[#ffd1e9]">
              {groups.map((group) => <Link key={group.id} href={`/community/${group.slug}`} className="grid gap-3 p-4 transition hover:bg-[#fff8fc] md:grid-cols-[minmax(0,1fr)_100px_100px_auto] md:items-center"><div><h2 className="font-black text-stone-950">{group.name}</h2><p className="mt-1 text-sm text-stone-600">{group.description || "Open this group to explore its conversations."}</p></div><span className="text-xs font-bold text-stone-500">{group.memberCount} members</span><span className="text-xs font-bold text-stone-500">{group.topicCount} topics</span><RiArrowRightLine className="text-xl text-[#F839A9]" /></Link>)}
              {groups.length === 0 ? <div className="p-6 text-sm text-stone-600">No groups are available yet.</div> : null}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
