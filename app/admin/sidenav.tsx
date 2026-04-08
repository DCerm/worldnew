'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  RiArrowLeftSLine,
  RiMenuLine,
  RiMovieLine,
  RiMusic2Line,
  RiPriceTag3Line,
  RiLogoutBoxRLine,
  RiPlayCircleLine,
  RiUserLine,
} from 'react-icons/ri';

interface AdminSidebarProps {
  open: boolean;
  isMobile: boolean;
  onToggleAction: () => void;
}

const links = [
  { label: 'Overview', path: '/admin', icon: <RiMusic2Line /> },
  { label: 'Add Media', path: '/admin/videos', icon: <RiMovieLine/> },
  { label: 'Categories', path: '/admin/categories', icon: <RiPriceTag3Line /> },
  { label: 'View Media', path: '/media', icon: <RiPlayCircleLine /> },
  { label: 'Profile', path: '/admin/profile', icon: <RiUserLine /> },
];

export default function AdminSidebar({ open, isMobile, onToggleAction }: AdminSidebarProps) {
  const pathname = usePathname();

  const baseClass =
    'bg-neutral-900 text-white shadow-xl rounded-r-2xl flex flex-col justify-between transition-all duration-300 z-40';

  const sidebarClass = isMobile
    ? open
      ? 'fixed w-64 left-0 top-0 h-screen'
      : 'fixed w-0 -left-64 top-0 h-screen'
    : open
    ? 'w-64'
    : 'w-20';

  return (
    <aside className={`${baseClass} ${sidebarClass}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-700 flex items-center justify-between">
        {open && <h2 className="text-xl font-bold tracking-wide">Admin</h2>}
        <button onClick={onToggleAction} className="text-white text-xl">
          {open ? <RiArrowLeftSLine /> : <RiMenuLine />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col space-y-2 p-4">
        {links.map((link) => (
          <Link
            key={link.path}
            href={link.path}
            className={`flex items-center gap-3 px-3 py-2 rounded transition-colors duration-200 ${
              pathname === link.path
                ? 'bg-blue-600 text-white font-semibold'
                : 'hover:bg-gray-800'
            }`}
          >
            <i className="text-xl">{link.icon}</i>
            {(open || isMobile) && <span>{link.label}</span>}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        <form action="/logout" method="post">
          <button type="submit" className="w-full flex items-center gap-3 text-red-500 hover:text-red-600 transition-colors duration-200 font-medium">
            <RiLogoutBoxRLine className="text-xl" />
            {(open || isMobile) && <span>Sign Out</span>}
          </button>
        </form>
      </div>
    </aside>
  );
}
