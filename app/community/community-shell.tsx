"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiBriefcaseLine,
  RiFilmLine,
  RiHome4Line,
  RiMenuLine,
  RiMusic2Line,
  RiShoppingBag3Line,
  RiTeamLine,
  RiUser2Line,
  RiVideoLine,
} from "react-icons/ri";

import type { CommunityGroupSummary, CommunityTopicSummary } from "@/lib/data";
import type { ReactNode } from "react";

type CommunityGroupWithTopics = CommunityGroupSummary & {
  topics: CommunityTopicSummary[];
};

const topLinks = [
  { href: "/dashboard?tab=home", label: "Home" },
  { href: "/media/category/movies", label: "Movies" },
  { href: "/media/audio", label: "Music" },
  { href: "/media", label: "Videos" },
  { href: "/media/category/mixtapes", label: "Mixtapes" },
  { href: "/media/category/reels", label: "Reels" },
  { href: "/media/category/behind-the-scenes", label: "Behind the Scenes" },
  { href: "/community", label: "Community" },
];

const sideLinks = [
  { href: "/dashboard?tab=home", label: "Home", icon: RiHome4Line },
  { href: "/media/category/movies", label: "Movies", icon: RiFilmLine },
  { href: "/media/audio", label: "Music", icon: RiMusic2Line },
  { href: "/media", label: "Videos", icon: RiVideoLine },
  { href: "/media/category/mixtapes", label: "Mixtapes", icon: RiFilmLine },
  { href: "/media/category/reels", label: "Reels", icon: RiFilmLine },
  { href: "/media/category/behind-the-scenes", label: "Behind the Scenes", icon: RiBriefcaseLine },
  { href: "/community", label: "Community", icon: RiTeamLine },
  { href: "https://worldnew.love", label: "Shop", icon: RiShoppingBag3Line, external: true },
  { href: "/dashboard/profile", label: "Profile", icon: RiUser2Line },
];

function getGroupSlugFromPath(pathname: string | null) {
  if (!pathname) return null;
  const parts = pathname.split("/").filter(Boolean);
  return parts[0] === "community" ? parts[1] ?? null : null;
}

function isActive(pathname: string | null, href: string) {
  if (!pathname || href.startsWith("http")) return false;
  const cleanHref = href.split("?")[0];
  return pathname === cleanHref || pathname.startsWith(`${cleanHref}/`);
}

