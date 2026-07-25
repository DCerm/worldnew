"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

function getSmartLinks(pathname: string | null) {
  const currentPath = pathname ?? "/";

  if (currentPath.startsWith("/admin")) {
    return [
      { href: "/admin", label: "Back to Admin Home" },
      { href: "/admin/videos", label: "Manage Media" },
      { href: "/admin/categories", label: "Manage Categories" },
    ];
  }

  if (currentPath.startsWith("/dashboard")) {
    return [
      { href: "/dashboard", label: "Back to Dashboard" },
      { href: "/media", label: "Open Media" },
      { href: "/community", label: "Open Community" },
    ];
  }

  if (currentPath.startsWith("/media")) {
    return [
      { href: "/media", label: "Back to Media" },
      { href: "/dashboard", label: "Go to Dashboard" },
      { href: "/", label: "Go Home" },
    ];
  }

  return [
    { href: "/", label: "Go Home" },
    { href: "/media", label: "Open Media" },
    { href: "/login", label: "Sign In" },
  ];
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const links = getSmartLinks(pathname);

  useEffect(() => {
    console.error("Route error boundary caught", error);
  }, [error]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(248,57,169,0.2),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(255,120,120,0.18),transparent_35%),linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,.75)_65%,rgba(0,0,0,1)_100%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-[#7ec4ff]">World New</p>
        <h1 className="mt-3 text-4xl font-bold sm:text-5xl">Quick intermission.</h1>
        <p className="mt-5 max-w-2xl text-sm text-stone-300 sm:text-base">
          Something temporary went out of tune on this route. You can retry immediately or jump
          back to the section you were exploring.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-full bg-[#F839A9] px-6 py-3 text-sm font-semibold"
          >
            Try Again
          </button>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold hover:border-[#F839A9]"
          >
            Refresh Route
          </button>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {links.map((link) => (
            <Link
              key={`${link.href}-${link.label}`}
              href={link.href}
              className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold hover:border-[#F839A9]"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
