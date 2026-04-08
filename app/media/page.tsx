import Link from "next/link";

import { getCurrentUser } from "@/lib/auth";
import { getMediaLibrary } from "@/lib/data";
import MediaExperience from "@/app/media/MediaExperience";

export default async function MediaPage() {
  const [user, media] = await Promise.all([getCurrentUser(), getMediaLibrary()]);
  const dashboardHref =
    user && (user.roles.includes("artist_admin") || user.roles.includes("super_admin"))
      ? "/admin"
      : "/dashboard";

  return (
    <>
      <MediaExperience user={user} media={media} />

      <footer className="border-t border-stone-800 bg-stone-950">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-4 px-6 py-8 text-sm text-stone-400 lg:flex-row lg:items-center">
          <p>© {new Date().getFullYear()} World New Community</p>
          <div className="flex items-center gap-4">
            <Link href="/about" className="hover:text-white">
              About
            </Link>
            <Link href="/privacy-policy" className="hover:text-white">
              Privacy Policy
            </Link>
            <Link href="/terms-and-conditions" className="hover:text-white">
              Terms
            </Link>
            <Link href={user ? dashboardHref : "/login"} className="hover:text-white">
              {user ? "Dashboard" : "Sign in"}
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
