import Link from "next/link";

import { createCommunityGroupAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { getCommunityGroups } from "@/lib/data";

export default async function CommunityGroupsPage() {
  const user = await requireUser();
  const groups = await getCommunityGroups();
  const canManage = user.roles.includes("artist_admin") || user.roles.includes("super_admin");
  const dashboardHref = canManage ? "/admin" : "/dashboard";

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 lg:px-8">
      <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#F839A9]">Community</p>
            <h1 className="mt-1 text-3xl font-semibold text-stone-900">Groups</h1>
            <p className="mt-2 text-sm text-stone-600">
              Pick a group to explore channels (topics) and join threaded discussions.
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
              href="/media"
              className="rounded-full bg-[#F839A9] px-4 py-2 text-sm font-semibold text-white"
            >
              Music + Videos
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => (
          <Link
            key={group.id}
            href={`/community/${group.slug}`}
            className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-stone-500">{group.visibility}</p>
            <h3 className="mt-2 text-xl font-semibold text-stone-900">{group.name}</h3>
            <p className="mt-2 text-sm text-stone-600">
              {group.description || "No description yet."}
            </p>
            <div className="mt-4 flex gap-3 text-xs text-stone-500">
              <span>{group.topicCount} topics</span>
              <span>{group.memberCount} members</span>
            </div>
          </Link>
        ))}
      </section>

      {groups.length === 0 && (
        <section className="rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-600">
          No groups yet. {canManage ? "Create one above to get started." : "Ask an admin to create the first group."}
        </section>
      )}
    </main>
  );
}
