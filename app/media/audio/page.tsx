import Link from "next/link";
import { RiShoppingCart2Line } from "react-icons/ri";

import { WordNewMusicTracklist } from "@/app/media/audio/WordNewMusicTracklist";
import { getCurrentUser, getDashboardDestination } from "@/lib/auth";
import {
  getWordPressMusicProductsForAdmin,
  type WordPressMusicProduct,
  type WordPressMusicTrack,
} from "@/lib/wordpress";

export const dynamic = "force-dynamic";

function productToTrack(product: WordPressMusicProduct): WordPressMusicTrack {
  return {
    id: product.id,
    title: product.title,
    artist: product.artist,
    genre: product.genre,
    duration: product.duration ?? "",
    preview_seconds: product.preview_seconds ?? 30,
    preview_start_seconds: product.preview_start_seconds ?? 0,
    preview_end_seconds: product.preview_end_seconds ?? null,
    cover_image_url: product.cover_image_url,
    stream_url: product.stream_url ?? "",
    price: product.price,
    community_price: product.community_price ?? null,
    display_price: product.display_price ?? product.community_price ?? product.price,
    currency: product.currency,
    checkout_url: `/checkout/product/${product.id}`,
    community_checkout_url: `/checkout/product/${product.id}`,
    product_url: product.product_url,
    is_featured: product.is_featured,
    show_on_website: product.show_on_website,
    show_on_community: product.show_on_community,
    album_show_on_community: product.album_show_on_community,
    community_playback_mode: product.community_playback_mode ?? "preview",
    can_download: false,
    download_url: "",
  };
}

function isCommunityVisible(product: WordPressMusicProduct) {
  return product.show_on_community !== false;
}

function isCommunityAlbumVisible(product: WordPressMusicProduct) {
  return product.kind === "bundle" && isCommunityVisible(product) && product.album_show_on_community !== false;
}

function formatPrice(amount: number | null | undefined, currency: string) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return "Buy";
  }

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency || "GBP",
  }).format(amount);
}

export default async function AudioExperiencePage() {
  const [user, products] = await Promise.all([
    getCurrentUser(),
    getWordPressMusicProductsForAdmin(),
  ]);
  const dashboardHref = user ? getDashboardDestination(user) : "/login";
  const albums = products.filter(isCommunityAlbumVisible);
  const albumTrackIds = new Set(albums.flatMap((album) => album.bundle_tracks.map((track) => track.id)));
  const standaloneTracks = products
    .filter((product) => product.kind === "track" && isCommunityVisible(product) && !albumTrackIds.has(product.id))
    .map(productToTrack);

  return (
    <main className="min-h-screen bg-white text-stone-950">
      <header className="sticky top-0 z-40 bg-[#F839A9] text-white shadow-[0_18px_45px_-32px_rgba(248,57,169,.9)]">
        <div className="mx-auto flex h-20 max-w-[1500px] items-center justify-between gap-5 px-5 lg:px-10">
          <Link href="/dashboard?tab=home" className="text-2xl font-black uppercase tracking-[-0.06em]">
            World New
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-black lg:flex">
            <Link href="/media/category/movies" className="border-b-2 border-transparent py-2 text-white/90 hover:border-white">
              Movies
            </Link>
            <Link href="/media/audio" className="border-b-2 border-white py-2 text-white">
              Music
            </Link>
            <Link href="/media" className="border-b-2 border-transparent py-2 text-white/90 hover:border-white">
              Videos
            </Link>
            <Link href="/media/category/mixtapes" className="border-b-2 border-transparent py-2 text-white/90 hover:border-white">
              Mixtapes
            </Link>
            <Link href="/media/category/reels" className="border-b-2 border-transparent py-2 text-white/90 hover:border-white">
              Reels
            </Link>
            <Link href="/media/category/behind-the-scenes" className="border-b-2 border-transparent py-2 text-white/90 hover:border-white">
              Behind the Scenes
            </Link>
          </nav>
          <Link href={dashboardHref} className="rounded-full border border-white/45 px-6 py-3 text-sm font-black">
            {user ? "Library" : "Sign in"}
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1500px] gap-8 px-5 py-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-10">
        <div className="min-w-0 space-y-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#F839A9]">Music</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] md:text-4xl">
              Albums and exclusive tracks
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-stone-500">
              Releases from Franke&apos; you won&apos;t find anywhere else.
            </p>
          </div>

          {albums.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {albums.map((album) => {
                const displayPrice = album.display_price ?? album.community_price ?? album.price;
                const checkoutUrl = `/checkout/product/${album.id}`;

                return (
                  <article
                    key={album.id}
                    className="group overflow-hidden rounded-[1.35rem] border border-[#ffd1e9] bg-white shadow-[0_22px_54px_-44px_rgba(248,57,169,.8)] transition hover:-translate-y-1 hover:shadow-[0_28px_66px_-44px_rgba(248,57,169,.95)]"
                  >
                    <Link href={`/media/audio/albums/${album.id}`} className="block">
                      <div className="aspect-square overflow-hidden bg-[#fff0f7]">
                        {album.cover_image_url ? (
                          <img
                            src={album.cover_image_url}
                            alt={`${album.title} artwork`}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-[#F839A9] to-stone-950 text-2xl font-black text-white">
                            WORLD NEW
                          </div>
                        )}
                      </div>
                      <div className="space-y-1.5 p-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#F839A9]">Album</p>
                        <h2 className="line-clamp-2 text-base font-black text-stone-950">{album.title}</h2>
                        <p className="text-xs font-semibold text-stone-500">
                          {album.artist || "Franke'"} · {album.bundle_tracks.length} track{album.bundle_tracks.length === 1 ? "" : "s"}
                        </p>
                      </div>
                    </Link>
                    <div className="flex items-center justify-between gap-3 px-3 pb-3">
                      <Link
                        href={`/media/audio/albums/${album.id}`}
                        className="rounded-full bg-[#F839A9] px-3 py-2 text-xs font-black text-white"
                      >
                        Open album
                      </Link>
                      <a
                        href={checkoutUrl}
                        className="inline-flex items-center gap-2 rounded-full bg-stone-950 px-3 py-2 text-xs font-black text-white transition hover:bg-[#F839A9]"
                        aria-label={`Buy ${album.title}`}
                      >
                        <RiShoppingCart2Line />
                        {formatPrice(displayPrice, album.currency)}
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-[#ffd1e9] bg-[#fff8fc] p-8 text-sm font-semibold text-stone-500">
              No albums are available yet.
            </div>
          )}
        </div>

        <aside className="min-w-0 lg:sticky lg:top-28 lg:self-start">
          <WordNewMusicTracklist
            tracks={standaloneTracks}
            hasPaidCommunityAccess={Boolean(user?.activePlanCode)}
            showCartButton
            title="Tracks"
          />
        </aside>
      </section>
    </main>
  );
}
