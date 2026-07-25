import Link from "next/link";
import { notFound } from "next/navigation";

import { createCommunityTopicAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { getCommunityTopicsByGroupSlug } from "@/lib/data";

export default async function CommunityGroupPage({
  params,
}: {
  params: Promise<{ groupSlug: string }>;
}) {
  await requireUser();
  const { groupSlug } = await params;
  const { group, topics } = await getCommunityTopicsByGroupSlug(groupSlug);

  if (!group) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 lg:px-8">
      <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/community" className="text-xs uppercase tracking-[0.25em] text-[#F839A9]">
              Community / Groups
            </Link>
            <h1 className="mt-1 text-3xl font-semibold text-stone-900">{group.name}</h1>
            <p className="mt-2 text-sm text-stone-600">{group.description || "No description available."}</p>
          </div>
          <div className="rounded-full border border-stone-300 px-3 py-1 text-xs uppercase tracking-[0.18em] text-stone-600">
            {group.visibility}
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-stone-900">Create Topic</h2>
        <p className="mt-1 text-sm text-stone-600">
          Members can start new topics in this group.
        </p>
        <form action={createCommunityTopicAction} className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
          <input type="hidden" name="groupId" value={group.id} />
          <input
            name="title"
            placeholder="Topic title (e.g. Weekly Drops)"
            className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400"
          />
          <input
            name="description"
            placeholder="Topic description"
            className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400"
          />
          <input
            name="sortOrder"
            inputMode="numeric"
            placeholder="Sort order"
            className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400"
          />
          <button className="rounded-full bg-[#F839A9] px-5 py-2 text-sm font-semibold text-white lg:col-span-3 lg:justify-self-start">
            Save topic
          </button>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {topics.map((topic) => (
          <Link
            key={topic.id}
            href={`/community/${group.slug}/${topic.slug}`}
            className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Topic</p>
            <h3 className="mt-2 text-xl font-semibold text-stone-900">{topic.title}</h3>
            <p className="mt-2 text-sm text-stone-600">
              {topic.description || "Open this topic to view and create threads."}
            </p>
            <p className="mt-4 text-xs text-stone-500">{topic.threadCount} threads</p>
          </Link>
        ))}
      </section>

      {topics.length === 0 && (
        <section className="rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-600">
          No topics yet. Start the first one above.
        </section>
      )}
    </main>
  );
}
