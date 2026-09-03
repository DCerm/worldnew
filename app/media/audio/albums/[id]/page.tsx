import Link from "next/link";
import { notFound } from "next/navigation";
import { FaHeart } from "react-icons/fa";
import { RiPlayFill, RiShoppingCart2Line } from "react-icons/ri";

import { AlbumDetailTabs } from "@/app/media/audio/albums/[id]/AlbumDetailTabs";
import { getCurrentUser, getDashboardDestination } from "@/lib/auth";
import { getWordPressMusicProductsForAdmin } from "@/lib/wordpress";

export const dynamic = "force-dynamic";

function formatReleaseDate(value?: string | null) {
  if (!value) return "Coming soon";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatPrice(amount: number | null | undefined, currency: string) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return "Buy Album";
  }

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency || "GBP",
  }).format(amount);
}

export default async function CommunityAlbumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, user, products] = await Promise.all([
    params,
    getCurrentUser(),
    getWordPressMusicProductsForAdmin(),
  ]);
  const albumId = Number(id);
  const dashboardHref = user ? getDashboardDestination(user) : "/login";
  const album = products.find(
    (product) =>
      product.id === albumId &&
      product.kind === "bundle" &&
      product.show_on_community !== false &&
      product.album_show_on_community !== false
  );

  if (!album) {
    notFound();
  }

  const tracks = album.bundle_tracks.map((track) => ({
    ...track,
    product_url: track.product_url || album.product_url,
    checkout_url: track.checkout_url || album.product_url,
  }));
  const details = album.description || album.short_description || "";
  const albumArtist = album.artist || "Franke'";
  const credits = [albumArtist, album.genre].filter(Boolean).join(" · ");
  const albumDisplayPrice = album.display_price ?? album.community_price ?? album.price;
  const albumCheckoutUrl = `/checkout/product/${album.id}`;

  return (
    <main className="min-h-screen bg-white text-stone-950">
      <header className="sticky top-0 z-40 bg-[#F839A9] text-white shadow-[0_18px_45px_-32px_rgba(248,57,169,.9)]">
        <div className="mx-auto flex h-20 max-w-[1500px] items-center justify-between gap-5 px-5 lg:px-10">
          <Link href="/media/audio" className="text-sm font-black">
            &larr; Back to Music
          </Link>
          <Link href={dashboardHref} className="rounded-full border border-white/45 px-6 py-3 text-sm font-black">
            {user ? "Library" : "Sign in"}
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-[1500px] px-5 py-10 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(240px,300px)_minmax(0,1fr)_340px] lg:items-start">
          <div className="w-full overflow-hidden rounded-[1.75rem] bg-[#fff0f7] shadow-[0_28px_80px_-48px_rgba(15,23,42,.7)]">
            {album.cover_image_url ? (
              <img
                src={album.cover_image_url}
                alt={`${album.title} artwork`}
                className="aspect-square h-full w-full object-cover"
              />
            ) : (
              <div className="grid aspect-square place-items-center bg-gradient-to-br from-[#F839A9] to-stone-950 text-3xl font-black text-white">
                WORLD NEW
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.32em] text-[#F839A9]">Album</p>
              <h1 className="mt-2 max-w-3xl text-[clamp(1.2rem,2vw,1.5rem)] font-black tracking-[-0.045em]">
                {album.title}
              </h1>
              <p className="mt-4 inline-flex items-center gap-2 text-xl font-black text-[#F839A9]">
                {albumArtist} <FaHeart className="text-base" aria-hidden="true" />
              </p>
              <p className="mt-1 text-sm font-black text-stone-500">
                {tracks.length} track{tracks.length === 1 ? "" : "s"} · Released {formatReleaseDate(null)}
              </p>
              <p className="mt-3 inline-flex rounded-full bg-[#fff0f7] px-4 py-2 text-sm font-black text-[#F839A9]">
                Community price: {formatPrice(albumDisplayPrice, album.currency)}
              </p>
              {details ? <p className="mt-6 max-w-2xl text-base leading-7 text-stone-700">{details}</p> : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="#tracklist"
                className="inline-flex items-center gap-2 rounded-full bg-[#F839A9] px-6 py-3 text-sm font-black text-white"
              >
                <RiPlayFill /> Play All
              </a>
              <a
                href={albumCheckoutUrl}
                className="inline-flex items-center gap-2 rounded-full border border-[#ffd1e9] bg-white px-6 py-3 text-sm font-black text-[#F839A9]"
              >
                <RiShoppingCart2Line /> Buy Album · {formatPrice(albumDisplayPrice, album.currency)}
              </a>
            </div>

            <div className="rounded-[1.5rem] border border-[#ffd1e9] bg-[#fff8fc] p-5 shadow-[0_20px_60px_-48px_rgba(248,57,169,.9)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-black">Love this album?</h2>
                  <p className="mt-1 text-sm font-semibold text-stone-500">Support the artist directly.</p>
                </div>
                <a href="https://worldnew.love/donate/" className="rounded-2xl bg-[#F839A9] px-6 py-3 text-sm font-black text-white">
                  Donate
                </a>
              </div>
            </div>
          </div>

          <aside className="rounded-[1.75rem] border border-[#edf2f7] bg-white p-6 shadow-[0_28px_80px_-58px_rgba(15,23,42,.7)]">
            <h2 className="text-xl font-black">About this album</h2>
            <p className="mt-6 border-b border-stone-200 pb-5 text-sm leading-7 text-stone-700">
              {album.short_description || details || "Thank you for listening."}
            </p>
            <dl className="mt-5 grid grid-cols-[110px_1fr] gap-4 text-sm">
              <dt className="font-semibold text-stone-500">Artist</dt>
              <dd className="font-black text-stone-950">{albumArtist}</dd>
              <dt className="font-semibold text-stone-500">Release Date</dt>
              <dd className="font-black text-stone-950">{formatReleaseDate(null)}</dd>
              <dt className="font-semibold text-stone-500">Tracks</dt>
              <dd className="font-black text-stone-950">
                {tracks.length} track{tracks.length === 1 ? "" : "s"}
              </dd>
            </dl>
          </aside>
        </div>

        <div id="tracklist" className="mt-12">
          <AlbumDetailTabs
            tracks={tracks}
            details={details}
            credits={credits}
            hasPaidCommunityAccess={Boolean(user?.activePlanCode)}
          />
        </div>
      </section>
    </main>
  );
}
