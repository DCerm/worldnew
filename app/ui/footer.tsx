// components/Layout/Footer.tsx
import Link from "next/link";
import {
  RiInstagramLine,
  RiYoutubeLine,
  RiTiktokLine,
  RiTwitterXLine,
} from "react-icons/ri";

export default function Footer() {
  return (
    <footer className="bg-[#001f3f] text-white p-2 lg:px-10p flex flex-col md:flex-row justify-between items-center w-full mt-6">
      {/* Left side (branding + links) */}
      <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
        {/* Branding */}
        <div className="flex gap-2 font-bold text-xl">
          <p>World.</p>
          <p>New.</p>
        </div>

        {/* Footer Links */}
        <div className="flex flex-wrap gap-6 text-base font-light items-center">
          <Link href="/about" className="hover:text-gray-300 transition">
            About
          </Link>
          <Link href="/privacy-policy" className="hover:text-gray-300 transition">
            Privacy Policy
          </Link>
          <Link
            href="/terms-and-conditions"
            className="hover:text-gray-300 transition"
          >
            Terms & Conditions
          </Link>
        </div>
      </div>

      {/* Right side (social icons + button) */}
      <div className="flex gap-4 items-center mt-6 md:mt-0">
        {/* Social Icons */}
        <div className="flex gap-3">
          <RiInstagramLine className="bg-white text-[#001f3f] w-8 h-8 flex items-center justify-center rounded hover:bg-transparent hover:text-white transition" />
          <RiYoutubeLine className="bg-white text-[#001f3f] w-8 h-8 flex items-center justify-center rounded hover:bg-transparent hover:text-white transition" />
          <RiTiktokLine className="bg-white text-[#001f3f] w-8 h-8 flex items-center justify-center rounded hover:bg-transparent hover:text-white transition" />
          <RiTwitterXLine className="bg-white text-[#001f3f] w-8 h-8 flex items-center justify-center rounded hover:bg-transparent hover:text-white transition" />
        </div>

        {/* Get Started Button */}
        <Link
          href="/join-community"
          className="bg-white text-[#001f3f] px-6 py-2 rounded-md font-semibold hover:bg-transparent hover:text-white border border-white transition"
        >
          Join Community
        </Link>
      </div>
    </footer>
  );
}
