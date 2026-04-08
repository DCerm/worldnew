import Link from "next/link";

import { loginAction } from "@/app/actions";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-950 px-6 py-12 text-white">
      <div className="w-full max-w-md rounded-[2rem] border border-stone-800 bg-stone-900 p-8 shadow-2xl">
        <p className="text-sm uppercase tracking-[0.35em] text-[#0091ff]">Sign In</p>
        <h1 className="mt-3 text-4xl font-semibold">Welcome back</h1>
        <p className="mt-3 text-md text-stone-400">
          Sign in with the demo credentials below.
        </p>

        {user && (
          <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
            You are already signed in.
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <form action={loginAction} className="mt-6 space-y-4">
          <input
            name="email"
            type="email"
            placeholder="Email"
            className="w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-sm"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            className="w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-sm"
          />
          <button className="w-full rounded-full bg-[#0091ff] px-5 py-3 text-sm font-semibold text-white">
            Sign in
          </button>
        </form>

        <div className="mt-6 rounded-2xl border border-stone-800 bg-stone-950 p-4 text-sm text-stone-400">
          <p className="text-sm">Demo admin: `artist@worldnew.love` / `artist1234`</p>
          <p className="text-sm">Demo client: `member@worldnew.love` / `member1234`</p>
        </div>

        <p className="mt-6 text-sm text-stone-400">
          No account yet?{" "}
          <Link href="/register" className="text-[#0091ff]">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
