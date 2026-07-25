"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiMenuLine,
  RiMusic2Line,
  RiUser2Line,
  RiHome4Line,
} from "react-icons/ri";

import type { CommunityGroupSummary, CommunityTopicSummary } from "@/lib/data";
import type { ReactNode } from "react";

type CommunityGroupWithTopics = CommunityGroupSummary & {
  topics: CommunityTopicSummary[];
};

function getGroupSlugFromPath(pathname: string | null) {
  if (!pathname) {
    return null;
  }

  const parts = pathname.split("/").filter(Boolean);
  return parts[0] === "community" ? parts[1] ?? null : null;
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

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#F839A9]">Community</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">Groups</h2>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-full border border-white/10 p-2 text-white lg:hidden"
          >
            <RiMenuLine className="rotate-90" />
          </button>
        </div>

        <div className="mt-4 grid gap-2 text-sm">
          <Link
            href={dashboardHref}
            className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 text-white transition hover:bg-white/10"
            onClick={() => setMobileOpen(false)}
          >
            <RiHome4Line className="text-lg text-[#F839A9]" />
            Back to dashboard
          </Link>
          <Link
            href="/media"
            className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 text-white transition hover:bg-white/10"
            onClick={() => setMobileOpen(false)}
          >
            <RiMusic2Line className="text-lg text-[#F839A9]" />
            Music + Videos
          </Link>
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 text-white transition hover:bg-white/10"
            onClick={() => setMobileOpen(false)}
          >
            <RiUser2Line className="text-lg text-[#F839A9]" />
            Profile
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-2">
          {groups.map((group) => {
            const isOpen = Boolean(openGroups[group.slug] ?? activeGroupSlug === group.slug);
            const isActive = activeGroupSlug === group.slug;

            return (
              <div key={group.id} className="rounded-3xl border border-white/10 bg-white/5">
                <div className="flex items-start gap-2 p-3">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenGroups((current) => ({
                        ...current,
                        [group.slug]: !isOpen,
                      }))
                    }
                    className="mt-1 rounded-full p-1 text-white/80 transition hover:bg-white/10"
                    aria-label={isOpen ? `Collapse ${group.name}` : `Expand ${group.name}`}
                  >
                    {isOpen ? <RiArrowDownSLine /> : <RiArrowRightSLine />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/community/${group.slug}`}
                      onClick={() => setMobileOpen(false)}
                      className={`block rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                        isActive ? "bg-[#F839A9] text-white" : "text-white hover:bg-white/10"
                      }`}
                    >
                      <span className="block truncate">{group.name}</span>
                      <span className="mt-1 block text-xs font-normal uppercase tracking-[0.22em] text-white/60">
                        {group.visibility} · {group.topicCount} topic{group.topicCount === 1 ? "" : "s"}
                      </span>
                    </Link>
                  </div>
                </div>

                {isOpen && (
                  <div className="space-y-1 border-t border-white/10 px-3 pb-3">
                    {group.topics.length > 0 ? (
                      group.topics.map((topic) => {
                        const isTopicActive =
                          pathname === `/community/${group.slug}/${topic.slug}`;

                        return (
                          <Link
                            key={topic.id}
                            href={`/community/${group.slug}/${topic.slug}`}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center justify-between rounded-2xl px-3 py-2 text-sm transition ${
                              isTopicActive
                                ? "bg-white text-stone-950"
                                : "text-white/80 hover:bg-white/10"
                            }`}
                          >
                            <span className="truncate">{topic.title}</span>
                            <span className="text-xs text-white/50">
                              {topic.threadCount}
                            </span>
                          </Link>
                        );
                      })
                    ) : (
                      <p className="px-3 py-2 text-xs text-white/50">No topics yet.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {groups.length === 0 && (
            <div className="rounded-3xl border border-dashed border-white/15 px-4 py-5 text-sm text-white/60">
              No groups have been created yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-80 bg-neutral-900 text-white shadow-2xl transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close community sidebar"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="min-h-screen lg:pl-80">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen((current) => !current)}
            className="rounded-full border border-stone-200 p-2 text-stone-900"
          >
            <RiMenuLine />
          </button>
          <p className="text-sm font-semibold text-stone-900">
            {activeGroup ? activeGroup.name : "Community"}
          </p>
          <Link
            href="/media"
            className="rounded-full bg-[#F839A9] px-3 py-2 text-xs font-semibold text-white"
          >
            Media
          </Link>
        </header>

        <main className="min-h-screen">{children}</main>
      </div>
    </div>
  );
}
