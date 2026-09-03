"use client";

import { useMemo, useState } from "react";

import { saveWordPressMusicProductAction } from "@/app/actions";
import FormSubmitButton from "@/app/ui/form-submit-button";
import type { WordPressMusicProduct } from "@/lib/wordpress";

type Props = {
  products: WordPressMusicProduct[];
};

const PAGE_SIZE = 12;

function getProductCategory(product: WordPressMusicProduct) {
  return product.kind === "bundle" ? "Album" : "Track";
}

function formatProductPrice(product: WordPressMusicProduct) {
  if (typeof product.price !== "number" || !Number.isFinite(product.price)) {
    return "No price";
  }

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: product.currency || "GBP",
  }).format(product.price);
}

function formatPublishedDate(value?: string | null) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function TrackFormFields({
  product,
  releaseKind,
  availableTracks,
}: {
  product?: WordPressMusicProduct;
  releaseKind?: "track" | "album";
  availableTracks: WordPressMusicProduct[];
}) {
  const primaryTrack = product?.kind === "bundle" ? product.bundle_tracks[0] : undefined;
  const effectiveKind = releaseKind ?? (product?.kind === "bundle" ? "album" : "track");
  const isAlbum = effectiveKind === "album";
  const showOnWebsite = product?.show_on_website ?? true;
  const showOnCommunity = product?.show_on_community ?? true;
  const communityPlaybackMode = product?.community_playback_mode ?? "preview";
  const albumOffer = product?.album_community_offer;
  const albumPackage = product?.album_package;
  const albumPackageMode = product?.album_package_mode ?? ((product?.album_track_product_ids?.length ?? 0) > 0 ? "existing_tracks" : "zip_package");
  const selectedAlbumTrackIds = new Set(product?.album_track_product_ids ?? []);

  return (
    <>
      <input type="hidden" name="productId" value={product?.id ?? ""} />
      <input type="hidden" name="releaseKind" value={effectiveKind} />

      <div className="grid gap-3 md:grid-cols-2">
        <input
          name="title"
          defaultValue={product?.title ?? ""}
          placeholder={isAlbum ? "Album title" : "Track title"}
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
          placeholder="Normal website price"
          inputMode="decimal"
          className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400"
        />
        <input
          name="communityPrice"
          defaultValue={product?.community_price ?? product?.album_community_offer?.price ?? ""}
          placeholder="Community price override"
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
        <input
          name="previewStartSeconds"
          defaultValue={product?.preview_start_seconds ?? primaryTrack?.preview_start_seconds ?? 0}
          placeholder="Preview starts at"
          inputMode="numeric"
          className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400"
        />
        <input
          name="previewEndSeconds"
          defaultValue={product?.preview_end_seconds ?? primaryTrack?.preview_end_seconds ?? ""}
          placeholder="Preview ends at (optional)"
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
        placeholder={isAlbum ? "Optional album preview stream URL override" : "Optional stream URL override"}
        className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400"
      />

      <div className={isAlbum ? "hidden" : "space-y-1"}>
        <p className="text-sm font-semibold text-stone-900">Upload audio file</p>
        <p className="text-xs leading-5 text-stone-500">
          Prefer setting the audio as a WooCommerce downloadable file on the product. This field is only for a temporary override or direct upload.
        </p>
        <input
          name="streamFile"
          type="file"
          accept="audio/*"
          className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-gray-700 file:mr-3 file:rounded-full file:border-0 file:bg-stone-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
        />
      </div>

      {isAlbum ? (
        <fieldset className="rounded-2xl border border-[#ffd1e9] bg-[#fff8fc] p-4">
          <legend className="px-2 text-sm font-semibold text-stone-900">Album delivery and community offer</legend>
          <div className="mb-4 grid gap-3 md:grid-cols-2">
            <label className="rounded-2xl border border-[#ffd1e9] bg-white p-4 text-sm text-stone-700">
              <span className="flex items-center gap-2 font-black text-stone-950">
                <input
                  type="radio"
                  name="albumPackageMode"
                  value="existing_tracks"
                  defaultChecked={albumPackageMode === "existing_tracks"}
                  className="h-4 w-4 accent-[#F839A9]"
                />
                Use existing track products
              </span>
              <span className="mt-2 block text-xs leading-5 text-stone-500">
                Best when each track already has its own product. Tracks can still be bought individually.
              </span>
            </label>
            <label className="rounded-2xl border border-[#ffd1e9] bg-white p-4 text-sm text-stone-700">
              <span className="flex items-center gap-2 font-black text-stone-950">
                <input
                  type="radio"
                  name="albumPackageMode"
                  value="zip_package"
                  defaultChecked={albumPackageMode === "zip_package"}
                  className="h-4 w-4 accent-[#F839A9]"
                />
                Use one album ZIP
              </span>
              <span className="mt-2 block text-xs leading-5 text-stone-500">
                Best when the album is sold as one package. Tracks in this option are not standalone products.
              </span>
            </label>
          </div>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            <input
              name="albumPackageZipUrl"
              defaultValue={albumPackage?.zip_url ?? ""}
              placeholder="Album ZIP download URL"
              className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400"
            />
            <input
              name="albumCommunityPrice"
              defaultValue={albumOffer?.price ?? product?.community_price ?? ""}
              placeholder="Community price override"
              inputMode="decimal"
              className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400"
            />
            <input
              name="albumMinimumOfferPrice"
              defaultValue={albumOffer?.minimum_offer_price ?? ""}
              placeholder="Minimum offer price"
              inputMode="decimal"
              className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                name="albumEnableOfferPrice"
                defaultChecked={Boolean(albumOffer?.enable_offer_price)}
                className="h-4 w-4 accent-[#F839A9]"
              />
              Let fans offer a price
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                name="albumEnableDonation"
                defaultChecked={Boolean(albumOffer?.enable_donation)}
                className="h-4 w-4 accent-[#F839A9]"
              />
              Enable donations
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                name="albumAllowIndividualTrackSales"
                defaultChecked={Boolean(albumOffer?.allow_individual_track_sales)}
                className="h-4 w-4 accent-[#F839A9]"
              />
              Allow individual track sales
            </label>
          </div>
          <p className="mt-3 text-xs leading-5 text-stone-500">
            Select existing track products below to create the community album tracklist. Use the ZIP field when the album should be delivered as one download package.
          </p>
          <input type="hidden" name="albumTrackSelectionEnabled" value="yes" />
          <div className="mt-4 rounded-xl border border-[#ffd1e9] bg-white p-3">
            <p className="text-sm font-semibold text-stone-900">Album tracks, in order</p>
            <p className="mt-1 text-xs leading-5 text-stone-500">Tick tracks, then set their numbered album order. They remain available for individual purchase.</p>
            <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
              {availableTracks.length > 0 ? availableTracks.map((track, index) => (
                <label key={track.id} className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm text-stone-700 hover:bg-[#fff8fc]">
                  <input type="checkbox" name="albumTrackProductIds" value={track.id} defaultChecked={selectedAlbumTrackIds.has(track.id)} className="h-4 w-4 accent-[#F839A9]" />
                  <span className="min-w-0"><strong className="block truncate text-stone-900">{track.title}</strong><span className="text-xs text-stone-500">{track.artist || "World New"}{track.duration ? ` · ${track.duration}` : ""}</span></span>
                  <input type="number" min="1" name={`albumTrackPosition_${track.id}`} defaultValue={(product?.album_track_product_ids ?? []).indexOf(track.id) + 1 || index + 1} aria-label={`Album order for ${track.title}`} className="ml-auto w-14 rounded-lg border border-stone-200 px-2 py-1 text-center text-xs font-bold" />
                </label>
              )) : <p className="rounded-xl bg-[#fff8fc] p-3 text-xs text-stone-500">Create and publish at least one track first, then return here to add it to this album.</p>}
            </div>
          </div>
        </fieldset>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <label className="inline-flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            name="showOnWebsite"
            defaultChecked={showOnWebsite}
            className="h-4 w-4 accent-[#F839A9]"
          />
          Show on website
        </label>

        <label className="inline-flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            name="showOnCommunity"
            defaultChecked={showOnCommunity}
            className="h-4 w-4 accent-[#F839A9]"
          />
          Show in community
        </label>

        <label className="inline-flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            name="isFeatured"
            defaultChecked={Boolean(product?.is_featured)}
            className="h-4 w-4 accent-[#F839A9]"
          />
          Feature this release
        </label>
      </div>

      <fieldset className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <legend className="px-2 text-sm font-semibold text-stone-900">Community playback</legend>
        <div className="mt-2 grid gap-2 text-sm text-stone-700 md:grid-cols-3">
          <label className="flex items-start gap-2">
            <input
              type="radio"
              name="communityPlaybackMode"
              value="preview"
              defaultChecked={communityPlaybackMode === "preview"}
              className="mt-1 h-4 w-4 accent-[#F839A9]"
            />
            <span>Preview for everyone</span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="radio"
              name="communityPlaybackMode"
              value="full"
              defaultChecked={communityPlaybackMode === "full"}
              className="mt-1 h-4 w-4 accent-[#F839A9]"
            />
            <span>Full stream in community</span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="radio"
              name="communityPlaybackMode"
              value="members_full"
              defaultChecked={communityPlaybackMode === "members_full"}
              className="mt-1 h-4 w-4 accent-[#F839A9]"
            />
            <span>Preview free, full paid</span>
          </label>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
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
  const [editingProduct, setEditingProduct] = useState<WordPressMusicProduct | null>(null);
  const [createKind, setCreateKind] = useState<"track" | "album">("track");
  const tracks = useMemo(
    () => products.filter((product) => product.kind === "track"),
    [products]
  );
  const bundles = useMemo(
    () => products.filter((product) => product.kind === "bundle"),
    [products]
  );
  const releaseProducts = useMemo(
    () => products.filter((product) => product.kind === "track" || product.kind === "bundle"),
    [products]
  );
  const [currentPage, setCurrentPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(releaseProducts.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, pageCount);
  const pageStart = (safeCurrentPage - 1) * PAGE_SIZE;
  const visibleProducts = releaseProducts.slice(pageStart, pageStart + PAGE_SIZE);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.3em] text-[#F839A9]">Music Store</p>
            <h1 className="mt-2 text-3xl font-semibold text-stone-950">Manage tracks cleanly from the community app</h1>
            <p className="mt-3 text-sm text-stone-600">
              Browse tracks and albums in a simple table. Use Edit when you need the full release settings.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setCreateKind("track");
                setIsAddOpen(true);
              }}
              className="rounded-full bg-[#F839A9] px-5 py-2 text-sm font-semibold text-white"
            >
              Add new track
            </button>
            <button
              type="button"
              onClick={() => {
                setCreateKind("album");
                setIsAddOpen(true);
              }}
              className="rounded-full border border-[#ffd1e9] bg-white px-5 py-2 text-sm font-semibold text-[#F839A9]"
            >
              Add new album
            </button>
          </div>
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

      <section className="rounded-[2rem] border border-stone-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-stone-100 p-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-stone-950">Tracks and albums</h2>
            <p className="mt-1 text-sm text-stone-600">
              Showing {releaseProducts.length === 0 ? 0 : pageStart + 1}-{Math.min(pageStart + PAGE_SIZE, releaseProducts.length)} of {releaseProducts.length} releases.
            </p>
          </div>
          <div className="text-sm font-semibold text-stone-500">
            Page {safeCurrentPage} of {pageCount}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[780px] w-full text-left text-sm">
            <thead className="bg-[#fff8fc] text-xs uppercase tracking-[0.18em] text-stone-500">
              <tr>
                <th className="px-5 py-4 font-black">Name</th>
                <th className="px-5 py-4 font-black">Category</th>
                <th className="px-5 py-4 font-black">Price</th>
                <th className="px-5 py-4 font-black">Published</th>
                <th className="px-5 py-4 text-right font-black">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {visibleProducts.map((product) => (
                <tr key={product.id} className="transition hover:bg-[#fff8fc]">
                  <td className="px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      {product.cover_image_url ? (
                        <img
                          src={product.cover_image_url}
                          alt=""
                          className="h-11 w-11 shrink-0 rounded-xl object-cover"
                        />
                      ) : (
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#fff0f7] text-xs font-black text-[#F839A9]">
                          WN
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-black text-stone-950">{product.title}</p>
                        <p className="mt-1 text-xs font-semibold text-stone-500">{product.status}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-[#fff0f7] px-3 py-1 text-xs font-black text-[#F839A9]">
                      {getProductCategory(product)}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-semibold text-stone-700">{formatProductPrice(product)}</td>
                  <td className="px-5 py-4 font-semibold text-stone-700">{formatPublishedDate(product.published_at)}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      {product.product_url ? (
                        <a
                          href={product.product_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-stone-200 px-3 py-2 text-xs font-black text-stone-700 transition hover:border-[#F839A9] hover:text-[#F839A9]"
                        >
                          View
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setEditingProduct(product)}
                        className="rounded-full bg-[#F839A9] px-4 py-2 text-xs font-black text-white"
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {visibleProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm font-semibold text-stone-500">
                    No tracks or albums were found yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-stone-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={safeCurrentPage <= 1}
            className="rounded-full border border-stone-200 px-5 py-2 text-sm font-black text-stone-700 transition hover:border-[#F839A9] hover:text-[#F839A9] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <div className="text-center text-sm font-semibold text-stone-500">
            {releaseProducts.length} total releases
          </div>
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
            disabled={safeCurrentPage >= pageCount}
            className="rounded-full border border-stone-200 px-5 py-2 text-sm font-black text-stone-700 transition hover:border-[#F839A9] hover:text-[#F839A9] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </section>

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-stone-200 bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
                  {createKind === "album" ? "Create album" : "Create track"}
                </p>
                <h3 className="mt-1 text-2xl font-semibold text-stone-950">
                  {createKind === "album" ? "New album product" : "New music product"}
                </h3>
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
              <TrackFormFields releaseKind={createKind} availableTracks={tracks} />
              <div className="flex items-center gap-2 pt-1">
                <FormSubmitButton
                  idleLabel={createKind === "album" ? "Create album" : "Create track"}
                  pendingLabel={createKind === "album" ? "Creating album..." : "Creating track..."}
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

      {editingProduct ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-stone-200 bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
                  Edit {getProductCategory(editingProduct).toLowerCase()}
                </p>
                <h3 className="mt-1 text-2xl font-semibold text-stone-950">
                  {editingProduct.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700"
              >
                Close
              </button>
            </div>

            <form action={saveWordPressMusicProductAction} className="space-y-3">
              <TrackFormFields product={editingProduct} availableTracks={tracks} />
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <FormSubmitButton
                  idleLabel={`Save ${getProductCategory(editingProduct).toLowerCase()}`}
                  pendingLabel="Saving..."
                  className="rounded-full bg-[#F839A9] px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                />
                {editingProduct.edit_url ? (
                  <a
                    href={editingProduct.edit_url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-stone-300 px-5 py-2 text-sm font-semibold text-stone-700"
                  >
                    Open in WordPress
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="rounded-full border border-stone-300 px-5 py-2 text-sm font-semibold text-stone-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
