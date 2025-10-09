'use client';

import { useState, useEffect } from 'react';
import AdminSidebar from './sidenav';
import { RiAdminLine, RiMenuLine } from 'react-icons/ri';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const toggleSidebar = () => setOpen((prev) => !prev);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setOpen(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex h-screen bg-neutral-950 text-white relative overflow-hidden">
      {/* Sidebar */}
      <AdminSidebar
        open={open}
        isMobile={isMobile}
        onToggleAction={toggleSidebar}
        
      />

      {/* Overlay for mobile */}
      {open && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={toggleSidebar}
        ></div>
      )}

      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-neutral-900 border-b border-gray-800 shadow fixed w-full z-20">
        <button onClick={toggleSidebar} className="text-2xl">
          <RiMenuLine className="text-xl" />
        </button>
        <div className="flex items-center space-x-3">
          <RiAdminLine className=" text-lg"/>
          <span className="font-semibold">Admin Panel</span>
        </div>
      </header>

      {/* Main Content */}
      <main
        className={`flex-1 transition-all duration-300 p-4 w-full overflow-y-auto ${
          isMobile ? 'mt-16' : ''
        }`}
      >
        {children}
      </main>
    </div>
  );
}