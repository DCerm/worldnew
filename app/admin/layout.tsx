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
    <div className="relative flex h-screen overflow-hidden bg-gray-100 text-white">
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

      <header className="fixed z-20 flex w-full items-center justify-between border-b border-gray-800 bg-gray-100 px-4 py-3 shadow lg:hidden">
        <button onClick={toggleSidebar} className="text-2xl">
          <RiMenuLine className="text-xl" />
        </button>
        <div className="flex items-center space-x-3">
          <RiAdminLine className="text-lg" />
          <span className="font-semibold">Admin Panel</span>
        </div>
      </header>

      <main
        className={`w-full flex-1 overflow-y-auto p-4 transition-all duration-300 ${
          isMobile ? 'mt-16' : ''
        }`}
      >
        {children}
      </main>
    </div>
  );
}
