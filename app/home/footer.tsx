// components/Footer.tsx
"use client";

import Link from "next/link";
import { 
  RiInstagramLine, 
  RiYoutubeLine, 
  RiTiktokLine, 
  RiTwitterXLine 
} from "react-icons/ri";

export default function Footer() {
  return (
    <>
      <div className="p-2 w-full md:w-4/5 mx-auto rounded-xl relative"></div>

      <footer className="bg-[#001f3f] rounded-xl flex flex-col md:flex-row justify-between items-center w-full md:w-4/5 mx-auto p-4 md:p-6 text-white gap-4">
        {/* Left side (branding + links) */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-start text-center sm:text-left">
          {/* Branding */}
          <div className="flex gap-2 font-bold">
            <p>World.</p>
            <p>New.</p>
          </div>

          {/* Footer Links */}
          <div className="flex flex-wrap justify-center sm:justify-start gap-4 sm:gap-6 text-sm font-light">
            <Link href="/about" className="hover:underline">
              About
            </Link>
            <Link href="/privacy-policy" className="hover:underline">
              Privacy Policy
            </Link>
            <Link href="/terms-and-conditions" className="hover:underline">
              Terms & Conditions
            </Link>
          </div>
        </div>

        {/* Right side (social icons) */}
        <div className="flex gap-3 justify-center md:justify-end mt-2 md:mt-0">
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-[#001f3f] w-8 h-8 flex items-center justify-center rounded hover:bg-transparent hover:text-white transition"
          >
            <RiInstagramLine size={18} />
          </a>

          <a
            href="https://youtube.com"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-[#001f3f] w-8 h-8 flex items-center justify-center rounded hover:bg-transparent hover:text-white transition"
          >
            <RiYoutubeLine size={18} />
          </a>

          <a
            href="https://tiktok.com"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-[#001f3f] w-8 h-8 flex items-center justify-center rounded hover:bg-transparent hover:text-white transition"
          >
            <RiTiktokLine size={18} />
          </a>

          <a
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-[#001f3f] w-8 h-8 flex items-center justify-center rounded hover:bg-transparent hover:text-white transition"
          >
            <RiTwitterXLine size={18} />
          </a>
        </div>
      </footer>
    </>
  );
}