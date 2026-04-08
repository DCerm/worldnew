import Link from "next/link";

import { getCurrentUser } from "@/lib/auth";
import { getMembershipPlans, getMediaLibrary } from "@/lib/data";

export default async function HomePage() {
  const [user, plans, media] = await Promise.all([
    getCurrentUser(),
    getMembershipPlans(),
    getMediaLibrary(),
  ]);

  const featuredMedia = media.slice(0, 4);
  const dashboardHref =
    user && (user.roles.includes("artist_admin") || user.roles.includes("super_admin"))
      ? "/admin"
      : "/dashboard";

  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <header className="sticky top-0 z-40 border-b border-stone-800 bg-stone-950/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-md font-semibold uppercase tracking-[0.28em] text-[#0091ff]">
            World. New.
          </Link>
          <nav className="flex items-center gap-4 text-md text-stone-300">
            <Link href="/about" className="hidden lg:block hover:text-white">
              About
            </Link>
            <Link href="/privacy-policy" className="hidden lg:block hover:text-white">
              Privacy
            </Link>
            <Link href="/terms-and-conditions" className="hidden lg:block hover:text-white">
              Terms
            </Link>
            <Link
              href={user ? dashboardHref : "/login"}
              className="rounded-full border border-stone-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] hover:border-[#0091ff]"
            >
              {user ? "Dashboard" : "Sign in"}
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-10 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl space-y-6">
          <p className="text-sm uppercase tracking-[0.4em] text-[#0091ff]">World New Community</p>
          <h1 className="text-4xl font-semibold leading-tight lg:text-5xl">
            Get more of <br className="hidden lg:block" /> the <br className="lg:hidden" /> music you love. ❤️
          </h1>
          <p className="max-w-2xl text-lg text-stone-300 lg:pr-6" >
            Join the official World. New. community for exclusive content, early access, and a deeper connection with your friendly neighbourhood, Franke.
          </p>
          <div className="flex flex-wrap gap-2 lg:gap-4">
            <Link
              href={user ? dashboardHref : "/register"}
              className="rounded-full bg-[#0091ff] px-4 lg:px-6 py-3 font-semibold text-white transition hover:bg-[#007ad9]"
            >
              {user ? "My Dashboard" : "Join The Community"}
            </Link>
            <Link
              href="/media"
              className="rounded-full border border-stone-700 px-4 lg:px-6 py-3 font-semibold text-white transition hover:border-stone-500"
            >
              Browse Media
            </Link>
            <Link
              href={user ? "/admin" : "/login"}
              className="hidden rounded-full border border-stone-700 px-6 py-3 font-semibold text-white transition hover:border-stone-500"
            >
              {user ? "Artist Console" : "Artist Sign In"}
            </Link>
          </div>
        </div>

        <div className="grid w-full max-w-xl gap-4 rounded-[2rem] border border-stone-800 bg-stone-900/80 p-6 shadow-2xl">
          <div className="flex flex-col-reverse lg:flex-row items-start lg:items-center gap-2 justify-between">
            <h2 className="text-lg lg:text-xl font-semibold">Inside The Community</h2>
            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-emerald-300">
              Exclusive Access
            </span>
          </div>
          <div className="grid gap-2 text-sm text-stone-300">
            <div className="rounded-2xl border border-stone-800 bg-stone-950 p-4 py-2">Exclusive songs and videos</div>
            <div className="rounded-2xl border border-stone-800 bg-stone-950 p-4 py-2">Documentation of the coming of the World. New.</div>
            <div className="rounded-2xl border border-stone-800 bg-stone-950 p-4 py-2">Chat forums (spirituality, mental health, money, gaming & more)</div>
            <div className="rounded-2xl border border-stone-800 bg-stone-950 p-4 py-2">Live streams & video group calls (life, spirituality & health discussions, group gaming sessions etc.)</div>
            <div className="rounded-2xl border border-stone-800 bg-stone-950 p-4 py-2">Find/network with like minded souls</div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-2 my-4 lg:my-24">
        <div className="mb-6 lg:flex items-end justify-between gap-6">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-stone-400">Memberships</p>
            <h2 className="mt-2 text-2xl lg:text-3xl font-semibold">Choose your access level</h2>
          </div>
          
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.id} className="rounded-[2rem] border border-stone-800 bg-stone-900 p-6">
              <div className=" flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg lg:text-xl font-semibold">{plan.name}</h3>
                  
                </div>
                <div className="text-right">
                  <p className="text-lg lg:text-xl font-semibold">${plan.priceAmount}</p>
                  <p className="text-xs lg:text-sm uppercase tracking-[0.25em] text-stone-500">{plan.durationDays} days</p>
                </div>
              </div>
              <p className="mb-6 text-sm lg:text-md text-stone-400">{plan.description}</p>
              <ul className="space-y-2 text-sm text-stone-300">
                {plan.features.map((feature) => (
                  <li key={feature} className="rounded-2xl border border-stone-800 bg-stone-950 px-4 py-2">
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Link
                  href={user ? `/checkout/${plan.code}?returnTo=/dashboard` : "/login"}
                  className="inline-flex rounded-full bg-[#0091ff] hover:bg-[#0077cc] px-5 py-2 text-sm font-semibold text-white"
                >
                  {user ? "Purchase membership" : "Sign in to purchase"}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-6 flex items-end justify-between gap-6">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-stone-400">Media Preview</p>
            <h2 className="mt-2 text-3xl font-semibold">World. New. content shelves</h2>
          </div>
          <Link href="/media" className="text-sm uppercase tracking-[0.2em] text-[#0091ff] hover:underline underline-offset-[5px]">
            View library
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {featuredMedia.length > 0 ? (
            featuredMedia.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-[1.75rem] border border-stone-800 bg-stone-900">
                <div className="h-56 bg-gradient-to-br from-[#0091ff]/20 via-blue-500/10 to-stone-950 p-4">
                  <div className="flex h-full flex-col justify-between rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-stone-300">
                      <span>{item.mediaType}</span>
                      <span>{item.categoryName ?? "Uncategorized"}</span>
                    </div>
                    <div>
                      <h3 className="text-lg lg:text-xl font-semibold">{item.title}</h3>
                      <p className="mt-2 text-sm lg:text-md text-stone-300">{item.description ?? "Premium artist content."}</p>
                    </div>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[1.75rem] border border-dashed border-stone-700 bg-stone-900/60 p-8 text-stone-400 md:col-span-2 xl:col-span-4">
              Load the database schema and seed data to populate the shelves.
            </div>
          )}
        </div>
      </section>

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
          </div>
        </div>
      </footer>
    </main>
  );
}
