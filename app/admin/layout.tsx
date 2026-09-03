'use client';

import { useEffect, useRef, useState } from 'react';
import { RiAdminLine, RiMenuLine } from 'react-icons/ri';
import AdminSidebar from './sidenav';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const previousIsMobileRef = useRef<boolean | null>(null);

  const toggleSidebar = () => setOpen((prev) => !prev);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);

      if (previousIsMobileRef.current === null) {
        previousIsMobileRef.current = mobile;
        setOpen(!mobile);
        setIsReady(true);
        return;
      }

      if (mobile && previousIsMobileRef.current === false) {
        setOpen(false);
      }

      if (!mobile && previousIsMobileRef.current === true) {
        setOpen(true);
      }

      previousIsMobileRef.current = mobile;
      setIsReady(true);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="relative flex h-screen overflow-hidden bg-gradient-to-br from-white via-[#fff7fb] to-[#ffe4f4] text-stone-950">
      <AdminSidebar
        open={open}
        isMobile={isMobile}
        onToggleAction={toggleSidebar}
      />

      {isReady && open && isMobile ? (
        <div
          className="fixed inset-0 z-30 bg-black/50"
          onClick={toggleSidebar}
        />
      ) : null}

      <header className="fixed z-20 flex w-full items-center justify-between bg-[#F839A9] px-4 py-3 text-white shadow-[0_18px_45px_-32px_rgba(248,57,169,.9)] lg:hidden">
        <button onClick={toggleSidebar} className="grid h-10 w-10 place-items-center rounded-full border border-white/40 text-2xl">
          <RiMenuLine className="text-xl" />
        </button>
        <div className="flex items-center space-x-3">
          <RiAdminLine className="text-lg" />
          <span className="font-black">World New Admin</span>
        </div>
      </header>

      <main
        className={`w-full flex-1 overflow-y-auto p-4 text-stone-950 transition-all duration-300 lg:p-8 ${
          isMobile ? 'mt-16' : ''
        }`}
      >
        {children}
      </main>
    </div>
  );
}
