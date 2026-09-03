"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  RiBriefcaseLine,
  RiFilmLine,
  RiHome4Line,
  RiLogoutBoxRLine,
  RiMenuLine,
  RiMovie2Line,
  RiMusic2Line,
  RiSettings3Line,
  RiShoppingBag3Line,
  RiTeamLine,
  RiUser2Line,
  RiVideoLine,
} from "react-icons/ri";
import { useState } from "react";

const topLinks = [
  { href: "/dashboard?tab=home", label: "Home" },
  { href: "/media/category/movies", label: "Movies" },
  { href: "/media/audio", label: "Music" },
  { href: "/media", label: "Videos" },
  { href: "/media/category/mixtapes", label: "Mixtapes" },
  { href: "/media/category/reels", label: "Reels" },
  { href: "/media/category/behind-the-scenes", label: "Behind the Scenes" },
  { href: "/community", label: "Community" },
];

const sideLinks = [
  { href: "/dashboard?tab=home", label: "Home", icon: RiHome4Line },
  { href: "/media/category/movies", label: "Movies", icon: RiMovie2Line },
  { href: "/media/audio", label: "Music", icon: RiMusic2Line },
  { href: "/media", label: "Videos", icon: RiVideoLine },
  { href: "/media/category/mixtapes", label: "Mixtapes", icon: RiFilmLine },
  { href: "/media/category/reels", label: "Reels", icon: RiFilmLine },
  { href: "/media/category/behind-the-scenes", label: "Behind the Scenes", icon: RiBriefcaseLine },
  { href: "/community", label: "Community", icon: RiTeamLine },
  { href: "https://worldnew.love", label: "Shop", icon: RiShoppingBag3Line, external: true },
  { href: "/dashboard/profile", label: "Profile", icon: RiUser2Line },
  { href: "/dashboard/profile", label: "Settings", icon: RiSettings3Line },
];

function isActive(pathname: string | null, href: string) {
  if (!pathname) {
    return false;
  }

  if (href.startsWith("http")) {
    return false;
  }

  const cleanHref = href.split("?")[0];
  if (cleanHref === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === cleanHref || pathname.startsWith(`${cleanHref}/`);
}

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-24 items-center px-8 lg:hidden">
        <Link href="/dashboard?tab=home" className="leading-none ">
          <span className="block text-3xl font-black uppercase leading-[0.85] tracking-[-0.06em] text-[#12351f]">
            World
          </span>
          <span className="block text-3xl font-black uppercase leading-[0.85] tracking-[-0.06em] text-[#12351f]">
            New
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto px-5 py-8">
        {sideLinks.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          const className = `flex items-center gap-4 rounded-2xl px-5 py-4 text-sm font-bold transition ${
            active
              ? "bg-white text-[#F839A9] shadow-[0_18px_45px_-30px_rgba(248,57,169,.9)]"
              : "text-stone-700 hover:bg-white/70 hover:text-[#F839A9]"
          }`;

          if (item.external) {
            return (
              <a key={item.label} href={item.href} className={className} target="_blank" rel="noreferrer">
                <Icon className="text-xl" />
                <span>{item.label}</span>
              </a>
            );
          }

          return (
            <Link key={item.label} href={item.href} className={className} onClick={() => setMobileOpen(false)}>
              <Icon className="text-xl" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <form action="/logout" method="post" className="px-5 py-6">
        <button className="flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-sm font-bold text-stone-700 transition hover:bg-white/70 hover:text-[#F839A9]">
          <RiLogoutBoxRLine className="text-xl" />
          <span>Log out</span>
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-stone-950">
      <header className="fixed inset-x-0 top-0 z-40 h-20 bg-[#F839A9] text-white shadow-[0_18px_45px_-32px_rgba(248,57,169,.9)]">
        <div className="flex h-full items-center justify-between gap-5 px-5 lg:px-10">
          <button
            type="button"
            className="rounded-full border border-white/35 p-2 text-2xl lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <RiMenuLine />
            <span className="sr-only">Open menu</span>
          </button>

          <Link href="/dashboard?tab=home" className="hidden text-2xl font-black uppercase tracking-[-0.06em] lg:block">
            World New
          </Link>

          <nav className="hidden flex-1 items-center justify-center gap-4 text-sm font-bold xl:gap-7 lg:flex">
            {topLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`border-b-2 py-2 transition ${
                  isActive(pathname, link.href) ? "border-white text-white" : "border-transparent text-white/85 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-4 lg:flex-none">
            <div className="hidden w-[min(34vw,420px)] items-center rounded-full border border-white/40 px-5 py-3 text-sm text-white/85 lg:flex">
              Search movies, music, videos, mixtapes...
            </div>
            <Link href="/dashboard/profile" className="grid h-10 w-10 place-items-center rounded-full bg-white text-sm font-black text-[#F839A9]">
              WN
            </Link>
          </div>
        </div>
      </header>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-[#fff0f7] pt-20 lg:block">
        {sidebar}
      </aside>

      {mobileOpen ? (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-[#fff0f7] pt-20 shadow-2xl lg:hidden">
            {sidebar}
          </aside>
        </>
      ) : null}

      <div className="min-h-screen pt-20 lg:pl-64">{children}</div>
    </div>
  );
}
