"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { startTransition } from "react";
import { useRouter } from "next/navigation";

import {
  createMediaAction,
  deleteMediaPermanentlyAction,
  setFeaturedMediaAction,
  toggleMediaShowcaseVisibilityAction,
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

type UploadProgressState = {
  stage: "idle" | "uploading" | "saving";
  progress: number;
  message: string;
};

const IDLE_UPLOAD_STATE: UploadProgressState = {
  stage: "idle",
  progress: 0,
  message: "",
};

function FieldShell({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-semibold text-stone-900">{label}</span>
      {hint ? <span className="block text-xs leading-5 text-stone-500">{hint}</span> : null}
      {children}
    </label>
  );
}

function UploadProgressPanel({ state }: { state: UploadProgressState }) {
  if (state.stage === "idle") {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[#F839A9]/20 bg-[#F839A9]/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-stone-900">{state.message}</p>
          <p className="mt-1 text-xs text-stone-500">
            {state.stage === "uploading"
              ? "Large uploads stay in progress here while the file streams to storage."
              : "Upload complete. Saving the media record now."}
          </p>
        </div>
        <span className="text-sm font-semibold text-[#F839A9]">{state.progress}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-200">
        <div
          className="h-full rounded-full bg-[#F839A9] transition-[width] duration-200"
          style={{ width: `${state.progress}%` }}
        />
      </div>
    </div>
  );
}

export default function MediaColumns({ mediaItems, categories, plans }: Props) {
  const router = useRouter();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [createUploadState, setCreateUploadState] = useState<UploadProgressState>(IDLE_UPLOAD_STATE);
  const [editUploadState, setEditUploadState] = useState<UploadProgressState>(IDLE_UPLOAD_STATE);
  const [busyFeaturedId, setBusyFeaturedId] = useState<string | null>(null);
  const [busyVisibilityId, setBusyVisibilityId] = useState<string | null>(null);
  const [busyDeleteId, setBusyDeleteId] = useState<string | null>(null);
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

  function getOverallUploadProgress(
    files: { file: File; kind: "playback" | "poster"; mediaType: "audio" | "video" }[],
    currentIndex: number,
    currentLoaded: number
  ) {
    const totalBytes = files.reduce((sum, entry) => sum + entry.file.size, 0);

    if (totalBytes <= 0) {
      return 100;
    }

    const completedBytes = files
      .slice(0, currentIndex)
      .reduce((sum, entry) => sum + entry.file.size, 0);

    return Math.max(
      1,
      Math.min(100, Math.round(((completedBytes + currentLoaded) / totalBytes) * 100))
    );
  }

  async function uploadFile(
    file: File,
    options: {
      kind: "playback" | "poster";
      mediaType: "audio" | "video";
      uploadId: string;
      onProgress: (loadedBytes: number) => void;
    }
  ) {
    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const params = new URLSearchParams({
        kind: options.kind,
        mediaType: options.mediaType,
        uploadId: options.uploadId,
      });

      xhr.open("POST", `/api/uploads/media?${params.toString()}`);
      xhr.responseType = "json";
      xhr.setRequestHeader("x-file-name", encodeURIComponent(file.name || "upload.bin"));

      if (file.type) {
        xhr.setRequestHeader("Content-Type", file.type);
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          options.onProgress(event.loaded);
        }
      };

      xhr.onerror = () => reject(new Error("Upload failed. Please try again."));
      xhr.onabort = () => reject(new Error("Upload was cancelled."));
      xhr.onload = () => {
        const response = xhr.response as
          | { ok?: boolean; storedPath?: string; error?: string }
          | null;

        if (xhr.status >= 200 && xhr.status < 300 && response?.storedPath) {
          options.onProgress(file.size);
          resolve(response.storedPath);
          return;
        }

        reject(new Error(response?.error || "Upload failed. Please try again."));
      };

      xhr.send(file);
    });
  }

  async function uploadSelectedFiles(
    formData: FormData,
    setUploadState: (state: UploadProgressState) => void,
    uploadId: string
  ) {
    const mediaType = String(formData.get("mediaType") ?? "video") === "audio" ? "audio" : "video";
    const mediaFile = formData.get("mediaFile");
    const posterFile = formData.get("posterFile");
    const files: { file: File; kind: "playback" | "poster"; mediaType: "audio" | "video" }[] = [];

    if (mediaFile instanceof File && mediaFile.size > 0) {
      files.push({ file: mediaFile, kind: "playback", mediaType });
    }

    if (posterFile instanceof File && posterFile.size > 0) {
      files.push({ file: posterFile, kind: "poster", mediaType });
    }

    if (files.length === 0) {
      return;
    }

    setUploadState({
      stage: "uploading",
      progress: 1,
      message:
        files.length > 1 ? "Uploading media and artwork..." : "Uploading media file...",
    });

    for (const [index, entry] of files.entries()) {
      const storedPath = await uploadFile(entry.file, {
        kind: entry.kind,
        mediaType: entry.mediaType,
        uploadId: `${uploadId}-${entry.kind}`,
        onProgress: (loadedBytes) => {
          setUploadState({
            stage: "uploading",
            progress: getOverallUploadProgress(files, index, loadedBytes),
            message:
              entry.kind === "poster"
                ? "Uploading poster artwork..."
                : "Uploading media file...",
          });
        },
      });

      if (entry.kind === "playback") {
        formData.set("uploadedPlaybackPath", storedPath);
      } else {
        formData.set("uploadedPosterPath", storedPath);
      }
    }

    formData.delete("mediaFile");
    formData.delete("posterFile");
  }

  async function handleCreateMedia(formData: FormData) {
    try {
      await uploadSelectedFiles(formData, setCreateUploadState, crypto.randomUUID());
      setCreateUploadState({
        stage: "saving",
        progress: 100,
        message: "Saving media details...",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Upload failed. Please try again.";
      setCreateUploadState(IDLE_UPLOAD_STATE);
      pushToast("error", message);
      return;
    }

    const result = await createMediaAction(formData);
    setCreateUploadState(IDLE_UPLOAD_STATE);
    pushToast(result.type, result.message);

    if (!result.ok) {
      return;
    }

    setIsAddOpen(false);
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleUpdateMedia(formData: FormData) {
    const uploadId = String(formData.get("mediaId") ?? "").trim() || crypto.randomUUID();

    try {
      await uploadSelectedFiles(formData, setEditUploadState, uploadId);
      setEditUploadState({
        stage: "saving",
        progress: 100,
        message: "Saving media details...",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Upload failed. Please try again.";
      setEditUploadState(IDLE_UPLOAD_STATE);
      pushToast("error", message);
      return;
    }

    const result = await updateMediaAction(formData);
    setEditUploadState(IDLE_UPLOAD_STATE);
    pushToast(result.type, result.message);

    if (!result.ok) {
      return;
    }

    setEditingId(null);
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleSetFeatured(formData: FormData) {
    const mediaId = String(formData.get("mediaId") ?? "").trim();
    setBusyFeaturedId(mediaId || null);
    const result = await setFeaturedMediaAction(formData);
    setBusyFeaturedId(null);
    pushToast(result.type, result.message);

    if (!result.ok) {
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  async function handleToggleShowcaseVisibility(formData: FormData) {
    const mediaId = String(formData.get("mediaId") ?? "").trim();
    setBusyVisibilityId(mediaId || null);
    const result = await toggleMediaShowcaseVisibilityAction(formData);
    setBusyVisibilityId(null);
    pushToast(result.type, result.message);

    if (!result.ok) {
      return;
    }

    setOpenMenuId(null);
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleDeleteMedia(formData: FormData) {
    const mediaId = String(formData.get("mediaId") ?? "").trim();
    setBusyDeleteId(mediaId || null);
    const result = await deleteMediaPermanentlyAction(formData);
    setBusyDeleteId(null);
    pushToast(result.type, result.message);

    if (!result.ok) {
      return;
    }

    setDeleteConfirmId(null);
    setOpenMenuId(null);
    startTransition(() => {
      router.refresh();
    });
  }

  function renderMediaCard(item: MediaCard) {
    return (
      <article key={item.id} className="relative rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-600">{item.mediaType}</p>
            {item.isFeatured && (
              <span className="rounded-full bg-[#F839A9]/10 px-3 py-1 text-xs font-semibold text-[#F839A9]">
                Featured
              </span>
            )}
            {item.hiddenFromPublicPages && (
              <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">
                Hidden from public pages
              </span>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              title="Actions"
              aria-label="Actions"
              onClick={() => {
                setOpenMenuId((current) => (current === item.id ? null : item.id));
                setDeleteConfirmId(null);
              }}
              className="grid h-9 w-9 place-items-center rounded-full border border-stone-200 bg-stone-50 text-lg text-stone-700 transition hover:border-stone-300 hover:bg-stone-100"
            >
              ⋯
            </button>

            {openMenuId === item.id && (
              <div className="absolute right-0 top-11 z-20 w-60 rounded-2xl border border-stone-200 bg-white p-2 shadow-xl">
                {deleteConfirmId === item.id ? (
                  <div className="space-y-2 rounded-xl bg-red-50 p-3">
                    <p className="text-sm font-semibold text-red-700">Delete permanently?</p>
                    <p className="text-xs leading-5 text-red-600">
                      This removes the media record and any locally uploaded files. This cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <form action={handleDeleteMedia} className="flex-1">
                        <input type="hidden" name="mediaId" value={item.id} />
                        <button
                          disabled={busyDeleteId === item.id}
                          className="w-full rounded-full bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {busyDeleteId === item.id ? "Deleting..." : "Confirm delete"}
                        </button>
                      </form>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(null)}
                        className="rounded-full border border-red-200 px-3 py-2 text-xs font-semibold text-red-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <form action={handleToggleShowcaseVisibility}>
                      <input type="hidden" name="mediaId" value={item.id} />
                      <button
                        disabled={busyVisibilityId === item.id}
                        className="w-full rounded-xl px-3 py-2 text-left text-sm text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busyVisibilityId === item.id
                          ? "Updating..."
                          : item.hiddenFromPublicPages
                          ? "Show on homepage and media page"
                          : "Hide from homepage and media page"}
                      </button>
                    </form>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(item.id)}
                      className="w-full rounded-xl px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
                    >
                      Delete permanently
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
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
            className="rounded-full bg-[#F839A9] px-4 py-2 text-xs font-semibold text-white"
          >
            Edit
          </button>
          {item.mediaType === "video" ? (
            <form action={handleSetFeatured}>
              <input type="hidden" name="mediaId" value={item.id} />
              <button
                disabled={busyFeaturedId === item.id}
                className="rounded-full border border-[#F839A9] px-4 py-2 text-xs font-semibold text-[#F839A9] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyFeaturedId === item.id ? "Updating..." : "Set as featured"}
              </button>
            </form>
          ) : (
            <span className="rounded-full border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-500">
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
            className="rounded-full bg-[#F839A9] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#F839A9]"
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

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void handleCreateMedia(new FormData(event.currentTarget));
              }}
              encType="multipart/form-data"
              className="space-y-3"
            >
              <UploadProgressPanel state={createUploadState} />
              
              <FieldShell
                label="Title"
                hint=""
              >
                <input
                  name="title"
                  placeholder="Title"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                />
              </FieldShell>
              <FieldShell
                label="Description"
                hint="Give members context about the track or video. This appears in the media experience and detail views."
              >
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Description"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                />
              </FieldShell>
              <div className="grid gap-2 md:grid-cols-2">
                <FieldShell
                  label="Media type"
                  hint="Choose audio for music and spoken-word releases, or video for the Netflix-style experience."
                >
                  <select
                    name="mediaType"
                    defaultValue="video"
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="video">Video</option>
                    <option value="audio">Audio</option>
                  </select>
                </FieldShell>
                <FieldShell
                  label="Category"
                  hint="Use categories to group releases together on the public media pages."
                >
                  <select
                    name="categoryId"
                    defaultValue=""
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">No category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </FieldShell>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <FieldShell
                  label="Visibility"
                  hint="Control who has access to this release."
                >
                  <select
                    name="visibility"
                    defaultValue="community"
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="community">Whole community</option>
                    <option value="paid">Paid users</option>
                    <option value="plan_specific">Specific plan</option>
                    <option value="public">Public</option>
                  </select>
                </FieldShell>
                <FieldShell
                  label="Membership plan"
                  hint="Only needed when visibility is set to a specific plan."
                >
                  <select
                    name="planCode"
                    defaultValue=""
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Any plan</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.code}>
                        {plan.name}
                      </option>
                    ))}
                  </select>
                </FieldShell>
              </div>
              <FieldShell
                label="Upload media file"
                hint="Best for files you want stored directly with the platform. Accepted: audio or video."
              >
                <input
                  name="mediaFile"
                  type="file"
                  accept="audio/*,video/*"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                />
              </FieldShell>
              <FieldShell
                label="Upload poster image"
                hint="Optional cover image for cards, audio artwork, and video posters."
              >
                <input
                  name="posterFile"
                  type="file"
                  accept="image/*"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                />
              </FieldShell>
              <FieldShell
                label="Playback URL"
                hint="Use this if the file lives on external storage. If you upload a file above, this can stay empty."
              >
                <input
                  name="playbackUrl"
                  placeholder="Playback URL (optional if file is uploaded)"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                />
              </FieldShell>
              <FieldShell
                label="Poster image URL"
                hint="Optional external image URL. The uploaded poster above takes priority."
              >
                <input
                  name="posterImageUrl"
                  placeholder="Poster image URL (optional)"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                />
              </FieldShell>
              <div className="grid gap-2 md:grid-cols-2">
                <FieldShell
                  label="Featured artists"
                  hint="Separate multiple names with commas if needed."
                >
                  <input
                    name="featuredArtists"
                    placeholder="Featured artists"
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                  />
                </FieldShell>
                <FieldShell
                  label="Preview seconds"
                  hint="How long the preview player should run before stopping."
                >
                  <input
                    name="previewSeconds"
                    type="number"
                    min={5}
                    step={1}
                    defaultValue={30}
                    placeholder="Preview seconds"
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                  />
                </FieldShell>
              </div>
              <FieldShell
                label="Tags"
                hint="Comma-separated tags help with discovery and filtering."
              >
                <input
                  name="tags"
                  placeholder="Tags (comma-separated)"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                />
              </FieldShell>
              <label className="inline-flex items-start gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
                <input type="checkbox" name="isFeatured" className="mt-0.5 h-4 w-4 accent-[#F839A9]" />
                <span>
                  <span className="block font-semibold text-stone-900">Featured hero title</span>
                  <span className="mt-1 block text-xs text-stone-500">
                    Use this only for the main video you want highlighted at the top of the Netflix-style page.
                  </span>
                </span>
              </label>
              <div className="flex items-center gap-2 pt-1">
                <button
                  disabled={createUploadState.stage !== "idle"}
                  className="rounded-full bg-[#F839A9] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {createUploadState.stage === "uploading"
                    ? `Uploading... ${createUploadState.progress}%`
                    : createUploadState.stage === "saving"
                    ? "Publishing..."
                    : "Publish media"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  disabled={createUploadState.stage !== "idle"}
                  className="rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
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

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void handleUpdateMedia(new FormData(event.currentTarget));
              }}
              encType="multipart/form-data"
              className="space-y-3"
            >
              <input type="hidden" name="mediaId" value={editingItem.id} />
              <UploadProgressPanel state={editUploadState} />
              <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 text-sm text-stone-600">
                Update the playback source, poster, visibility, or preview settings here. Uploading a new file replaces the existing media asset for this item.
              </div>
              <FieldShell label="Title" hint="The public release name shown across the app.">
                <input
                  name="title"
                  defaultValue={editingItem.title}
                  placeholder="Title"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                />
              </FieldShell>
              <FieldShell label="Description" hint="Use this for context, notes, credits, or release details.">
                <textarea
                  name="description"
                  defaultValue={editingItem.description ?? ""}
                  rows={3}
                  placeholder="Description"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                />
              </FieldShell>
              <div className="grid gap-2 md:grid-cols-2">
                <FieldShell label="Media type" hint="Switch between audio and video presentation.">
                  <select
                    name="mediaType"
                    defaultValue={editingItem.mediaType}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="video">Video</option>
                    <option value="audio">Audio</option>
                  </select>
                </FieldShell>
                <FieldShell label="Category" hint="Choose where this release should appear in grouped media shelves.">
                  <select
                    name="categoryId"
                    defaultValue={editingCategoryId}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">No category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </FieldShell>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <FieldShell label="Visibility" hint="Choose who gets access to this media item.">
                  <select
                    name="visibility"
                    defaultValue={editingItem.visibility}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="community">Whole community</option>
                    <option value="paid">Paid users</option>
                    <option value="plan_specific">Specific plan</option>
                    <option value="public">Public</option>
                  </select>
                </FieldShell>
                <FieldShell label="Membership plan" hint="Only needed for plan-specific access.">
                  <select
                    name="planCode"
                    defaultValue={editingItem.planCodes[0] ?? ""}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Any plan</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.code}>
                        {plan.name}
                      </option>
                    ))}
                  </select>
                </FieldShell>
              </div>
              <FieldShell label="Replace media file" hint="Leave empty to keep the current uploaded file or playback source.">
                <input
                  name="mediaFile"
                  type="file"
                  accept="audio/*,video/*"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                />
              </FieldShell>
              <FieldShell label="Replace poster image" hint="Leave empty to keep the current artwork.">
                <input
                  name="posterFile"
                  type="file"
                  accept="image/*"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                />
              </FieldShell>
              <FieldShell label="Playback URL" hint="Paste a hosted media URL if this release should stream from external storage.">
                <input
                  name="playbackUrl"
                  defaultValue={editingItem.rawPlaybackUrl ?? ""}
                  placeholder="Playback URL"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                />
              </FieldShell>
              <FieldShell label="Poster image URL" hint="Optional external image URL for the media card and poster.">
                <input
                  name="posterImageUrl"
                  defaultValue={editingItem.posterImageUrl ?? ""}
                  placeholder="Poster image URL"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                />
              </FieldShell>
              <div className="grid gap-2 md:grid-cols-2">
                <FieldShell label="Featured artists" hint="List collaborators or guest appearances.">
                  <input
                    name="featuredArtists"
                    defaultValue={editingItem.featuredArtists ?? ""}
                    placeholder="Featured artists"
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                  />
                </FieldShell>
                <FieldShell label="Preview seconds" hint="Controls how long the preview player runs before it stops automatically.">
                  <input
                    name="previewSeconds"
                    type="number"
                    min={5}
                    step={1}
                    defaultValue={editingItem.previewSeconds ?? 30}
                    placeholder="Preview seconds"
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                  />
                </FieldShell>
              </div>
              <FieldShell label="Tags" hint="Use commas between tags, for example: acoustic, worship, live.">
                <input
                  name="tags"
                  defaultValue={editingItem.tags.join(", ")}
                  placeholder="Tags (comma-separated)"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                />
              </FieldShell>
              <label className="inline-flex items-start gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
                <input
                  type="checkbox"
                  name="isFeatured"
                  defaultChecked={editingItem.isFeatured}
                  className="mt-0.5 h-4 w-4 accent-[#F839A9]"
                />
                <span>
                  <span className="block font-semibold text-stone-900">Featured hero media</span>
                  <span className="mt-1 block text-xs text-stone-500">
                    Turn this on only for the single headline video you want leading the media page.
                  </span>
                </span>
              </label>
              <div className="flex items-center gap-2 pt-1">
                <button
                  disabled={editUploadState.stage !== "idle"}
                  className="rounded-full bg-[#F839A9] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {editUploadState.stage === "uploading"
                    ? `Uploading... ${editUploadState.progress}%`
                    : editUploadState.stage === "saving"
                    ? "Saving..."
                    : "Save media changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  disabled={editUploadState.stage !== "idle"}
                  className="rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
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
                ? "border-[#F839A9]/40 bg-[#F839A9]/10 text-[#F839A9]"
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
