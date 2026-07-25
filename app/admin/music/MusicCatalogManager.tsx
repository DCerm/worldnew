"use client";

import { useMemo, useState } from "react";

import { saveWordPressMusicProductAction } from "@/app/actions";
import FormSubmitButton from "@/app/ui/form-submit-button";
import type { WordPressMusicProduct } from "@/lib/wordpress";

type Props = {
  products: WordPressMusicProduct[];
};

function TrackFormFields({
  product,
}: {
  product?: WordPressMusicProduct;
}) {
  const primaryTrack = product?.kind === "bundle" ? product.bundle_tracks[0] : undefined;

  return (
    <>
      <input type="hidden" name="productId" value={product?.id ?? ""} />

      <div className="grid gap-3 md:grid-cols-2">
        <input
          name="title"
          defaultValue={product?.title ?? ""}
          placeholder="Track title"
          className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400"
        />
        <input
          name="artist"
          defaultValue={product?.artist ?? primaryTrack?.artist ?? ""}
          placeholder="Artist name"
          className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400"
        />
      </div>

      <textarea
        name="description"
        rows={4}
        defaultValue={product?.description ?? product?.short_description ?? ""}
        placeholder="Description"
        className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400"
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <input
          name="genre"
          defaultValue={product?.genre ?? primaryTrack?.genre ?? ""}
          placeholder="Genre"
          className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400"
        />
        <input
          name="duration"
          defaultValue={product?.duration ?? primaryTrack?.duration ?? ""}
          placeholder="Duration e.g. 3:24"
          className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400"
        />
        <input
          name="price"
          defaultValue={product?.price ?? ""}
          placeholder="Price in GBP"
          inputMode="decimal"
          className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400"
        />
        <input
          name="previewSeconds"
          defaultValue={product?.preview_seconds ?? primaryTrack?.preview_seconds ?? 30}
          placeholder="Preview seconds"
          inputMode="numeric"
          className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400"
        />
      </div>

      <input
        name="coverImageUrl"
        defaultValue={product?.cover_image_url ?? ""}
        placeholder="Cover image URL"
        className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400"
      />

      <input
        name="streamUrl"
        defaultValue={product?.stream_url ?? primaryTrack?.stream_url ?? ""}
        placeholder="Preview stream URL"
        className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400"
      />

      <div className="space-y-1">
        <p className="text-sm font-semibold text-stone-900">Upload audio file</p>
        <p className="text-xs leading-5 text-stone-500">
          Upload the track directly here if you do not want to host it elsewhere. If you add both a URL and a file, the URL is used.
        </p>
        <input
          name="streamFile"
          type="file"
          accept="audio/*"
          className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-gray-700 file:mr-3 file:rounded-full file:border-0 file:bg-stone-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="inline-flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            name="isFeatured"
            defaultChecked={Boolean(product?.is_featured)}
            className="h-4 w-4 accent-[#F839A9]"
          />
          Feature this release
        </label>

        <label className="inline-flex items-center gap-2 text-sm text-stone-700">
          <span>Status</span>
          <select
            name="status"
            defaultValue={product?.status ?? "publish"}
            className="w-full min-w-[12rem] rounded-full border border-stone-200 bg-white px-3 py-2 text-sm text-gray-700"
          >
            <option value="publish">Publish</option>
            <option value="draft">Draft</option>
            <option value="private">Private</option>
            <option value="pending">Pending</option>
          </select>
        </label>
      </div>
    </>
  );
}

