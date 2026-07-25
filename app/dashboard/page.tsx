import React from "react";
import Link from "next/link";

import { requireUser } from "@/lib/auth";
import {
  DEFAULT_PROFILE_COVER_URL,
  getCommunityGroups,
  getCommunityFeed,
  getGlobalProfileCoverUrl,
  getMediaLibrary,
} from "@/lib/data";
import Image from "next/image";
import { resolveAvatarUrl } from "@/lib/avatar";
import { normalizeOptionalUrl } from "@/lib/avatar";

type DashboardTab = "home" | "community";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  const resolvedSearchParams = await searchParams;

  const activeTab = (["home", "community"].includes(resolvedSearchParams.tab ?? "")
    ? resolvedSearchParams.tab
    : "home") as DashboardTab;

  const [feed, media, globalCoverUrl, groups] = await Promise.all([
    getCommunityFeed(),
    activeTab === "home" ? getMediaLibrary({ limit: 12 }) : Promise.resolve([]),
    getGlobalProfileCoverUrl(),
    activeTab === "community" ? getCommunityGroups() : Promise.resolve([]),
  ]);

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
            alt="cover"
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
          <div className="flex w-full items-center gap-4 ">
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
              <h2 className="text-2xl font-bold text-stone-900">{user.displayName}</h2>
              <p className="max-w-xl text-md text-stone-600">{user.bio ?? "Music and light for the world"}</p>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 lg:gap-3">
              <div className="rounded-lg border border-stone-200 bg-stone-100 px-4 py-2 text-sm font-medium text-stone-700">
                Membership: {user.activePlanCode ?? "Community access"}
              </div>
              <Link
                href="/#memberships"
                prefetch={false}
                className="rounded-lg bg-[#F839A9] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#F839A9]"
              >
                Upgrade membership
              </Link>
            <Link
              href="/gift-membership?returnTo=/dashboard"
              className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-stone-700"
            >
              Gift Membership
            </Link>
          </div>
        </div>

        <div className="mt-10 border-b border-stone-300 mx-2">
          <nav className="flex justify-between">
            <Link
              href="/dashboard?tab=home"
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
              href="/dashboard?tab=community"
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
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl font-bold text-stone-900">Latest media</h3>
                <Link
                  href="/media/audio"
                  className="rounded-full border border-[#F839A9]/40 px-3 py-1 text-xs font-semibold text-[#F839A9] transition hover:border-[#F839A9] hover:bg-[#F839A9]/10"
                >
                  View all audio files
                </Link>
              </div>
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
          <div className="mt-8 mx-auto space-y-6">
            <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
              <h3 className="text-2xl font-semibold text-stone-950">Community Groups</h3>
              <p className="mt-2 text-md text-stone-500">
                Explore groups, open a topic channel, then jump into threaded conversations.
              </p>
              <Link
                href="/community"
                className="mt-5 inline-flex rounded-full bg-[#F839A9] px-5 py-2 text-md font-semibold text-white"
              >
                Open all groups
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {groups.map((group) => (
                <Link
                  key={group.id}
                  href={`/community/${group.slug}`}
                  className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-500">{group.visibility}</p>
                  <h4 className="mt-2 text-lg font-semibold text-stone-950">{group.name}</h4>
                  <p className="mt-3 text-sm text-stone-700">
                    {group.description || "Open this group to explore channels and threads."}
                  </p>
                  <div className="mt-4 flex gap-3 text-xs text-stone-500">
                    <span>{group.topicCount} topics</span>
                    <span>{group.memberCount} members</span>
                  </div>
                </Link>
              ))}
            </div>

            {groups.length === 0 && (
              <article className="rounded-[2rem] border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-600 shadow-sm">
                No groups yet. An artist admin can create the first group from the Community page.
              </article>
            )}
          </div>
        )}
        </div>
      </div>
    </main>
  );
}
