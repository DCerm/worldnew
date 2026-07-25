"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global app error boundary caught", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white">
        <main className="relative min-h-screen overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_10%,rgba(248,57,169,0.2),transparent_35%),radial-gradient(circle_at_75%_15%,rgba(245,130,180,0.18),transparent_35%)]" />
          <div className="relative mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center px-6 py-16 text-center">
            <p className="text-xs uppercase tracking-[0.35em] text-[#7ec4ff]">World New</p>
            <h1 className="mt-3 text-4xl font-bold sm:text-5xl">We hit a stage reset.</h1>
            <p className="mt-5 max-w-2xl text-sm text-stone-300 sm:text-base">
              A system-level error occurred. You can restart this view or move back to a stable
              route while we keep everything else running.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => reset()}
                className="rounded-full bg-[#F839A9] px-6 py-3 text-sm font-semibold"
              >
                Restart View
              </button>
              <Link
                href="/"
                className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold hover:border-[#F839A9]"
              >
                Go Home
              </Link>
              <Link
                href="/media"
                className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold hover:border-[#F839A9]"
              >
                Open Media
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
