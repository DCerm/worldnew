'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  RiDoorClosedLine,
  RiDoorOpenLine,
  RiHome4Line,
  RiLogoutBoxRLine,
  RiMusic2Line,
  RiTeamLine,
  RiUser2Line,
} from "react-icons/ri";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const desktopSidebarWidth = sidebarOpen ? "lg:ml-64" : "lg:ml-24";

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen flex-col rounded-r-2xl bg-black text-white transition-all duration-300 ${
          isMobile ? (sidebarOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full") : sidebarOpen ? "w-64" : "w-24"
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-700 p-4">
          {sidebarOpen && !isMobile && <span className="hidden text-xl font-bold lg:block">Dashboard</span>}
          <button onClick={() => setSidebarOpen((prev) => !prev)} className="hidden text-xl text-white lg:block">
            {sidebarOpen ? <RiDoorOpenLine /> : <RiDoorClosedLine />}
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto p-4">
          <Link href="/dashboard?tab=home" className="flex items-center space-x-2 rounded p-2 hover:bg-gray-700">
            <RiHome4Line />
            {(sidebarOpen || isMobile) && <span>Home</span>}
          </Link>
          <Link href="/media" className="flex items-center space-x-2 rounded p-2 hover:bg-gray-700">
            <RiMusic2Line />
            {(sidebarOpen || isMobile) && <span>Music + Videos</span>}
          </Link>
          <Link href="/dashboard?tab=community" className="flex items-center space-x-2 rounded p-2 hover:bg-gray-700">
            <RiTeamLine />
            {(sidebarOpen || isMobile) && <span>Community</span>}
          </Link>
          <Link href="/dashboard/profile" className="flex items-center space-x-2 rounded p-2 hover:bg-gray-700">
            <RiUser2Line />
            {(sidebarOpen || isMobile) && <span>Profile</span>}
          </Link>
        </nav>

        <div className="border-t border-gray-700 p-4">
          <form action="/logout" method="post">
            <button type="submit" className="flex w-full items-center space-x-2 rounded bg-gray-800 p-2 text-red-500 hover:bg-gray-700">
              <RiLogoutBoxRLine />
              {(sidebarOpen || isMobile) && <span>Log out</span>}
            </button>
          </form>
        </div>
      </aside>

      {sidebarOpen && isMobile && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`flex min-h-screen flex-col transition-all duration-300 ${isMobile ? "" : desktopSidebarWidth}`}>
        <header className="flex items-center justify-between bg-white px-4 py-3 shadow lg:hidden">
          <button onClick={() => setSidebarOpen((prev) => !prev)} className="text-2xl">
            <span className="sr-only">Toggle menu</span>
            {sidebarOpen ? <RiDoorOpenLine /> : <RiDoorClosedLine />}
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-950 text-sm font-semibold text-white">WN</div>
        </header>

        <div>{children}</div>
      </div>
    </div>
  );
}
