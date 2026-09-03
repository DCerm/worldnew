import Link from "next/link";
import {
  RiAddLine,
  RiArrowRightLine,
  RiChat3Line,
  RiFileList3Line,
  RiFolderMusicLine,
  RiGlobalLine,
  RiSearchLine,
} from "react-icons/ri";

import { createCommunityGroupAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { getCommunityGroups } from "@/lib/data";

export default async function CommunityGroupsPage() {
  const user = await requireUser();
  const groups = await getCommunityGroups();
  const canManage = user.roles.includes("artist_admin") || user.roles.includes("super_admin");
  const dashboardHref = canManage ? "/admin" : "/dashboard";
  const activeGroup = groups[0] ?? null;
  const pinnedGroups = groups.slice(0, 2);
  const regularGroups = groups.slice(2);

  return (
    <main className="mx-auto w-full max-w-[1500px] space-y-5 px-4 py-6 lg:px-8">
      <section className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-sm">
        <div className="h-36 bg-[linear-gradient(90deg,rgba(0,0,0,.72),rgba(248,57,169,.5)),url('https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1800&q=80')] bg-cover bg-center" />
        <div className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#F839A9]">Community hub</p>
            <h1 className="mt-1 text-3xl font-black text-stone-900">World New Community</h1>
            <p className="mt-2 text-sm text-stone-600">
              Pick a group, follow the topics, and keep the conversation moving.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={dashboardHref}
              className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700"
            >
              Back to dashboard
            </Link>
            <Link
              href={activeGroup ? `/community/${activeGroup.slug}` : "/community"}
              className="rounded-full bg-[#F839A9] px-4 py-2 text-sm font-semibold text-white"
            >
              Open first group
            </Link>
          </div>
        </div>
      </section>

      {canManage && (
        <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-stone-900">Create Group</h2>
          <form action={createCommunityGroupAction} className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
            <input
              name="name"
              placeholder="Group name"
              className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400"
            />
            <input
              name="description"
              placeholder="Description"
              className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400"
            />
            <select
              name="visibility"
              className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-gray-700"
              defaultValue="public"
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
              <option value="secret">Secret</option>
            </select>
            <button className="rounded-full bg-[#F839A9] px-5 py-2 text-sm font-semibold text-white lg:col-span-3 lg:justify-self-start">
              Save group
            </button>
          </form>
        </section>
      )}

      <section className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)_320px]">
        <aside className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black text-stone-950">Community Chat</h2>
            {canManage ? (
              <Link href="/admin?tab=community" className="grid h-10 w-10 place-items-center rounded-xl bg-[#F839A9] text-white">
                <RiAddLine />
              </Link>
            ) : null}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-stone-200 px-3 py-2 text-sm text-stone-500">
            <span>Search groups...</span>
            <RiSearchLine className="ml-auto text-lg" />
          </div>
          <div className="mt-5 space-y-5">
            {pinnedGroups.length > 0 ? (
              <div>
                <p className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-stone-400">Pinned</p>
                <div className="space-y-2">
                  {pinnedGroups.map((group, index) => (
                    <Link key={group.id} href={`/community/${group.slug}`} className="flex items-center gap-3 rounded-2xl p-3 transition hover:bg-[#fff0f7]">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-[#fff0f7] text-[#F839A9]">{index + 1}</span>
                      <span className="min-w-0">
                        <strong className="block truncate text-sm text-stone-950">{group.name}</strong>
                        <span className="block truncate text-xs text-stone-500">{group.memberCount} members</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
            <div>
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-stone-400">Groups</p>
              <div className="space-y-2">
                {(regularGroups.length ? regularGroups : groups).map((group) => (
                  <Link key={group.id} href={`/community/${group.slug}`} className="flex items-center gap-3 rounded-2xl p-3 transition hover:bg-[#fff0f7]">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-[#ffe0f2] text-[#F839A9]"><RiChat3Line /></span>
                    <span className="min-w-0">
                      <strong className="block truncate text-sm text-stone-950">{group.name}</strong>
                      <span className="block truncate text-xs text-stone-500">{group.memberCount} members</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <section className="min-h-[520px] rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm">
          {activeGroup ? (
            <>
              <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-4">
                <div>
                  <h2 className="text-2xl font-black text-stone-950">{activeGroup.name}</h2>
                  <p className="mt-1 text-sm text-stone-500">
                    {activeGroup.memberCount} members · {activeGroup.description || "Open the group to join its topics and threaded discussions."}
                  </p>
                </div>
                <Link href={`/community/${activeGroup.slug}`} className="rounded-full bg-stone-950 px-4 py-2 text-sm font-black text-white">
                  Enter group
                </Link>
              </div>
              <div className="grid min-h-[380px] place-items-center text-center">
                <div>
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#fff0f7] text-3xl text-[#F839A9]">
                    <RiChat3Line />
                  </div>
                  <h3 className="mt-4 text-xl font-black text-stone-950">Start from the group page</h3>
                  <p className="mt-2 max-w-md text-sm leading-6 text-stone-500">
                    Topics and threads already work there. This overview keeps the community easy to scan before jumping in.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="grid min-h-[420px] place-items-center text-sm text-stone-500">No groups are available yet.</div>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-stone-950">About this group</h2>
            <p className="mt-4 text-sm leading-6 text-stone-600">
              {activeGroup?.description || "Choose a group to see details and join the conversation."}
            </p>
            <div className="mt-5 flex items-center gap-2 text-sm text-stone-500">
              <RiGlobalLine />
              <span>{activeGroup?.visibility || "public"} group</span>
            </div>
          </section>
          <section className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-stone-950">Group Shortcuts</h2>
            <div className="mt-4 space-y-3 text-sm font-bold text-stone-700">
              <Link href={activeGroup ? `/community/${activeGroup.slug}` : "/community"} className="flex items-center justify-between rounded-2xl p-3 hover:bg-[#fff0f7]">
                <span className="inline-flex items-center gap-3"><RiFileList3Line /> Group Topics</span>
                <RiArrowRightLine />
              </Link>
              <Link href="/media" className="flex items-center justify-between rounded-2xl p-3 hover:bg-[#fff0f7]">
                <span className="inline-flex items-center gap-3"><RiFolderMusicLine /> Media & Files</span>
                <RiArrowRightLine />
              </Link>
            </div>
          </section>
        </aside>
      </section>

      {groups.length === 0 && (
        <section className="rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-600">
          No groups yet. {canManage ? "Create one above to get started." : "Ask an admin to create the first group."}
        </section>
      )}
    </main>
  );
}
