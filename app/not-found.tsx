import Link from "next/link";

export default function NotFound() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(248,57,169,0.2),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(255,80,120,0.2),transparent_32%),radial-gradient(circle_at_50%_80%,rgba(255,210,95,0.15),transparent_38%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-[#7ec4ff]">World New</p>
        <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-6xl">
          This scene is still loading.
        </h1>
        <p className="mt-5 max-w-2xl text-sm text-stone-300 sm:text-base">
          The page you asked for is off-script, but the music is still playing.
          Jump back into the community through one of these routes.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="rounded-full bg-[#F839A9] px-6 py-3 text-sm font-semibold">
            Go Home
          </Link>
          <Link
            href="/media"
            className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold hover:border-[#F839A9]"
          >
            Open Media
          </Link>
          <Link
            href="/community"
            className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold hover:border-[#F839A9]"
          >
            Enter Community
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold hover:border-[#F839A9]"
          >
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
