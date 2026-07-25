import Link from "next/link";
import { notFound } from "next/navigation";

import {
  createCommunityThreadAction,
  createCommunityThreadReplyAction,
} from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { getCommunityThreadsByTopic } from "@/lib/data";

export default async function CommunityTopicPage({
  params,
}: {
  params: Promise<{ groupSlug: string; topicSlug: string }>;
}) {
  await requireUser();
  const { groupSlug, topicSlug } = await params;
  const { group, topic, threads } = await getCommunityThreadsByTopic(groupSlug, topicSlug);

  if (!group || !topic) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 lg:px-8">
      <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-[#F839A9]">
            <Link href="/community">Community</Link> /{" "}
            <Link href={`/community/${group.slug}`}>{group.name}</Link>
          </p>
          <h1 className="text-3xl font-semibold text-stone-900">{topic.title}</h1>
          <p className="text-sm text-stone-600">
            {topic.description || "Start a thread and join the discussion in this topic."}
          </p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-stone-900">Create Thread</h2>
        <form action={createCommunityThreadAction} className="mt-4 space-y-3">
          <input type="hidden" name="topicId" value={topic.id} />
          <input type="hidden" name="groupSlug" value={group.slug} />
          <input type="hidden" name="topicSlug" value={topic.slug} />
          <input
            name="title"
            placeholder="Thread title"
            className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400"
          />
          <textarea
            name="body"
            rows={4}
            placeholder="Write your thread..."
            className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400"
          />
          <button className="rounded-full bg-[#F839A9] px-5 py-2 text-sm font-semibold text-white">
            Post thread
          </button>
        </form>
      </section>

      <section className="space-y-5">
        {threads.map((thread) => (
          <article key={thread.id} className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-stone-900">{thread.title}</h3>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-stone-500">
                  {thread.authorName}
                  {thread.isPinned ? " · pinned" : ""}
                  {thread.isLocked ? " · locked" : ""}
                </p>
              </div>
              <p className="text-xs text-stone-500">{new Date(thread.createdAt).toLocaleString()}</p>
            </div>

            <p className="mt-3 text-sm text-stone-700">{thread.body}</p>

            <div className="mt-4 space-y-3 rounded-2xl bg-stone-50 p-4">
              {thread.replies.map((reply) => (
                <div key={reply.id} className="rounded-xl border border-stone-200 bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
                    {reply.authorName}
                    {reply.parentReplyId ? " · reply" : ""}
                  </p>
                  <p className="mt-1 text-sm text-stone-700">{reply.body}</p>
                </div>
              ))}

              {!thread.isLocked && (
                <form action={createCommunityThreadReplyAction} className="flex gap-2">
                  <input type="hidden" name="threadId" value={thread.id} />
                  <input type="hidden" name="groupSlug" value={group.slug} />
                  <input type="hidden" name="topicSlug" value={topic.slug} />
                  <input
                    name="body"
                    placeholder="Reply to this thread..."
                    className="flex-1 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-gray-700 placeholder:text-gray-400"
                  />
                  <button className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white">
                    Reply
                  </button>
                </form>
              )}
            </div>
          </article>
        ))}
      </section>

      {threads.length === 0 && (
        <section className="rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-600">
          No threads yet. Start the first conversation for this topic.
        </section>
      )}
    </main>
  );
}
