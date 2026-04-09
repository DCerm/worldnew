"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createMediaAction,
  setFeaturedMediaAction,
  updateMediaAction,
} from "@/app/actions";
import type { MediaCard } from "@/lib/data";

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
};

type PlanOption = {
  id: string;
  code: string;
  name: string;
};

type Props = {
  mediaItems: MediaCard[];
  categories: CategoryOption[];
  plans: PlanOption[];
};

export default function MediaColumns({ mediaItems, categories, plans }: Props) {
  const router = useRouter();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    id: number;
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setToast(null);
    }, 3800);

    return () => window.clearTimeout(timeout);
  }, [toast]);

  const videos = useMemo(
    () => mediaItems.filter((item) => item.mediaType === "video"),
    [mediaItems]
  );
  const audios = useMemo(
    () => mediaItems.filter((item) => item.mediaType === "audio"),
    [mediaItems]
  );

  const editingItem = useMemo(
    () => mediaItems.find((item) => item.id === editingId) ?? null,
    [editingId, mediaItems]
  );

  const editingCategoryId = useMemo(() => {
    if (!editingItem?.categorySlug) {
      return "";
    }

    return categories.find((category) => category.slug === editingItem.categorySlug)?.id ?? "";
  }, [categories, editingItem]);

  function pushToast(
    type: "success" | "error" | "info",
    message: string
  ) {
    setToast({
      id: Date.now(),
      type,
      message,
    });
  }

  async function handleCreateMedia(formData: FormData) {
    const result = await createMediaAction(formData);
    pushToast(result.type, result.message);

    if (!result.ok) {
      return;
    }

    setIsAddOpen(false);
    router.refresh();
  }

  async function handleUpdateMedia(formData: FormData) {
    const result = await updateMediaAction(formData);
    pushToast(result.type, result.message);

    if (!result.ok) {
      return;
    }

    setEditingId(null);
    router.refresh();
  }

  async function handleSetFeatured(formData: FormData) {
    const result = await setFeaturedMediaAction(formData);
    pushToast(result.type, result.message);

    if (!result.ok) {
      return;
    }

    router.refresh();
  }

  function renderMediaCard(item: MediaCard) {
    return (
      <article key={item.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-600">{item.mediaType}</p>
          {item.isFeatured && (
            <span className="rounded-full bg-[#0091ff]/10 px-3 py-1 text-xs font-semibold text-[#0091ff]">
              Featured
            </span>
          )}
        </div>
        <h2 className="mt-2 text-lg font-semibold text-stone-950">{item.title}</h2>
        <p className="mt-2 text-sm text-stone-500">{item.description ?? "No description yet."}</p>
        {item.featuredArtists && (
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-stone-500">
            Featuring: {item.featuredArtists}
          </p>
        )}
        {item.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <span key={tag} className="rounded-full border border-stone-200 bg-stone-50 px-2 py-1 text-xs text-stone-600">
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEditingId(item.id)}
            className="rounded-full bg-[#0091ff] px-4 py-2 text-xs font-semibold text-white"
          >
            Edit
          </button>
          {item.mediaType === "video" ? (
            <form action={handleSetFeatured}>
              <input type="hidden" name="mediaId" value={item.id} />
              <button className="rounded-full border border-[#0091ff] px-4 py-2 text-xs font-semibold text-[#0091ff]">
                Set as featured
              </button>
            </form>
          ) : (
            <span className="rounded-full border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-500">
              Hero feature is for videos
            </span>
          )}
        </div>
      </article>
    );
  }

  return (
    <>
      <section className="rounded-[2rem] border border-stone-200 bg-white p-6 text-gray-700 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-stone-950">Media Publishing</h1>
            <p className="mt-2 text-sm text-stone-500">
              Add audio or video entries and define who can unlock them.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="rounded-full bg-[#0091ff] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#007fe0]"
          >
            Add New
          </button>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr] lg:py-12 lg:px-0">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-600">Videos</h2>
            <span className="text-xs uppercase tracking-[0.2em] text-stone-500">{videos.length} total</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {videos.map(renderMediaCard)}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-600">Audio</h2>
            <span className="text-xs uppercase tracking-[0.2em] text-stone-500">{audios.length} total</span>
          </div>
          <div className="space-y-4">
            {audios.map(renderMediaCard)}
          </div>
        </div>
      </section>

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-stone-200 bg-white p-5 text-gray-700 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Add media</p>
                <h3 className="mt-1 text-2xl font-semibold text-stone-950">New media</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="rounded-full border border-stone-300 px-3 py-1 text-sm"
              >
                Close
              </button>
            </div>

            <form action={handleCreateMedia} className="space-y-3">
              <input
                name="title"
                placeholder="Title"
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
              />
              <textarea
                name="description"
                rows={3}
                placeholder="Description"
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
              />
              <div className="grid gap-2 md:grid-cols-2">
                <select
                  name="mediaType"
                  defaultValue="video"
                  className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="video">Video</option>
                  <option value="audio">Audio</option>
                </select>
                <select
                  name="categoryId"
                  defaultValue=""
                  className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">No category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <select
                  name="visibility"
                  defaultValue="community"
                  className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="community">Whole community</option>
                  <option value="paid">Paid users</option>
                  <option value="plan_specific">Specific plan</option>
                  <option value="public">Public</option>
                </select>
                <select
                  name="planCode"
                  defaultValue=""
                  className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Any plan</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.code}>
                      {plan.name}
                    </option>
                  ))}
                </select>
              </div>
              <input
                name="mediaFile"
                type="file"
                accept="audio/*,video/*"
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
              />
              <input
                name="posterFile"
                type="file"
                accept="image/*"
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
              />
              <input
                name="playbackUrl"
                placeholder="Playback URL (optional if file is uploaded)"
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
              />
              <input
                name="posterImageUrl"
                placeholder="Poster image URL (optional)"
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
              />
              <input
                name="featuredArtists"
                placeholder="Featured artists"
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
              />
              <input
                name="tags"
                placeholder="Tags (comma-separated)"
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
              />
              <label className="inline-flex items-center gap-2 text-xs text-stone-700">
                <input type="checkbox" name="isFeatured" className="h-4 w-4 accent-[#0091ff]" />
                Mark as featured hero title
              </label>
              <div className="flex items-center gap-2 pt-1">
                <button className="rounded-full bg-[#0091ff] px-4 py-2 text-xs font-semibold text-white">
                  Publish media
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-stone-200 bg-white p-5 text-gray-700 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Edit media</p>
                <h3 className="mt-1 text-2xl font-semibold text-stone-950">{editingItem.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="rounded-full border border-stone-300 px-3 py-1 text-sm"
              >
                Close
              </button>
            </div>

            <form action={handleUpdateMedia} className="space-y-3">
              <input type="hidden" name="mediaId" value={editingItem.id} />
              <input
                name="title"
                defaultValue={editingItem.title}
                placeholder="Title"
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
              />
              <textarea
                name="description"
                defaultValue={editingItem.description ?? ""}
                rows={3}
                placeholder="Description"
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
              />
              <div className="grid gap-2 md:grid-cols-2">
                <select
                  name="mediaType"
                  defaultValue={editingItem.mediaType}
                  className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="video">Video</option>
                  <option value="audio">Audio</option>
                </select>
                <select
                  name="categoryId"
                  defaultValue={editingCategoryId}
                  className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">No category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <select
                  name="visibility"
                  defaultValue={editingItem.visibility}
                  className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="community">Whole community</option>
                  <option value="paid">Paid users</option>
                  <option value="plan_specific">Specific plan</option>
                  <option value="public">Public</option>
                </select>
                <select
                  name="planCode"
                  defaultValue={editingItem.planCodes[0] ?? ""}
                  className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Any plan</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.code}>
                      {plan.name}
                    </option>
                  ))}
                </select>
              </div>
              <input
                name="mediaFile"
                type="file"
                accept="audio/*,video/*"
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
              />
              <input
                name="posterFile"
                type="file"
                accept="image/*"
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
              />
              <input
                name="playbackUrl"
                defaultValue={editingItem.playbackUrl ?? ""}
                placeholder="Playback URL"
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
              />
              <input
                name="posterImageUrl"
                defaultValue={editingItem.posterImageUrl ?? ""}
                placeholder="Poster image URL"
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
              />
              <input
                name="featuredArtists"
                defaultValue={editingItem.featuredArtists ?? ""}
                placeholder="Featured artists"
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
              />
              <input
                name="tags"
                defaultValue={editingItem.tags.join(", ")}
                placeholder="Tags (comma-separated)"
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
              />
              <label className="inline-flex items-center gap-2 text-xs text-stone-700">
                <input
                  type="checkbox"
                  name="isFeatured"
                  defaultChecked={editingItem.isFeatured}
                  className="h-4 w-4 accent-[#0091ff]"
                />
                Featured hero media
              </label>
              <div className="flex items-center gap-2 pt-1">
                <button className="rounded-full bg-[#0091ff] px-4 py-2 text-xs font-semibold text-white">
                  Save media changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="pointer-events-none fixed right-4 top-4 z-[120]">
          <div
            className={`pointer-events-auto rounded-2xl border px-4 py-3 text-sm shadow-lg ${
              toast.type === "error"
                ? "border-red-300 bg-red-50 text-red-700"
                : toast.type === "info"
                ? "border-blue-300 bg-blue-50 text-blue-700"
                : "border-emerald-300 bg-emerald-50 text-emerald-700"
            }`}
            role="status"
            aria-live="polite"
          >
            {toast.message}
          </div>
        </div>
      )}
    </>
  );
}