export default function MusicCatalogManager({ products }: Props) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const tracks = useMemo(
    () => products.filter((product) => product.kind === "track"),
    [products]
  );
  const bundles = useMemo(
    () => products.filter((product) => product.kind === "bundle"),
    [products]
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.3em] text-[#F839A9]">Music Store</p>
            <h1 className="mt-2 text-3xl font-semibold text-stone-950">Manage tracks cleanly from the community app</h1>
            <p className="mt-3 text-sm text-stone-600">
              Single-track products can be created and updated here. Bundle albums stay visible here too, and their preview players are now rendered directly on the WooCommerce product page from the child tracks already inside the bundle.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="rounded-full bg-[#F839A9] px-5 py-2 text-sm font-semibold text-white"
          >
            Add new track
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Tracks</p>
            <p className="mt-2 text-3xl font-semibold text-stone-950">{tracks.length}</p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Bundles</p>
            <p className="mt-2 text-3xl font-semibold text-stone-950">{bundles.length}</p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Sync</p>
            <p className="mt-2 text-sm text-stone-700">
              Published track products flow into the WordPress player and the community audio page automatically.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-stone-950">Single tracks</h2>
            <p className="mt-1 text-sm text-stone-600">
              Each published track here becomes available to the WordPress player and the community app catalog.
            </p>
          </div>
        </div>

        {tracks.length === 0 && (
          <div className="rounded-[2rem] border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-500 shadow-sm">
            No music track products were found yet.
          </div>
        )}

        {tracks.map((product) => (
          <form
            key={product.id}
            action={saveWordPressMusicProductAction}
            className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={product.cover_image_url}
                  alt={product.title}
                  className="h-20 w-20 rounded-2xl object-cover"
                />
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-500">{product.status}</p>
                  <h3 className="mt-1 text-xl font-semibold text-stone-950">{product.title}</h3>
                  <p className="mt-1 text-sm text-stone-600">
                    {product.artist} · {product.genre || "Track"}{product.price !== null ? ` · £${product.price.toFixed(2)}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {product.product_url && (
                  <a
                    href={product.product_url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700"
                  >
                    View product
                  </a>
                )}
                {product.edit_url && (
                  <a
                    href={product.edit_url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700"
                  >
                    Open in WordPress
                  </a>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <TrackFormFields product={product} />
            </div>

            <FormSubmitButton
              idleLabel="Save track"
              pendingLabel="Saving track..."
              className="mt-4 rounded-full bg-[#F839A9] px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
            />
          </form>
        ))}
      </section>

      <section className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold text-stone-950">Albums and bundles</h2>
          <p className="mt-1 text-sm text-stone-600">
            Bundles still use the WooCommerce Product Bundles structure, but they now inherit playable previews from the tracks already inside them.
          </p>
        </div>

        {bundles.length === 0 && (
          <div className="rounded-[2rem] border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-500 shadow-sm">
            No bundle products were found yet.
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-2">
          {bundles.map((bundle) => (
            <article
              key={bundle.id}
              className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img
                    src={bundle.cover_image_url}
                    alt={bundle.title}
                    className="h-20 w-20 rounded-2xl object-cover"
                  />
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Bundle album</p>
                    <h3 className="mt-1 text-xl font-semibold text-stone-950">{bundle.title}</h3>
                    <p className="mt-1 text-sm text-stone-600">
                      {bundle.bundle_tracks.length} tracks{bundle.price !== null ? ` · £${bundle.price.toFixed(2)}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {bundle.product_url && (
                    <a
                      href={bundle.product_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700"
                    >
                      View bundle
                    </a>
                  )}
                  {bundle.edit_url && (
                    <a
                      href={bundle.edit_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700"
                    >
                      Edit in WordPress
                    </a>
                  )}
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Preview sources inside bundle</p>
                <ul className="mt-3 space-y-2">
                  {bundle.bundle_tracks.map((track) => (
                    <li
                      key={track.id}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-stone-700"
                    >
                      <div>
                        <p className="font-semibold text-stone-950">{track.title}</p>
                        <p className="text-xs text-stone-500">{track.artist}</p>
                      </div>
                      <a
                        href={track.product_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700"
                      >
                        Open track
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-3xl rounded-[2rem] border border-stone-200 bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Create track</p>
                <h3 className="mt-1 text-2xl font-semibold text-stone-950">New music product</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700"
              >
                Close
              </button>
            </div>

            <form action={saveWordPressMusicProductAction} className="space-y-3">
              <TrackFormFields />
              <div className="flex items-center gap-2 pt-1">
                <FormSubmitButton
                  idleLabel="Create track"
                  pendingLabel="Creating track..."
                  className="rounded-full bg-[#F839A9] px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                />
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-full border border-stone-300 px-5 py-2 text-sm font-semibold text-stone-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
