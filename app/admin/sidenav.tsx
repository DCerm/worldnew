'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  RiArrowLeftSLine,
  RiCoupon2Line,
  RiMenuLine,
  RiMovieLine,
  RiMusic2Line,
  RiDiscLine,
  RiPriceTag3Line,
  RiLogoutBoxRLine,
  RiPlayCircleLine,
  RiTeamLine,
  RiUserLine,
} from 'react-icons/ri';

interface AdminSidebarProps {
  open: boolean;
  isMobile: boolean;
  onToggleAction: () => void;
}

const links = [
  { label: 'Overview', path: '/admin', icon: <RiMusic2Line /> },
  { label: 'Memberships', path: '/admin/memberships', icon: <RiCoupon2Line /> },
  { label: 'Music Store', path: '/admin/music', icon: <RiDiscLine /> },
  { label: 'Add Media', path: '/admin/videos', icon: <RiMovieLine/> },
  { label: 'Categories', path: '/admin/categories', icon: <RiPriceTag3Line /> },
  { label: 'Community', path: '/community', icon: <RiTeamLine /> },
  { label: 'View Media', path: '/media', icon: <RiPlayCircleLine /> },
  { label: 'Profile', path: '/admin/profile', icon: <RiUserLine /> },
];

export default function AdminSidebar({ open, isMobile, onToggleAction }: AdminSidebarProps) {
  const pathname = usePathname();

  const baseClass =
    'border-r border-[#ffd1e9] bg-white/95 text-stone-950 shadow-[0_24px_65px_-44px_rgba(248,57,169,.9)] backdrop-blur flex flex-col justify-between transition-all duration-300 z-40';

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
      <div className="flex items-center justify-between border-b border-[#ffd1e9] bg-[#fff0f7] p-6">
        {open && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#F839A9]">World New</p>
            <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-stone-950">Admin</h2>
          </div>
        )}
        <button onClick={onToggleAction} className="grid h-9 w-9 place-items-center rounded-full bg-stone-950 text-xl text-white shadow-sm transition hover:bg-[#F839A9]">
          {open ? <RiArrowLeftSLine /> : <RiMenuLine />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col space-y-2 p-4">
        {links.map((link) => {
          const href = link.path;
          const isActive = pathname === link.path;

          return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-black transition-colors duration-200 ${
              isActive
                ? 'bg-[#F839A9] text-white shadow-[0_18px_45px_-30px_rgba(248,57,169,.9)]'
                : 'text-stone-600 hover:bg-[#fff0f7] hover:text-[#F839A9]'
            }`}
          >
            <i className="text-xl">{link.icon}</i>
            {(open || isMobile) && <span>{link.label}</span>}
          </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-[#ffd1e9] bg-[#fff8fc] p-4">
        <form action="/logout" method="post">
          <button type="submit" className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 font-black text-stone-600 transition-colors duration-200 hover:bg-[#ffe4f4] hover:text-[#F839A9]">
            <RiLogoutBoxRLine className="text-xl" />
            {(open || isMobile) && <span>Sign Out</span>}
          </button>
        </form>
      </div>
    </aside>
  );
}