export default function CommunityShell({
  children,
  dashboardHref,
  groups,
}: Readonly<{
  children: ReactNode;
  dashboardHref: string;
  groups: CommunityGroupWithTopics[];
}>) {
  const pathname = usePathname();
  const activeGroupSlug = getGroupSlugFromPath(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (activeGroupSlug) {
      setOpenGroups((current) => ({ ...current, [activeGroupSlug]: true }));
    }
  }, [activeGroupSlug]);

  const activeGroup = useMemo(
    () => groups.find((group) => group.slug === activeGroupSlug) ?? null,
    [activeGroupSlug, groups]
  );

  const sidebar = (
    <div className="flex h-full flex-col overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex h-24 items-center px-8 lg:hidden">
        <Link href={dashboardHref} className="leading-none">
          <span className="block text-3xl font-black uppercase leading-[0.85] tracking-[-0.06em] text-[#12351f]">
            World
          </span>
          <span className="block text-3xl font-black uppercase leading-[0.85] tracking-[-0.06em] text-[#12351f]">
            New
          </span>
        </Link>
      </div>

      <nav className="space-y-2 px-5 py-5">
        {sideLinks.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          const className = `flex items-center gap-4 rounded-2xl px-5 py-4 text-sm font-bold transition ${
            active
              ? "bg-white text-[#F839A9] shadow-[0_18px_45px_-30px_rgba(248,57,169,.9)]"
              : "text-stone-700 hover:bg-white/70 hover:text-[#F839A9]"
          }`;

          if (item.external) {
            return (
              <a key={item.label} href={item.href} className={className} target="_blank" rel="noreferrer">
                <Icon className="text-xl" />
                <span>{item.label}</span>
              </a>
            );
          }

          return (
            <Link key={item.label} href={item.href} className={className} onClick={() => setMobileOpen(false)}>
              <Icon className="text-xl" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="min-h-0 flex-1 px-5 pb-6">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-[#F839A9]">Groups</p>
        <div className="space-y-2">
          {groups.map((group) => {
            const isOpen = Boolean(openGroups[group.slug] ?? activeGroupSlug === group.slug);
            const isGroupActive = activeGroupSlug === group.slug;

            return (
              <div key={group.id} className="rounded-2xl border border-[#ffd1e9] bg-white/70">
                <div className="flex items-start gap-2 p-2">
                  <button
                    type="button"
                    onClick={() => setOpenGroups((current) => ({ ...current, [group.slug]: !isOpen }))}
                    className="mt-2 rounded-full p-1 text-stone-500 transition hover:bg-[#ffe4f4] hover:text-[#F839A9]"
                    aria-label={isOpen ? `Collapse ${group.name}` : `Expand ${group.name}`}
                  >
                    {isOpen ? <RiArrowDownSLine /> : <RiArrowRightSLine />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/community/${group.slug}`}
                      onClick={() => setMobileOpen(false)}
                      className={`block rounded-xl px-3 py-2 text-sm font-black transition ${
                        isGroupActive ? "bg-[#F839A9] text-white" : "text-stone-900 hover:bg-[#fff0f7]"
                      }`}
                    >
                      <span className="block truncate">{group.name}</span>
                      <span className={`mt-1 block text-[10px] font-bold uppercase tracking-[0.18em] ${isGroupActive ? "text-white/70" : "text-stone-500"}`}>
                        {group.visibility} · {group.topicCount} topic{group.topicCount === 1 ? "" : "s"}
                      </span>
                    </Link>
                  </div>
                </div>

                {isOpen ? (
                  <div className="space-y-1 border-t border-[#ffd1e9] px-3 pb-3">
                    {group.topics.length > 0 ? (
                      group.topics.map((topic) => {
                        const isTopicActive = pathname === `/community/${group.slug}/${topic.slug}`;
                        return (
                          <Link
                            key={topic.id}
                            href={`/community/${group.slug}/${topic.slug}`}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                              isTopicActive ? "bg-stone-950 text-white" : "text-stone-700 hover:bg-[#fff0f7]"
                            }`}
                          >
                            <span className="truncate">{topic.title}</span>
                            <span className="text-xs opacity-60">{topic.threadCount}</span>
                          </Link>
                        );
                      })
                    ) : (
                      <p className="px-3 py-2 text-xs text-stone-500">No topics yet.</p>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}

          {groups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#ffc5e4] bg-white/60 px-4 py-5 text-sm text-stone-600">
              No groups have been created yet.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  return (
    <div className="wn-community-page min-h-screen bg-white text-stone-950">
      <header className="fixed inset-x-0 top-0 z-40 h-20 bg-[#F839A9] text-white shadow-[0_18px_45px_-32px_rgba(248,57,169,.9)]">
        <div className="flex h-full items-center justify-between gap-5 px-5 lg:px-10">
          <button
            type="button"
            className="rounded-full border border-white/35 p-2 text-2xl lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <RiMenuLine />
            <span className="sr-only">Open community menu</span>
          </button>
          <Link href={dashboardHref} className="hidden text-2xl font-black uppercase tracking-[-0.06em] lg:block">
            World New
          </Link>
          <nav className="hidden flex-1 items-center justify-center gap-4 text-sm font-bold xl:gap-7 lg:flex">
            {topLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`border-b-2 py-2 transition ${
                  isActive(pathname, link.href) ? "border-white text-white" : "border-transparent text-white/85 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <Link href={dashboardHref} className="rounded-full border border-white/45 px-5 py-2 text-sm font-black">
            Library
          </Link>
        </div>
      </header>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-[#fff0f7] pt-20 lg:block">
        {sidebar}
      </aside>

      {mobileOpen ? (
        <>
          <button
            type="button"
            aria-label="Close community menu"
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-[#fff0f7] pt-20 shadow-2xl lg:hidden">
            {sidebar}
          </aside>
        </>
      ) : null}

      <div className="min-h-screen pt-20 lg:pl-64">
        <div className="border-b border-[#ffd1e9] bg-white px-5 py-4 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#F839A9]">Community</p>
          <h1 className="mt-1 text-2xl font-black">{activeGroup ? activeGroup.name : "Groups"}</h1>
        </div>
        <main className="min-h-screen">{children}</main>
      </div>
    </div>
  );
}
