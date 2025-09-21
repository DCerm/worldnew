// components/Layout/HeaderLayout.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RiMenuLine, RiCloseLine } from "react-icons/ri";

export default function HeaderLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const links = [
    { to: "/", label: "Home" },
    { to: "/about", label: "About" },
    { to: "/privacy-policy", label: "Privacy Policy" },
    { to: "/terms-and-conditions", label: "Terms & Conditions" },
  ];

  const isActive = (path: string) => pathname === path;

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="flex flex-col">
      {/* Fixed header */}
      <header className="bg-[#001f3f] fixed w-full z-50 text-white p-4 flex justify-between items-center lg:px-20p">
        {/* Logo */}
        <Link href="/" className="font-bold text-xl">
          World. New.
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex gap-4 text-sm">
          {links.map((link) => (
            <Link
              key={link.to}
              href={link.to}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                isActive(link.to) ? "bg-gray-600" : "hover:bg-gray-700"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile Hamburger */}
        <button className="md:hidden text-2xl" onClick={toggleSidebar}>
          <RiMenuLine size={20} />
        </button>
      </header>

      {/* Push content below header */}
      <div className="pt-[64px] flex-1">
        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="fixed inset-y-0 left-0 w-64 bg-[#001f3f] text-white p-6 z-50 flex flex-col transform transition-transform duration-300 ease-in-out">
            {/* Close btn */}
            <button className="self-end mb-6 text-2xl" onClick={toggleSidebar}>
              <RiCloseLine />
            </button>

            {/* Sidebar Links */}
            <nav className="flex flex-col gap-4">
              {links.map((link) => (
                <Link
                  key={link.to}
                  href={link.to}
                  className={`px-3 py-2 rounded-md transition-colors ${
                    isActive(link.to) ? "bg-[#003366]" : "hover:bg-[#00264d]"
                  }`}
                  onClick={toggleSidebar}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </aside>
        )}

        {/* Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={toggleSidebar}
          />
        )}

      </div>

    </div>
  );
}